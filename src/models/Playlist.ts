import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  isPublic: boolean;
  user: Types.ObjectId;
  videos: Types.ObjectId[];
}

const playlistSchema = new Schema<IPlaylist>(
  {
    name: { type: String, required: true, trim: true },
    isPublic: { type: Boolean, default: false },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);
