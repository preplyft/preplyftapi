import { Router } from 'express';
import {
  getVideos,
  getBookmarks,
  getVideo,
  getComments,
  createVideo,
  updateVideo,
  deleteVideo,
  toggleLike,
  toggleBookmark,
  addComment,
} from '../controllers/video.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';

const router = Router();

// Order matters — specific routes before parameterised ones
router.get('/', getVideos);
router.get('/bookmarks', authenticate, getBookmarks);
router.get('/:id', optionalAuth, getVideo);
router.get('/:id/comments', getComments);

router.post('/', authenticate, authorize('instructor'), createVideo);
router.patch('/:id', authenticate, authorize('instructor'), updateVideo);
router.delete('/:id', authenticate, authorize('instructor'), deleteVideo);

router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/bookmark', authenticate, toggleBookmark);
router.post('/:id/comments', authenticate, addComment);

export default router;
