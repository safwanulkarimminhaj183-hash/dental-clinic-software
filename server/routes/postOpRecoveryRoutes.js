import express from 'express';
import {
  listRecoveries, getFollowUps, getRecovery, createRecovery,
  updateRecovery, updateFollowUp, archiveRecovery, restoreRecovery,
} from '../controllers/postOpRecoveryController.js';
import { checkDbConnection } from '../config/db.js';
import { verifyToken, isAdmin, isDoctor } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(checkDbConnection);
// Every route handles PHI: authenticated clinic staff only (admin, doctor, receptionist)
router.use(verifyToken, isAdmin);

router.get('/', listRecoveries);
router.get('/follow-ups', getFollowUps);
router.get('/:id', getRecovery);

// Follow-up status/date: receptionists may manage scheduling
router.patch('/:id/follow-up', updateFollowUp);

// Clinical writes: doctors and admins only
router.post('/', isDoctor, createRecovery);
router.put('/:id', isDoctor, updateRecovery);
router.patch('/:id/archive', isDoctor, archiveRecovery);
router.patch('/:id/restore', isDoctor, restoreRecovery);

export default router;