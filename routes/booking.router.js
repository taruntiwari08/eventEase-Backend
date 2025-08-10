import { Router } from "express";
import { createBooking, getMyBookings, cancelBooking,getAllBookings,getEventBookings  } from "../controllers/booking.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const bookingRouter = Router();


// Public routes
bookingRouter.route('/create-booking/:eventId').post(authMiddleware,createBooking);
bookingRouter.route('/my-bookings').get(authMiddleware,getMyBookings);
bookingRouter.route('/cancel-booking/:bookingid').delete(authMiddleware, cancelBooking);

// Admin routes
bookingRouter.route('/admin/all-bookings').get(authMiddleware, authorizeRoles("admin"), getAllBookings);
bookingRouter.route('/admin/event-bookings/:eventId').get(authMiddleware, authorizeRoles("admin"), getEventBookings);

// organizer routes
bookingRouter.route('/organizer/event-bookings/:eventId').get(authMiddleware, authorizeRoles("organizer"), getEventBookings);

export default bookingRouter