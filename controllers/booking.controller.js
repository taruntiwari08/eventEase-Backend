import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create Booking
const createBooking = asyncHandler(async (req, res) => {
    const eventId = req.params.eventId || req.body.eventId;
  const { seatsBooked, razorpayOrderId, razorpayPaymentId, amountPaid } = req.body;

  if (!eventId || !seatsBooked || !razorpayOrderId) {
    throw new ApiError(400, "Event ID, seats booked, and Razorpay Order ID are required");
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

  const booking = await Booking.create({
    user: req.user._id,
    event: event._id,
    seatsBooked,
    razorpayOrderId,
    razorpayPaymentId,
    amountPaid,
    paymentstatus: "confirmed", // "pending" For now, until payment is confirmed(when razropayPaymentId is provided)
  });

  res.status(201).json(new ApiResponse(201, booking, "Booking created successfully"));
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

export { createBooking, getMyBookings, cancelBooking, getAllBookings, getEventBookings };
