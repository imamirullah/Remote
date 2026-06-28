import { Router } from 'express';
import { createAuditLog, getAuditLogs } from '../controllers/auditLogController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/', createAuditLog);
router.get('/', protect, getAuditLogs);

export default router;
