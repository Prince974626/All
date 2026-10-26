import express from 'express';

import {
  fetchCrirketBettingData,
  getCricketData,
} from '../controllers/cricketController.js';
import { getLiveMedia } from '../controllers/liveMediaController.js';
import { optionalMatchListAuth } from '../middleware/authMiddleware.js';
// import { proxyLiveStream } from "../controllers/videoProxy.js";

const router = express.Router();

router.get('/cricket/matches', optionalMatchListAuth, getCricketData);
router.get('/cricket/betting', fetchCrirketBettingData); // /api/betting?gameid=123
router.get('/live-media', getLiveMedia); // score + stream iframes for active API_PROVIDER
// router.get("/stream", proxyLiveStream);

export default router;
