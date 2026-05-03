import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/type';

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '15m',
  });

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d',
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
