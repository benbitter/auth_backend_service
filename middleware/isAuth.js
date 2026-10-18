import jwt from "jsonwebtoken";
import { redisClient } from "../server.js";
import { User } from "../model/User.js";

export const isAuth = async (req, res, next) => {
    const { accessToken } = req.cookies;
    console.log("accessToken:", accessToken);
    if (!accessToken) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: No access token provided",
        })
    }

    try {
        const decoded = await jwt.verify(accessToken, process.env.JWT_SECRET);
        console.log("Decoded token data:", decoded);
        if (!decoded || !decoded.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid access token",
            });
        }
        
        // Updated payload path to match: decoded.user._id
        const cacheUser = await redisClient.get(`user:${decoded.user._id}`);
        
        if (cacheUser) {
            req.user = JSON.parse(cacheUser);
            return next();
        }
        
        let id = decoded.user._id;
        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not found",
            });
        }
        console.log("User found:", user);
        req.user = user;
        
        // Updated cache key string interpolation to use decoded.user._id
        await redisClient.set(`user:${decoded.user._id}`, JSON.stringify(user), { EX: 60 * 60 }); // Cache for 1 hour
        return next();
    } catch (error) {
        console.error("Error in isAuth middleware:", error);
        return res.status(401).json({
            success: false,
            message: error.message || error,
        });
    }
}