import { Router } from 'express';
import {
  createTeam,
  getTeams,
  addMember,
  removeMember,
} from '../controllers/teamController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.post('/', createTeam);
router.get('/', getTeams);
router.post('/:teamId/members', addMember);
router.delete('/:teamId/members', removeMember);

export default router;
