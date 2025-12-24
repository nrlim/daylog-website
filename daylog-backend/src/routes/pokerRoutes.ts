import { Router } from 'express';
import {
  // Anonymous sessions (no auth)
  createAnonymousSession,
  getAnonymousSession,
  joinAnonymousSession,
  voteAnonymous,
  revealAllAnonymous,
  resetAnonymousSession,
  // Authenticated sessions
  createSession,
  getSessions,
  getSessionById,
  vote,
  revealVotes,
  completeSession,
} from '../controllers/pokerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Anonymous poker routes (no authentication required)
router.post('/session', createAnonymousSession);
router.get('/session/:id', getAnonymousSession);
router.post('/session/:id/join', joinAnonymousSession);
router.post('/session/:id/vote', voteAnonymous);
router.post('/session/:id/reveal-all', revealAllAnonymous);
router.post('/session/:id/reset', resetAnonymousSession);

// Authenticated poker routes (original)
router.use(authMiddleware);

router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.post('/:id/vote', vote);
router.post('/:id/reveal', revealVotes);
router.post('/:id/complete', completeSession);

export default router;
