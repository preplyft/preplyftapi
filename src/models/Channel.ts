import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  description: string;
  icon: string;
  poster: string;
  owner: Types.ObjectId;
  subscribers: Types.ObjectId[];
  subscriberCount: number;
}

const channelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    poster: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    subscriberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
