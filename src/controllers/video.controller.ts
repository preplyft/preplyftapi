import { Request, Response } from 'express';
import { Video } from '../models/Video';
import { Channel } from '../models/Channel';
import { AuthRequest } from '../types/type';
import { getPagination, buildPaginationResult } from '../utils/pagination';

// GET /videos
export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const { q, channelId } = req.query as { q?: string; channelId?: string };
  const { page, limit, skip } = getPagination(req.query);

  const filter: Record<string, any> = { visibility: 'public' };
  if (q) filter.$text = { $search: q };
  if (channelId) filter.channel = channelId;

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .select('title description videoUrl thumbnail duration visibility views likeCount commentCount channel createdAt updatedAt')
      .populate('channel', 'name icon')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Video.countDocuments(filter),
  ]);
  res.json({ videos, pagination: buildPaginationResult(total, page, limit) });
};

// GET /videos/bookmarks 🔒
export const getBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  const videos = await Video.find({ bookmarks: req.user!.id, visibility: 'public' })
    .populate('channel', 'name icon');
  res.json(videos);
};

// GET /videos/:id
export const getVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const video = await Video.findById(req.params.id)
    .populate('channel', 'name icon')
    .populate('comments.user', 'name');

  if (!video || video.visibility === 'private') {
    res.status(404).json({ message: 'Video not found' });
    return;
  }

  // Increment views
  video.views += 1;
  await video.save();

  const plain = video.toObject() as any;

  // Reshape comments for response
  plain.comments = plain.comments.map((c: any) => ({
    _id: c._id,
    user: c.user._id,
    name: c.user.name,
    text: c.text,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  if (req.user) {
    const uid = req.user.id;
    plain.isLiked = video.likes.some((l) => l.toString() === uid);
    plain.isBookmarked = video.bookmarks.some((b) => b.toString() === uid);
  }

  delete plain.likes;
  delete plain.bookmarks;
  res.json(plain);
};

// GET /videos/:id/comments
export const getComments = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query);
  const video = await Video.findById(req.params.id).populate('comments.user', 'name');
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  const allComments = [...video.comments].reverse(); // newest first
  const total = allComments.length;
  const paged = allComments.slice(skip, skip + limit);
  const comments = paged.map((c: any) => ({
    _id: c._id,
    user: c.user._id,
    name: c.user.name,
    text: c.text,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
  res.json({ comments, pagination: buildPaginationResult(total, page, limit) });
};

// POST /videos 🔒 instructor
export const createVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, videoUrl, thumbnail, duration, visibility, channelId } = req.body;
  if (!title || !videoUrl || !channelId) {
    res.status(400).json({ message: 'title, videoUrl and channelId are required' });
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
  const video = await Video.create({
    title,
    description,
    videoUrl,
    thumbnail,
    duration,
    visibility,
    channel: channelId,
    uploader: req.user!.id,
  });
  res.status(201).json(video);
};

// PATCH /videos/:id 🔒 instructor
export const updateVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  if (video.uploader.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your video' });
    return;
  }
  const { title, description, thumbnail, duration, visibility } = req.body;
  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (thumbnail !== undefined) video.thumbnail = thumbnail;
  if (duration !== undefined) video.duration = duration;
  if (visibility !== undefined) video.visibility = visibility;
  await video.save();
  res.json(video);
};

// DELETE /videos/:id 🔒 instructor
export const deleteVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  if (video.uploader.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your video' });
    return;
  }
  await video.deleteOne();
  res.json({ message: 'Video deleted' });
};

// POST /videos/:id/like 🔒
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  const uid = req.user!.id;
  const idx = video.likes.findIndex((l) => l.toString() === uid);
  let liked: boolean;
  if (idx === -1) {
    video.likes.push(uid as any);
    liked = true;
  } else {
    video.likes.splice(idx, 1);
    liked = false;
  }
  video.likeCount = video.likes.length;
  await video.save();
  res.json({ liked, likeCount: video.likeCount });
};

// POST /videos/:id/bookmark 🔒
export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  const uid = req.user!.id;
  const idx = video.bookmarks.findIndex((b) => b.toString() === uid);
  let bookmarked: boolean;
  if (idx === -1) {
    video.bookmarks.push(uid as any);
    bookmarked = true;
  } else {
    video.bookmarks.splice(idx, 1);
    bookmarked = false;
  }
  await video.save();
  res.json({ bookmarked });
};

// POST /videos/:id/comments 🔒
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ message: 'Comment text is required' });
    return;
  }
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  video.comments.push({ user: req.user!.id as any, text } as any);
  video.commentCount = video.comments.length;
  await video.save();
  const newComment = video.comments[video.comments.length - 1];
  res.status(201).json({
    _id: newComment._id,
    user: req.user!.id,
    text: newComment.text,
    createdAt: newComment.createdAt,
    updatedAt: newComment.updatedAt,
  });
};
