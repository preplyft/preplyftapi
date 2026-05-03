import { Request, Response } from 'express';
import { Playlist } from '../models/Playlist';
import { AuthRequest } from '../types/type';

// GET /playlists 🔒
export const getPlaylists = async (req: AuthRequest, res: Response): Promise<void> => {
  const playlists = await Playlist.find({ user: req.user!.id })
    .populate('videos', 'title thumbnail duration')
    .sort({ createdAt: -1 });
  res.json(playlists);
};

// GET /playlists/:id
export const getPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const playlist = await Playlist.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('videos', 'title thumbnail duration channel');

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return;
  }

  const isOwner = req.user && playlist.user._id.toString() === req.user.id;
  if (!playlist.isPublic && !isOwner) {
    res.status(403).json({ message: 'This playlist is private' });
    return;
  }

  res.json(playlist);
};

// POST /playlists 🔒
export const createPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, isPublic } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Playlist name is required' });
    return;
  }
  const playlist = await Playlist.create({
    name,
    isPublic: isPublic ?? false,
    user: req.user!.id,
  });
  res.status(201).json(playlist);
};

// PATCH /playlists/:id 🔒
export const updatePlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return;
  }
  if (playlist.user.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your playlist' });
    return;
  }
  const { name, isPublic } = req.body;
  if (name !== undefined) playlist.name = name;
  if (isPublic !== undefined) playlist.isPublic = isPublic;
  await playlist.save();
  res.json(playlist);
};

// DELETE /playlists/:id 🔒
export const deletePlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return;
  }
  if (playlist.user.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your playlist' });
    return;
  }
  await playlist.deleteOne();
  res.json({ message: 'Playlist deleted' });
};

// POST /playlists/:id/videos 🔒
export const addVideoToPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const { videoId } = req.body;
  if (!videoId) {
    res.status(400).json({ message: 'videoId is required' });
    return;
  }
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return;
  }
  if (playlist.user.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your playlist' });
    return;
  }
  if (playlist.videos.some((v) => v.toString() === videoId)) {
    res.status(409).json({ message: 'Video already in playlist' });
    return;
  }
  playlist.videos.push(videoId as any);
  await playlist.save();
  const updated = await Playlist.findById(playlist._id).populate('videos', 'title thumbnail duration');
  res.json(updated);
};

// DELETE /playlists/:id/videos/:videoId 🔒
export const removeVideoFromPlaylist = async (req: AuthRequest, res: Response): Promise<void> => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found' });
    return;
  }
  if (playlist.user.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Not your playlist' });
    return;
  }
  playlist.videos = playlist.videos.filter((v) => v.toString() !== req.params.videoId);
  await playlist.save();
  const updated = await Playlist.findById(playlist._id).populate('videos', 'title thumbnail duration');
  res.json(updated);
};
