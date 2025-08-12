// socket.js
import { Server } from "socket.io";
import ChatMessage from "./models/chatMessage.model.js";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import Booking from "./models/booking.model.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Change in production
      methods: ["GET", "POST"],
    },
  });

  // Authenticate socket connection
  io.use(async (socket, next) => {
    try {
      
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id name role");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name}`);

    socket.on("joinRoom", async ({ eventId }) => {
      try {
        // Verify booking
        const booking = await Booking.findOne({
          event: eventId,
          user: socket.user._id,
          paymentstatus: "confirmed",
        });

        if (!booking) {
          return socket.emit("error", "You are not allowed to join this chat");
        }

        // Join chat room
        socket.join(eventId);
        socket.emit("joined", `You have successfully joined chat for event ${eventId}`);
        console.log(`User ${socket.user._id} joined room: ${eventId}`);

        // Send last 20 messages
        const history = await ChatMessage.find({ roomId: eventId })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate("sender", "name");

        socket.emit("chatHistory", history.reverse());
      } catch (err) {
        console.error(err);
        socket.emit("error", "Failed to join room");
      }
    });

    socket.on("sendMessage", async ({ roomId, message }) => {
      if (!message?.trim()) return;

      const newMessage = await ChatMessage.create({
        roomId,
        sender: socket.user._id,
        message,
      });

      const populatedMsg = await newMessage.populate("sender", "name");
      io.to(roomId).emit("newMessage", populatedMsg);
    });

    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.user.name} left room: ${roomId}`);
    });

    socket.on("typing", (roomId) => {
      socket.to(roomId).emit("typing", socket.user.name);
    });

    socket.on("stopTyping", (roomId) => {
      socket.to(roomId).emit("stopTyping");
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
