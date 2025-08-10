import mongoose, { Schema } from "mongoose";

const eventSchema = new Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true,
    },
    date: {
        type: Date,
        required: [true, "Date is required"],
    },
    location: {
        type: String,
        required: [true, "Location is required"],
        trim: true,
    },
    organizer: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Organizer Name is required"],
    },
    attendees: [{
        type: Schema.Types.ObjectId,
        ref: "User",
    }],
    status: {
        type: String,
        enum: ["upcoming", "ongoing", "completed", "cancelled"],
        default: "upcoming",
    },
    image: {
        type: String,
        required: [true, "Image is required"],
        trim: true,
    },
    Price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"],
    },
    category: {
        type: String,
        enum : ["tech", "movie", "music", "finance", "education", "other"],
        required: [true, "Category is required"],
        trim: true,
        default: "other",
    },
    capacity: {
        type: Number,
        required: [true, "Capacity is required"],
        min: [1, "Capacity must be at least 1"],
    }

}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);
export default Event;