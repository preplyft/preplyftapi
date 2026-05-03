import {redis} from '../config/redis';

const OTP_PREFIX = 'otp:';
const OTP_TTL = Number(process.env.OTP_EXPIRES_IN || 10) * 60; // seconds

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const storeOtp = async (email: string, otp: string, purpose: string): Promise<void> => {
  const key = `${OTP_PREFIX}${purpose}:${email}`;
  await redis.set(key, otp, 'EX', OTP_TTL);
};

export const verifyOtp = async (email: string, otp: string, purpose: string): Promise<boolean> => {
  const key = `${OTP_PREFIX}${purpose}:${email}`;
  const stored = await redis.get(key);
  if (!stored || stored !== otp) return false;
  await redis.del(key);
  return true;
};
