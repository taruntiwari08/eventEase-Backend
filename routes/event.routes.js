import { Router } from "express";
import { getAllEvents, getEventbyId,createEvent,updateEvent,deleteEvent,getEventAnalytics } from "../controllers/event.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const eventRouter = Router();

// Public routes
eventRouter.route('/all-events').get(getAllEvents);
eventRouter.route('/event/:id').get(getEventbyId);

// oranizer routes
eventRouter.route('/create-event').post(
    authMiddleware,
    authorizeRoles("organizer"), 
    upload.single("image"), // Assuming the image field in the form is named 'image'
    createEvent
);
eventRouter.route('/update-event/:id').patch(
    authMiddleware,
    authorizeRoles("organizer"),
    upload.single("image"), // Assuming the image field in the form is named 'image'
    updateEvent
);
eventRouter.route('/delete-event/:id').delete(
    authMiddleware,
    authorizeRoles("organizer"),
    // No need for upload middleware here as we are not uploading a file
    deleteEvent
);

// Admin routes
eventRouter.route('/admin/all-events').get(
    authMiddleware,
    authorizeRoles("admin"),  
    getAllEvents
);

eventRouter.route('/admin/delete-event/:id').get(
    authMiddleware,
    authorizeRoles("admin"),
    deleteEvent
);

eventRouter.route('/analytics/:eventid').get(
    authMiddleware,
    authorizeRoles("organizer"),
    getEventAnalytics
);


export default eventRouter
