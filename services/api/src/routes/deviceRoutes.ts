import { Router } from 'express';
import {
  registerDevice,
  getDevices,
  getDeviceById,
  updateDeviceStatus,
  deleteDevice,
  createInvitation,
  validateInvitation,
  syncDevice,
} from '../controllers/deviceController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

// Internal/Agent registration
router.post('/register', registerDevice);
router.post('/sync', syncDevice);
router.patch('/:deviceId/status', updateDeviceStatus);

// Invitation links for direct browser connection
router.post('/invite', protect, createInvitation);
router.get('/invite/:token', validateInvitation);

// Authenticated endpoints for support engineers
router.get('/', protect, getDevices);
router.get('/:deviceId', protect, getDeviceById);
router.delete('/:deviceId', protect, restrictTo('admin'), deleteDevice);

export default router;
