import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEnrollment extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: 'free' | 'paid';
  amountPaid: number;
  paymentId: string | null;
  orderId: string | null;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, enum: ['free', 'paid'], required: true },
    amountPaid: { type: Number, default: 0 },
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
