import jwt from "jsonwebtoken";
import { redisClient } from "../server.js";
import { generateCSRFToken, revokeCSRFToken } from "./csrfMiddleware.js";

export const generateToken = async (userData, res) => {
    console.log("Generating tokens for user:", userData);
    
    // Signed with the exact requested nested user structure
    const accessToken = jwt.sign(
        { user: { _id: userData.user._id, role: userData.user.role, name: userData.user.name, email: userData.user.email } }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1m' }
    );

    const refreshToken = jwt.sign(
        { user: { _id: userData.user._id, role: userData.user.role, name: userData.user.name, email: userData.user.email } }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '7d' }
    );

    const refreshTokenKey = `refreshToken:${userData.user._id}`;

    await redisClient.set(refreshTokenKey, refreshToken, { EX: 7 * 24 * 60 * 60 });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: false, // Set to true in production
        sameSite: 'lax',
        maxAge: 60 * 1000 // 1 minute (10 * 1000 was 10 seconds)
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false, // Set to true in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const csrfToken = await generateCSRFToken(userData.user._id, res);

    return { accessToken, refreshToken, csrfToken };
}

export const verifyRefreshToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        console.log("Decoded refresh token data:", decoded);
        
        // Match the nested user payload
        const refreshTokenKey = `refreshToken:${decoded.user._id}`;
        const storedToken = await redisClient.get(refreshTokenKey);
        if (storedToken === refreshToken) {
            return decoded;
        }
        return null;
    } catch (error) {
        return null;
    }
}

export const generateAccessToken = async (userData, res) => {
    // Structural match for renewing the access token
    const accessToken = jwt.sign(
        { user: { _id: userData.user._id, role: userData.user.role, name: userData.user.name, email: userData.user.email } }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1m' }
    );

    console.log("Generated new access token for user ID:", accessToken);

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 1000 // 1 minute
    });
}

export const revokeRefreshToken = async (userData) => {
    const refreshTokenKey = `refreshToken:${userData.user._id}`;
    await redisClient.del(refreshTokenKey);
    await revokeCSRFToken(userData.user._id);
}