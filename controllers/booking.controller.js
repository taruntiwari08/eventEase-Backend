import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import QRcode from "qrcode";
import crypto from "crypto";
import User from "../models/user.model.js";
import Razorpay from "razorpay";
// Generate secure QR code for booking
async function generateSecureQRCode(booking) {
    const secretKey = process.env.QR_SECRET;
    if (!secretKey) {
        throw new Error("QR_SECRET is not defined in environment variables");
    }

    // Create secure payload
    const qrPayload = `${booking._id}:${crypto.randomBytes(8).toString("hex")}`;
    const qrHash = crypto
        .createHmac("sha256", secretKey)
        .update(qrPayload)
        .digest("hex");

    // Store secure QR data
    booking.qrCodeData = { payload: qrPayload, hash: qrHash };
    console.log("QR Payload:", qrPayload);
    console.log("QR Hash:", qrHash);
    // Generate QR code image from payload and hash
    const qrDataString = JSON.stringify({
        payload: qrPayload,
        hash: qrHash,
    });

    const qrCodeImage = await QRcode.toDataURL(qrDataString);
    // console.log("QR Code Image:", qrCodeImage);
    booking.qrCode = qrCodeImage;
   
    return booking;
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Razorpay payemnt order creation
const createOrder = asyncHandler(async(req,res)=>{
  const {eventId} = req.params;
  const {seatsBooked,usePoints} = req.body;

  if(!eventId || !seatsBooked){
    throw new ApiError(400, "Event ID and seats booked are required");
  }
  const event = await Event.findById(eventId);
  if(!event) throw new ApiError(404,"Event Not Found")

  // Check if seats are available
  const totalBookings = await Booking.aggregate([
    { $match: { event: event._id, paymentstatus: "confirmed" } },
    { $group: { _id: null, totalSeats: { $sum: "$seatsBooked" } } }
  ]);

  const seatsTaken = totalBookings[0]?.totalSeats || 0;
  if (seatsTaken + seatsBooked > event.capacity) {
    throw new ApiError(400, "Not enough seats available");
  }

  const totalPrice = event.Price * seatsBooked;

  const user = await User.findById(req.user._id);
    let discount = 0;
    if (usePoints) {
        const maxDiscount = totalPrice;
        discount = Math.min(user.walletPoints, maxDiscount);
    }
    const amountToPay = totalPrice - discount;
    const options = {
      amount: amountToPay*100, // Convert to PESE
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    console.log("Order created:", order);

    res.status(200).json(

        new ApiResponse(200, {
            orderId: order.id,
            currency: order.currency,
            amount: order.amount / 100, // Convert back to original amount
            seatsBooked,
            eventId,
            totalPrice,
            discount,
            remainingPoints: user.walletPoints - discount
        }, "Order created successfully")
    )
})

// Create Booking
const verifyPayment = asyncHandler(async (req, res) => {

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, seatsBooked, discount } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !eventId || !seatsBooked ) {
      throw new ApiError(400, "All fields are required");
  }

    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpay_signature) {
        throw new ApiError(400, "Payment verification failed");
    }


  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

    // Check if seats are available
  const totalBookings = await Booking.aggregate([
    { $match: { event: event._id, paymentstatus: "confirmed" } },
    { $group: { _id: null, totalSeats: { $sum: "$seatsBooked" } } }
  ]);

  const seatsTaken = totalBookings[0]?.totalSeats || 0;
  if (seatsTaken + seatsBooked > event.capacity) {
    throw new ApiError(400, "Not enough seats available");
  }

  const amountPaid = event.Price * seatsBooked - discount;
  console.log("Amount Paid:", event.Price * seatsBooked, "Discount:", discount, "Final Amount:", amountPaid);
  let booking = await Booking.create({
    user: req.user._id,
    event: event._id,
    seatsBooked,
    razorpayOrderId : razorpay_order_id,
    razorpayPaymentId : razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    amountPaid,
    paymentstatus: "confirmed", // "pending" For now, until payment is confirmed(when razropayPaymentId is provided)
  });

  const user = await User.findById(req.user._id);
  if( discount > 0) user.walletPoints -= discount;
  const earnedPoints = Math.floor((amountPaid + discount) / 20);
    user.walletPoints += earnedPoints;
  
    await user.save();

  // Update event attendees list
const existingAttendee = event.attendees.find(
  (att) => att.user.toString() === req.user._id.toString()
);

if (existingAttendee) {
  existingAttendee.ticketsBooked += seatsBooked;
} else {
  event.attendees.push({
    user: req.user._id,
    ticketsBooked: seatsBooked,
  });
}

await event.save();


  booking = await generateSecureQRCode(booking);          
  await booking.save();  
  res.status(201).json(new ApiResponse(201,{ 
    booking,
    earnedPoints,
    remainingPoints: user.walletPoints
  },
    "Booking created successfully"));
});

// Get all bookings for logged-in user
const getMyBookings = asyncHandler(async (req, res) => {

  const bookings = await Booking.find({user : req.user._id })
    .populate("event", "title date location Price")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, bookings, "Bookings fetched successfully"));
});

//Cancel Booking
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingid);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to cancel this booking");
  }

  booking.paymentstatus = "cancelled";
  await booking.save();

  if( booking.razorpayPaymentId ){
    try {
      const refund = await razorpay.payments.refund(booking.razorpayPaymentId, { 
        amount: booking.amountPaid * 100
       });
      console.log("Refund initiated:", refund);
      
    } catch (error) {
      throw new ApiError(500, "Failed to initiate refund");
    }
    console.log("Initiate refund via Razorpay API for payment ID:", booking.razorpayPaymentId);
  }

  res.status(200).json(new ApiResponse(200, booking, "Booking cancelled successfully"));
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("event", "title date location")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, bookings, "All bookings fetched successfully"));
});

const getEventBookings = asyncHandler(async (req, res) => {
  const eventId  = req.params.eventId;

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found");


  const bookings = await Booking.find({ event: eventId })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, bookings, "Bookings fetched successfully"));
});

export {createOrder,verifyPayment, getMyBookings, cancelBooking, getAllBookings, getEventBookings };
