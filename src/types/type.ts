import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'student' | 'instructor';

export interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type S3Folder = 'videos' | 'thumbnails' | 'avatars' | 'course-files' | 'channel-assets';

export const VALID_S3_FOLDERS: S3Folder[] = [
  'videos',
  'thumbnails',
  'avatars',
  'course-files',
  'channel-assets',
];

export interface PopulatedChannel {
  _id: Types.ObjectId;
  name: string;
  icon: string;
}
