// routes/horseRacingRoutes.js
import express from 'express';

import {
  fetchHorseRacingBettingData,
  fetchHorseRacingData,
} from '../controllers/horseRacingController.js';
import { optionalMatchListAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/horse-racing', optionalMatchListAuth, fetchHorseRacingData); // GET /api/horse-racing
router.get('/horse-racing/betting', fetchHorseRacingBettingData); // GET /api/horse-racing/betting?gameid=123

export default router;
