import { Router } from 'express';
import {
  getPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
} from '../controllers/playlist.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getPlaylists);
router.get('/:id', optionalAuth, getPlaylist);
router.post('/', authenticate, createPlaylist);
router.patch('/:id', authenticate, updatePlaylist);
router.delete('/:id', authenticate, deletePlaylist);
router.post('/:id/videos', authenticate, addVideoToPlaylist);
router.delete('/:id/videos/:videoId', authenticate, removeVideoFromPlaylist);

export default router;
