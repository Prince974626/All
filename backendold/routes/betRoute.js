import express from 'express';

import {
  getAccountStatementHistory,
  getBetHistory,
  getExposureDetails,
  getFancyMasterBook,
  getPendingBets,
  getPendingBetsAmounts,
  getProfitlossHistory,
  getTransactionHistoryByUserAndDate,
  placeBetUnified,
  getAccountStatementMarketBets,
} from '../controllers/betController.js';
import { placeFancyBet } from '../controllers/betController.js';
import {
  adminAuthMiddleware,
  authMiddleware,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/user/place-bet', authMiddleware, placeBetUnified);

router.get('/user/pending-bet', authMiddleware, getPendingBets);
router.get('/user/pending-bet/amounts', authMiddleware, getPendingBetsAmounts);
router.get('/user/exposure-details', authMiddleware, getExposureDetails);
router.get('/user/fancy-master-book', authMiddleware, getFancyMasterBook);

router.get('/user/bet/history', authMiddleware, getBetHistory);
router.get('/user/profit-loss/history', authMiddleware, getProfitlossHistory);
router.get(
  '/account-statement/history',
  adminAuthMiddleware,
  getAccountStatementHistory
);
router.get(
  '/admin/account-statement/market-bets',
  adminAuthMiddleware,
  getAccountStatementMarketBets
);
router.get(
  '/user/account-statement/history',
  authMiddleware,
  getAccountStatementHistory
);
router.get(
  '/user/transactions-hisrtory',
  authMiddleware,
  getTransactionHistoryByUserAndDate
);
router.post('/user/place-fancy-bet', authMiddleware, placeFancyBet);

export default router;
