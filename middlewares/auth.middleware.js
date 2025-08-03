import User from "../models/user.model";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
export const authMiddleware = asyncHandler(async(req,res,next) => {
    try {
        const  token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        console.log("Token:", token);
        if (!token) {
            throw new ApiError(401, "Access Token is required");
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?._id).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(401, "User not found");
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(403, error?.message || "Invalid Access Token")
        
    }
})