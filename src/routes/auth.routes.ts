import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendOtp,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
