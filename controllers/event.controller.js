import {deleteFromCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import  Event  from "../models/event.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Booking from '../models/booking.model.js';

const createEvent = asyncHandler(async(req,res)=>{
    const {title,description,date,location,Price,category,capacity} = req.body;
    if(![title,description,date,location,Price,category,capacity].every(Boolean)){
        throw new ApiError(400,"All Fields are Required");
    }
    const eventImagePath = req.file?.path; //  file
    if(!eventImagePath){
        throw new ApiError(400,"Event Image is Required")
    }

    const image = await uploadOnCloudinary(eventImagePath);
    if(!image){
        throw new ApiError(500,"Failed to Upload avtar");
    }
const Eventdate = new Date(date); // ✅ parse date-time from request
let now = new Date();

const newEvent = await Event.create({
    title,
    description,
    date: Eventdate,
    location,
    Price,
    category,
    capacity,
    image: image.url,
    organizer: req.user._id,
    status: Eventdate > now
        ? "upcoming"
        : Eventdate.toDateString() === now.toDateString()
        ? "ongoing"
        : Eventdate < now && Eventdate.getTime() + (60 * 60 * 1000) < now.getTime()
        ? "completed"
        : "past"
});
    res.status(201).json(
        new ApiResponse(201, newEvent, "Event created successfully")
    )
})

// GET ALL EVENTS (Public)
const getAllEvents = asyncHandler(async(req,res)=>{
    const events = await Event.find().populate("organizer","name email");
    res.status(200).json(
        new ApiResponse(200,events,"All Events Fetched")
    )
})

// GET SINGLE EVENT
const getEventbyId = asyncHandler(async(req,res)=>{
    const event = await Event.findById(req.params.id).populate("organizer","name email");
    if(!event) throw new ApiError(404,"Event Not Found");
    res.status(200).json(
        new ApiResponse(200,event,"Event Fetched Succesfully")
    )
})

// UPDATE EVENT(ONLY BY ORGANIZER)

const updateEvent = asyncHandler(async(req,res)=>{
  const event = await Event.findById(req.params.id);
  if(!event) throw new ApiError(404,"Event Not Found");
    if(event.organizer.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not authorized to update this event");
    }
    // Handle image upload if provided
    if(req.file?.path) {
        console.log("Image file found in request");
        const eventImagePath = req.file.path; // files or file
        if(!eventImagePath){
            throw new ApiError(400,"Event Image is Required")
        }
        const oldImageUrl = event.image; // Store old image URL for deletion if needed
        if(oldImageUrl){
            await deleteFromCloudinary(oldImageUrl); // Delete old image from Cloudinary
        }
        const image = await uploadOnCloudinary(eventImagePath);
        if(!image){
            throw new ApiError(500,"Failed to Upload Image");
        }
        event.image = image.url; // Update the image URL
    }
    Object.assign(event, req.body); // Update event with new data
    await event.save();
    res.status(200).json(
        new ApiResponse(200,event,"Event Updated Successfully")
    )
})

// DELETE EVENT (ONLY BY ORGANIZER)
const deleteEvent = asyncHandler(async(req,res)=>{
    const event = await Event.findById(req.params.id);
    if(!event) throw new ApiError(404,"Event Not Found");
    if(event.organizer.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not authorized to delete this event");
    }
    const oldImageUrl = event.image; // Store old image URL for deletion
    if(oldImageUrl){
        await deleteFromCloudinary(oldImageUrl); // Delete image from Cloudinary
    }
    await event.deleteOne();
    res.status(200).json(
        new ApiResponse(200,null,"Event Deleted Successfully")
    )
})

const getEventAnalytics = asyncHandler(async (req, res) => {
  const  eventId  = req.params.eventid;

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  const analytics = await Booking.aggregate([
    { $match: { event: event._id, paymentstatus: "confirmed" } },
    {
      $group: {
        _id: "$event",
        totalBookings: { $sum: 1 },
        totalSeats: { $sum: "$seatsBooked" },
        totalRevenue: { $sum: "$amountPaid" }
      }
    }
  ]);

  res.status(200).json(new ApiResponse(200, analytics[0] || {}, "Event analytics fetched successfully"));
});

export {
    createEvent,
    getAllEvents,
    getEventbyId,
    updateEvent,
    deleteEvent,
    getEventAnalytics
}
