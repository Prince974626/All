import express from 'express';
import multer from 'multer';
import path from 'path';

import {
  deleteLoginPoster,
  getSiteSettings,
  updateSiteSettings,
  uploadLoginPoster,
} from '../controllers/siteSettingsController.js';
import { adminAuthMiddleware } from '../middleware/authMiddleware.js';
import { postersDir } from '../utils/posterStorage.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, postersDir),
  filename: (req, file, cb) => {
    // Prefer query (?type=mobile) — req.body is unreliable in multer filename()
    const kind =
      req.query?.type === 'mobile' || req.body?.type === 'mobile'
        ? 'mobile'
        : 'desktop';
    const ext =
      path.extname(file.originalname).toLowerCase() ||
      (file.mimetype === 'image/png' ? '.png' : '.jpg');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `login-${kind}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    return cb(null, true);
  },
});

// Public read (user site marquee + login posters)
router.get('/site-settings', getSiteSettings);

// Admin — multipart image upload → saved under backend/uploads/posters
router.post(
  '/upload/login-poster',
  adminAuthMiddleware,
  (req, res, next) => {
    upload.array('poster', 10)(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image too large (max 5MB)'
            : err.message || 'Upload failed';
        return res.status(400).json({ success: false, message });
      }
      return next();
    });
  },
  uploadLoginPoster
);

// Admin update (Match Control) — also converts base64 data URLs to files
router.put('/update/site-settings', adminAuthMiddleware, updateSiteSettings);

// Admin — remove one login poster from the desktop or mobile list
router.delete(
  '/site-settings/login-poster',
  adminAuthMiddleware,
  deleteLoginPoster
);

export default router;
