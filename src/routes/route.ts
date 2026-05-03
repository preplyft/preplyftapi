import { Router } from 'express';
import authRoutes from './auth.routes';
import uploadRoutes from './upload.routes';
import channelRoutes from './channel.routes';
import videoRoutes from './video.routes';
import courseRoutes from './course.routes';
import playlistRoutes from './playlist.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/channels', channelRoutes);
router.use('/videos', videoRoutes);
router.use('/courses', courseRoutes);
router.use('/playlists', playlistRoutes);

export default router;
