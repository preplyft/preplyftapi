import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Course } from '../models/Course';
import { Channel } from '../models/Channel';
import { Video } from '../models/Video';
import { Enrollment } from '../models/Enrollment';
import { AuthRequest } from '../types/type';
import { getPagination, buildPaginationResult } from '../utils/pagination';


// GET /courses
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query);
  const [courses, total] = await Promise.all([
    Course.find()
      .select('title description thumbnail price channel createdAt updatedAt')
      .populate('channel', 'name icon')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Course.countDocuments(),
  ]);
  res.json({ courses, pagination: buildPaginationResult(total, page, limit) });
};

// GET /courses/user/enrolled 🔒
export const getEnrolledCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollments = await Enrollment.find({ user: req.user!.id }).populate({
    path: 'course',
    select: 'title description thumbnail price channel',
    populate: { path: 'channel', select: 'name icon' },
  });
  res.json(enrollments);
};

// GET /courses/:id
export const getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id)
    .populate('channel', 'name icon')
    .populate('videos', 'title thumbnail duration views');

  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }

  const plain = course.toObject() as any;

  if (req.user) {
    const enrollment = await Enrollment.findOne({ user: req.user.id, course: course._id });
    plain.isEnrolled = !!enrollment;
  } else {
    plain.isEnrolled = false;
  }

  res.json(plain);
};

// POST /courses 🔒 instructor
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, thumbnail, price, channel: channelId } = req.body;
  if (!title || price === undefined || !channelId) {
    res.status(400).json({ message: 'title, price, and channel are required' });
    return;
  }
  const channel = await Channel.findById(channelId);
  if (!channel) {
    res.status(404).json({ message: 'Channel not found' });
    return;
  }
  if (channel.owner.toString() !== req.user!.id) {
    res.status(403).json({ message: 'You do not own this channel' });
    return;
  }
  const course = await Course.create({
    title,
    description,
    thumbnail,
    price,
    channel: channelId,
    instructor: req.user!.id,
  });
  res.status(201).json(course);
};

// PATCH /courses/:id 🔒 instructor
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.instructor.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your course' });
    return;
  }
  const { title, description, thumbnail, price } = req.body;
  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (thumbnail !== undefined) course.thumbnail = thumbnail;
  if (price !== undefined) course.price = price;
  await course.save();
  res.json(course);
};

// DELETE /courses/:id 🔒 instructor
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.instructor.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your course' });
    return;
  }
  await course.deleteOne();
  res.json({ message: 'Course deleted' });
};

// POST /courses/:id/videos 🔒 instructor
export const addVideoToCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const { videoId } = req.body;
  if (!videoId) {
    res.status(400).json({ message: 'videoId is required' });
    return;
  }
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.instructor.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your course' });
    return;
  }
  const video = await Video.findById(videoId);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  if (course.videos.some((v) => v.toString() === videoId)) {
    res.status(409).json({ message: 'Video already in course' });
    return;
  }
  course.videos.push(videoId as any);
  await course.save();
  const updated = await Course.findById(course._id).populate('videos', 'title thumbnail duration views');
  res.json(updated);
};

// DELETE /courses/:id/videos/:videoId 🔒 instructor
export const removeVideoFromCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.instructor.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your course' });
    return;
  }
  course.videos = course.videos.filter((v) => v.toString() !== req.params.videoId);
  await course.save();
  const updated = await Course.findById(course._id).populate('videos', 'title thumbnail duration views');
  res.json(updated);
};

// POST /courses/:id/enroll 🔒 (free courses)
export const enrollFree = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.price > 0) {
    res.status(400).json({ message: 'This is a paid course. Use /enroll/pay instead.' });
    return;
  }
  const existing = await Enrollment.findOne({ user: req.user!.id, course: course._id });
  if (existing) {
    res.status(409).json({ message: 'Already enrolled' });
    return;
  }
  const enrollment = await Enrollment.create({
    user: req.user!.id,
    course: course._id,
    status: 'free',
    amountPaid: 0,
    paymentId: null,
    orderId: null,
  });
  res.status(201).json(enrollment);
};

// POST /courses/:id/enroll/pay 🔒 (paid courses)
export const initiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }
  if (course.price === 0) {
    res.status(400).json({ message: 'This is a free course. Use /enroll instead.' });
    return;
  }
  const existing = await Enrollment.findOne({ user: req.user!.id, course: course._id });
  if (existing) {
    res.status(409).json({ message: 'Already enrolled' });
    return;
  }
  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID as string,
  });
};

// POST /courses/:id/enroll/verify 🔒
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ message: 'Missing payment fields' });
    return;
  }

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    res.status(400).json({ message: 'Payment verification failed' });
    return;
  }

  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404).json({ message: 'Course not found' });
    return;
  }

  const enrollment = await Enrollment.create({
    user: req.user!.id,
    course: course._id,
    status: 'paid',
    amountPaid: course.price,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });
  res.status(201).json(enrollment);
};
