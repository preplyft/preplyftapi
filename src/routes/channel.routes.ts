import { Router } from 'express';
import {
  getChannels,
  getMyChannels,
  getChannel,
  createChannel,
  updateChannel,
  toggleSubscribe,
} from '../controllers/channel.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getChannels);
router.get('/mine', authenticate, authorize('instructor'), getMyChannels);
router.get('/:id', getChannel);
router.post('/', authenticate, createChannel);
router.patch('/:id', authenticate, authorize('instructor'), updateChannel);
router.post('/:id/subscribe', authenticate, toggleSubscribe);

export default router;
