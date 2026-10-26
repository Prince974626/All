import express from 'express';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';
import {
  deleteOpenBet,
  deleteOpenBetWithPassword,
  listDeletedBets,
  listManageableBets,
  restoreDeletedBet,
  restoreDeletedBetWithPassword,
} from '../../controllers/admin/deleteBetController.js';

const router = express.Router();

router.get('/admin/delete-bets', adminAuthMiddleware, listManageableBets);
router.post(
  '/admin/delete-bets/:id',
  adminAuthMiddleware,
  deleteOpenBet
);
router.post(
  '/admin/delete-bets/:id/restore',
  adminAuthMiddleware,
  restoreDeletedBet
);
router.get('/get/deleted-bets', adminAuthMiddleware, listDeletedBets);
router.delete(
  '/delete-bet/:id',
  adminAuthMiddleware,
  deleteOpenBetWithPassword
);
router.put(
  '/restore-bet/:id',
  adminAuthMiddleware,
  restoreDeletedBetWithPassword
);

export default router;
