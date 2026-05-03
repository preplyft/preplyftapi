import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import {redis} from '../config/redis';
import { sendOtpEmail } from '../config/mailer';
import { generateOtp, storeOtp, verifyOtp } from '../utils/otp';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../types/type';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// POST /auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['student', 'instructor']).default('student'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const user = await User.create({ name, email, password, role });
  const otp = generateOtp();
  await storeOtp(email, otp, 'verify');
  await sendOtpEmail(email, otp, 'Verify your Preplyft account');

  res.status(201).json({ message: 'Registered successfully. Please verify your email with the OTP sent.' });
};

// POST /auth/verify-email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ message: 'Email and OTP are required' });
    return;
  }
  const valid = await verifyOtp(email, otp, 'verify');
  if (!valid) {
    res.status(400).json({ message: 'Invalid or expired OTP' });
    return;
  }
  await User.findOneAndUpdate({ email }, { isEmailVerified: true });
  res.json({ message: 'Email verified successfully' });
};

// POST /auth/resend-otp
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists or not
    res.json({ message: 'OTP resent successfully' });
    return;
  }
  const otp = generateOtp();
  await storeOtp(email, otp, 'verify');
  await sendOtpEmail(email, otp, 'Your Preplyft verification OTP');
  res.json({ message: 'OTP resent successfully' });
};

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  if (!user.isEmailVerified) {
    res.status(401).json({ message: 'Please verify your email first' });
    return;
  }

  const payload = { id: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await redis.set(`refresh:${user._id}`, refreshToken, 'EX', REFRESH_TTL);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

// POST /auth/refresh-token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ message: 'Refresh token required' });
    return;
  }
  try {
    const payload = verifyRefreshToken(token);
    const stored = await redis.get(`refresh:${payload.id}`);
    if (!stored || stored !== token) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }
    const accessToken = signAccessToken({ id: payload.id, role: payload.role });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  // Always return 200 to prevent email enumeration
  const RESPONSE = { message: 'If that email exists, an OTP has been sent' };
  if (!email) {
    res.json(RESPONSE);
    return;
  }
  const user = await User.findOne({ email });
  if (user) {
    const otp = generateOtp();
    await storeOtp(email, otp, 'reset');
    await sendOtpEmail(email, otp, 'Reset your Preplyft password');
  }
  res.json(RESPONSE);
};

// POST /auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ message: 'Email, OTP, and new password are required' });
    return;
  }
  const valid = await verifyOtp(email, otp, 'reset');
  if (!valid) {
    res.status(400).json({ message: 'Invalid or expired OTP' });
    return;
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password reset successfully' });
};

// POST /auth/logout 🔒
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.id) {
    await redis.del(`refresh:${req.user.id}`);
  }
  res.json({ message: 'Logged out successfully' });
};

// GET /auth/me 🔒
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
};
