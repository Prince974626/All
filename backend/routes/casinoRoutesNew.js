import express from 'express';
import {
  startCasinoGame,
  casinoCallback,
  debugEncryption,
  debugSimple,
  getCasinoBetHistory,
  getAllCasinoProfitLoss,
  getAllDownlineCasinoBetHistory,
  getCasinoProfitLossByDate,
} from '../controllers/casinoControllerNew.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/start', authMiddleware, startCasinoGame);
router.post('/callback', casinoCallback);
router.get('/debug-encryption', debugEncryption);
router.get('/debug-simple', debugSimple);
router.get('/bet-history/:userId', getCasinoBetHistory);
router.get('/profit-loss/:userId', getAllCasinoProfitLoss);
router.get('/profit-loss-by-date/:userId', getCasinoProfitLossByDate);
router.get('/all-bet-history', getAllDownlineCasinoBetHistory);
export default router;
