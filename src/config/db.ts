import mongoose from 'mongoose';
import dns from 'node:dns/promises';

dns.setServers(["1.1.1.1","1.0.0.1"]);

export const connectDB = async (): Promise<void> => {
  const uri: string = process.env.MONGODB_URI! as string;
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    connectDB();
  }
};
