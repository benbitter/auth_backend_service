import crypto, { verify } from 'crypto';
import { redisClient } from '../server.js';

export const generateCSRFToken = async(userId , res) => {
    const csrfToken = crypto.randomBytes(32).toString("hex");

    const csrfTokenKey = `csrfToken:${userId}`;

    // Store CSRF token in Redis with a 15-minute expiration
    redisClient.set(csrfTokenKey, csrfToken, { EX: 15 * 60 });

    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    });
}

export const verifyCSRFToken = async (req,res , next) => {
    
    try {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        const userId = req.user?._id;

        if (!userId) {
            return res.status(402).json({
                success: false,
                message: "Unauthorized: User ID missing",
            });
        }

        const csrfTokenFromHeader = req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.headers['x-xsrf-token'];

        if (!csrfTokenFromHeader) {
            return res.status(401).json({
                success: false,
                message: "Please refresh the page. CSRF token missing in headers",
                code: "CSRF_TOKEN_MISSING"
            });
        }

        const csrfTokenKey = `csrfToken:${userId}`;
        const storedCsrfToken = await redisClient.get(csrfTokenKey);
        if (!storedCsrfToken) {
            return res.status(401).json({
                success: false,
                message: "CSRF token expired. Please refresh the page.",
                code: "CSRF_TOKEN_EXPIRED"
            });
        };

        if(storedCsrfToken !== csrfTokenFromHeader) {
            return res.status(403).json({
                success: false,
                message: "Invalid CSRF token, Please refresh the page.",
                code: "CSRF_TOKEN_INVALID"
            });
        }

        return next();

    } catch (error) {
        console.error("CSRF verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Forbidden: CSRF token verification failed",
        });
    }

}



export const revokeCSRFToken = async (userId) => {
    const csrfTokenKey = `csrfToken:${userId}`;
    await redisClient.del(csrfTokenKey);
}

export const refreshCSRFToken = async (userId , res) => {
    
    await revokeCSRFToken(userId);
    return await generateCSRFToken(userId , res);
}