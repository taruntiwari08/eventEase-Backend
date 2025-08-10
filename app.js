import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import eventRouter from "./routes/event.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import bookingRouter from "./routes/booking.router.js";
const app = express();
app.use(cors({
    origin: `${process.env.CLIENT_URL}` || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json({limit : "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


app.use('/api/v1/users', userRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/bookings', bookingRouter);


app.use(errorMiddleware)
export default app;