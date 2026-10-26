import express from 'express';

import {
  executeCashout,
  getCashoutHedgeQuote,
  getCashoutQuote,
} from '../controllers/cashoutController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/user/cashout/quote', authMiddleware, getCashoutQuote);
router.post('/user/cashout/hedge-quote', authMiddleware, getCashoutHedgeQuote);
router.post('/user/cashout/execute', authMiddleware, executeCashout);

export default router;
