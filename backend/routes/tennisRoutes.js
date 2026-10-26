// routes/tennisRoutes.js
import express from 'express';

import {
  fetchTannisBettingData,
  fetchTennisData,
} from '../controllers/tennisController.js';
import { optionalMatchListAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/tennis', optionalMatchListAuth, fetchTennisData); // GET /api/tennis
router.get('/tannis/betting', fetchTannisBettingData); // /api/betting?gameid=123

export default router;
