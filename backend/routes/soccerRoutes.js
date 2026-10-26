// routes/soccerRoutes.js
import express from 'express';

import {
  fetchsoccerBettingData,
  fetchSoccerData,
} from '../controllers/soccerController.js';
import { optionalMatchListAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/soccer', optionalMatchListAuth, fetchSoccerData);
router.get('/soccer/betting', fetchsoccerBettingData); // /api/betting?gameid=123

export default router;
