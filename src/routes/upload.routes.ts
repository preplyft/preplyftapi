import { Router } from 'express';
import { getPresignedUrl } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/presigned-url', authenticate, authorize('instructor'), getPresignedUrl);

export default router;
