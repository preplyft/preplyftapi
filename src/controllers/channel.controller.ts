import { Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { Video } from '../models/Video';
import { Course } from '../models/Course';
import { AuthRequest } from '../types/type';
import { getPagination, buildPaginationResult } from '../utils/pagination';

// GET /channels
export const getChannels = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query);
  const [channels, total] = await Promise.all([
    Channel.find().select('-subscribers').skip(skip).limit(limit).sort({ createdAt: -1 }),
    Channel.countDocuments(),
  ]);
  res.json({ channels, pagination: buildPaginationResult(total, page, limit) });
};

// GET /channels/mine 🔒 instructor
export const getMyChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  const channels = await Channel.find({ owner: req.user!.id }).sort({ createdAt: -1 });
  res.json(channels);
};

// GET /channels/:id
export const getChannel = async (req: Request, res: Response): Promise<void> => {
  const channel = await Channel.findById(req.params.id).select('-subscribers');
  if (!channel) {
    res.status(404).json({ message: 'Channel not found' });
    return;
  }
  const [videos, courses] = await Promise.all([
    Video.find({ channel: channel._id, visibility: 'public' })
      .select('title description videoUrl thumbnail duration visibility views likeCount commentCount channel createdAt updatedAt')
      .populate('channel', 'name icon'),
    Course.find({ channel: channel._id })
      .select('title description thumbnail price channel createdAt updatedAt')
      .populate('channel', 'name icon'),
  ]);
  res.json({ ...channel.toObject(), videos, courses });
};

// POST /channels 🔒
export const createChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, icon, poster } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Channel name is required' });
    return;
  }
  const channel = await Channel.create({
    name,
    description,
    icon,
    poster,
    owner: req.user!.id,
  });
  res.status(201).json(channel);
};

// PATCH /channels/:id 🔒 instructor
export const updateChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) {
    res.status(404).json({ message: 'Channel not found' });
    return;
  }
  if (channel.owner.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your channel' });
    return;
  }
  const { name, description, icon, poster } = req.body;
  if (name !== undefined) channel.name = name;
  if (description !== undefined) channel.description = description;
  if (icon !== undefined) channel.icon = icon;
  if (poster !== undefined) channel.poster = poster;
  await channel.save();
  res.json(channel);
};

// POST /channels/:id/subscribe 🔒
export const toggleSubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) {
    res.status(404).json({ message: 'Channel not found' });
    return;
  }
  const userId = req.user!.id;
  const idx = channel.subscribers.findIndex((s) => s.toString() === userId);
  let subscribed: boolean;
  if (idx === -1) {
    channel.subscribers.push(userId as any);
    channel.subscriberCount = channel.subscribers.length;
    subscribed = true;
  } else {
    channel.subscribers.splice(idx, 1);
    channel.subscriberCount = channel.subscribers.length;
    subscribed = false;
  }
  await channel.save();
  res.json({ subscribed, subscriberCount: channel.subscriberCount });
};
