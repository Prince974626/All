import express from 'express';

import {
  bulkToggleMyBlockMarket,
  getMyBlockMarketLocks,
  toggleMyBlockMarket,
} from '../../controllers/admin/blockMarketController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/block-market/locks', adminAuthMiddleware, getMyBlockMarketLocks);
router.post('/block-market/toggle', adminAuthMiddleware, toggleMyBlockMarket);
router.post('/block-market/bulk', adminAuthMiddleware, bulkToggleMyBlockMarket);

export default router;
