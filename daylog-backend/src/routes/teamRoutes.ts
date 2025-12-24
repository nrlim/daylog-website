import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
} from '../controllers/teamController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:id', getTeamById);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

export default router;
