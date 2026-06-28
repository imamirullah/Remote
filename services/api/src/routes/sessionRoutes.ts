import { Router } from 'express';
import {
  createSession,
  updateSessionStatus,
  getSessions,
  getSessionsForDevice,
} from '../controllers/sessionController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/', protect, createSession);
router.get('/', protect, getSessions);
router.get('/device/:deviceId', protect, getSessionsForDevice);
router.patch('/:sessionId/status', updateSessionStatus);

export default router;
