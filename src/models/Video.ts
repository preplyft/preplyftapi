import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVideo extends Document {
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  duration: number;
  visibility: 'public' | 'private';
  channel: Types.ObjectId;
  uploader: Types.ObjectId;
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  comments: IComment[];
  views: number;
  likeCount: number;
  commentCount: number;
}

const commentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

videoSchema.index({ title: 'text', description: 'text' });
videoSchema.index({ channel: 1 });
videoSchema.index({ visibility: 1 });

export const Video = mongoose.model<IVideo>('Video', videoSchema);
