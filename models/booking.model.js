import mongoose, { Schema } from "mongoose";
const bookingSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: [true, "Event is required"],
    },
    bookingDate: {
        type: Date,
        default: Date.now,
    },
    paymentstatus: {
        type: String,
        enum: ["confirmed", "cancelled", "pending"],
        default: "pending",
    },
    cancelDate: {
        type: Date,
    },  
    seatsBooked: {
        type: Number,
        required: [true, "Seats booked are required"],
        min: [1, "At least one seat must be booked"],
    },
    razorpayOrderId: {
    type: String,
    },
    razorpayPaymentId: {
    type: String,
    },
    razorpaySignature: {
    type: String,
    },
    amountPaid: {
    type: Number,
    },

    qrCodeData: {
        payload: { type: String}, // bookingId:randomHex
        hash: { type: String }     // HMAC hash
    },
        
    qrCode: {
        type: String 
    },
    //track if user has checked in at the event
    checkedIn: {
        type: Boolean,
        default: false
    },


}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;