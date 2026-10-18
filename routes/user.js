import express from 'express';
import { registerUser, verifyUser , loginUser , verifyOtp , myProfile , refreshToken , logoutUser , refreshCSRF, resendOtp} from '../controllers/user.js';
import { refreshCSRFToken , verifyCSRFToken} from '../config/csrfMiddleware.js';
import { isAuth } from '../middleware/isAuth.js';
import { addUserRole } from '../controllers/user.js';

const router = express.Router();

router.post('/register', registerUser);
router.get('/verify/:token', verifyUser);
router.post('/login', loginUser);
router.post("/verifyOtp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/me", isAuth, myProfile);
router.post("/refreshToken", refreshToken);
router.post("/logout", isAuth, verifyCSRFToken, logoutUser);
router.post("/refreshCSRF", isAuth, refreshCSRF);
router.put("/add-role", isAuth, addUserRole);

export default router