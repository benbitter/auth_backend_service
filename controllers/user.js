import TryCatch from "../middleware/TryCatch.js";
import sanitize from "mongo-sanitize";
import { registerSchema, loginSchema } from "../config/zod.js";
import { redisClient } from "../server.js";
import { User } from "../model/User.js";
import bcrypt from "bcrypt"
import crypto from "crypto"
import { getVerifyEmailHtml, getOtpHtml } from "../html.js";
import { sendMail } from "../config/sendMail.js";
import { generateToken, verifyRefreshToken, generateAccessToken, revokeRefreshToken } from "../config/generateToken.js";
import { generateCSRFToken, refreshCSRFToken } from "../config/csrfMiddleware.js";

export const registerUser = TryCatch(async (req, res, next) => {

    console.log("Register request body:", req.body);

    const sanitizeData = sanitize(req.body);
    const validationResult = registerSchema.safeParse(sanitizeData);

    if (!validationResult.success) {
        const messages = validationResult.error?.issues?.map(err => err.message) || ["Invalid input data"];
        return res.status(400).json({
            success: false,
            message: messages.join(", "),
        });
    }

    const { name, email, password } = validationResult.data;

    const rateLimitKey = `register-rate-limit${req.ip}:${email}`

    if (await redisClient.get(rateLimitKey)) {
        return res.status(429).json({
            success: false,
            message: "Too many request, try again later",
        })
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: "User with this email already exists",
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const verifyKey = `verify:${verifyToken}`;

    const dataToStore = JSON.stringify({
        name,
        email,
        password: hashPassword
    });
    await redisClient.set(verifyKey, dataToStore, { EX: 15 * 60 });

    const subject = "Verify your email";

    const html = getVerifyEmailHtml({ email, token: verifyToken });

    await sendMail({ to: email, subject, html });

    await redisClient.set(rateLimitKey, "true", { EX: 1 });


    return res.status(200).json({
        success: true,
        data: { name, email, password },
        message:
            "If your email is valid, you will receive a verification email shortly.",
    });

});


export const verifyUser = TryCatch(async (req, res, next) => {

    const { token } = req.params;

    console.log("Verification token:", token);

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Verification token required",
        })
    }

    const verifyKey = `verify:${token}`;

    const userData = await redisClient.get(verifyKey);
    if (!userData) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired verification token",
        })
    }

    console.log("User data from Redis:", userData);
    await redisClient.del(verifyKey);

    const { name, email, password } = userData;

    const newUser = new User({ name, email, password });
    await newUser.save();

    return res.status(201).json({
        success: true,
        message: "User verified and registered successfully",
        user: newUser,
    });

})

export const loginUser = TryCatch(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
        });
    }

    const rateLimitKey = `register-rate-limit${req.ip}:${email}`

    if (await redisClient.get(rateLimitKey)) {
        return res.status(429).json({
            success: false,
            message: "Too many request, try again later",
        })
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password",
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({
            success: false,
            message: "Invalid password",
        })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp), { EX: 300 });
    const subject = "Your Login OTP";

    const html = getOtpHtml({ email, otp });

    await sendMail({ to: email, subject, html });

    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
    });
});

export const verifyOtp = TryCatch(async (req, res, next) => {

    const { email, otp } = req.body;
    const otpKey = `otp:${email}`;
    const storedOtp = JSON.parse(await redisClient.get(otpKey));
    if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired OTP",
        })
    }
    await redisClient.del(otpKey);

    let user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User not found",
        })
    }

    const tokenData = await generateToken({user :{ _id: user._id, role: user.role , name: user.name , email: user.email}}, res);
    console.log("Generated token data:", tokenData);
    return res.status(200).json({
        success: true,
        message: "OTP verified successfully, login successful",
        token: tokenData?.accessToken || "",
        user: {
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});

export const resendOtp = TryCatch(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required",
        });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User not found",
        });
    }

    const rateLimitKey = `resend-otp-rate-limit:${req.ip}:${email}`;

    if (await redisClient.get(rateLimitKey)) {
        return res.status(429).json({
            success: false,
            message: "Too many requests, try again later",
        });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp), { EX: 300 });

    const subject = "Your Login OTP";
    const html = getOtpHtml({ email, otp });

    await sendMail({ to: email, subject, html });
    await redisClient.set(rateLimitKey, "true", { EX: 60 });

    return res.status(200).json({
        success: true,
        message: "New OTP sent to your email",
    });
});

export const myProfile = TryCatch(async (req, res, next) => {

    const user = req.user;

    return res.status(200).json({
        success: true,
        user,
    });
});

const allowedRoles = ["customer", "rider"];

export const addUserRole = TryCatch(async (req, res) => {
    try {

        if (!req.user?._id) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const { role } = req.body;

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { role },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        await redisClient.del(`user:${user._id}`);

        return res.status(200).json({
            success: true,
            message: "Role added successfully",
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
});


export const refreshToken = TryCatch(async (req, res, next) => {
    console.log("Refresh token request received");
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: No refresh token provided",
        })
    }
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.user?._id) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid refresh token",
        })
    }
    
    // Pass the matching inner object structure to build the payload correctly
    await generateAccessToken(decoded, res);

    return res.status(200).json({
        success: true,
        message: "Access token refreshed successfully",
    })
});

export const logoutUser = TryCatch(async (req, res, next) => {
    const user = req.user;
    console.log("Logging out user:", user);
    await revokeRefreshToken({ user });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');

    await redisClient.del(`user:${user._id}`);

    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    })
});

export const refreshCSRF = TryCatch(async (req, res, next) => {
    const user = req.user;
    const csrfToken = await generateCSRFToken(user._id, res);
    return res.status(200).json({
        success: true,
        message: "CSRF token refreshed successfully",
        csrfToken: csrfToken
    })
});