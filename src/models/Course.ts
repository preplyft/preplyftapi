import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  channel: Types.ObjectId;
  instructor: Types.ObjectId;
  videos: Types.ObjectId[];
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', courseSchema);
