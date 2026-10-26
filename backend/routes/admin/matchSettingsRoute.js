import express from 'express';

import {
  checkMatchStatus,
  getDeactivatedMatches,
  toggleMatchStatus,
} from '../../controllers/admin/matchSettingsController.js';
import { adminAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = express.Router();

//Toggle Match active/deactive
router.patch(
  '/match-settings/:matchId/toggle-active',
  adminAuthMiddleware,
  toggleMatchStatus
);

//Get deactivated matches for this admin only
router.get(
  '/match-settings/deactivated',
  adminAuthMiddleware,
  getDeactivatedMatches
);

//Check single match status
router.get(
  '/match-settings/:matchId/status',
  adminAuthMiddleware,
  checkMatchStatus
);

export default router;
