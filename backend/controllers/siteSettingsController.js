import SiteSettings from '../models/siteSettingsModel.js';
import {
  absolutizeUploadUrl,
  deletePosterFile,
  persistPosterValue,
  toUploadsPathname,
} from '../utils/posterStorage.js';

const SETTINGS_KEY = 'default';
const DEFAULT_MARQUEE = '100% Secure and Trusted';

async function getOrCreateSettings() {
  let doc = await SiteSettings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await SiteSettings.create({
      key: SETTINGS_KEY,
      marqueeText: DEFAULT_MARQUEE,
    });
  }
  return doc;
}

const cleanUrlList = (values) => {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const url = String(value || '').trim();
    if (!url) continue;
    const key = toUploadsPathname(url) || url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
};

/** Prefer the array; fall back to the old single URL field. */
const storedPosterList = (doc, arrayField, legacyField) => {
  const fromArray = Array.isArray(doc?.[arrayField])
    ? doc[arrayField]
    : [];
  const list = cleanUrlList(fromArray);
  if (list.length) return list;
  const legacy = String(doc?.[legacyField] || '').trim();
  return legacy ? [legacy] : [];
};

function settingsPayload(doc, req) {
  const desktop = storedPosterList(
    doc,
    'loginPosterUrls',
    'loginPosterUrl'
  ).map((url) => absolutizeUploadUrl(url, req));
  const mobile = storedPosterList(
    doc,
    'loginPosterUrlsMobile',
    'loginPosterUrlMobile'
  ).map((url) => absolutizeUploadUrl(url, req));

  return {
    marqueeText: doc.marqueeText || DEFAULT_MARQUEE,
    loginPosterUrls: desktop,
    loginPosterUrlsMobile: mobile,
    loginPosterUrl: desktop[0] || '',
    loginPosterUrlMobile: mobile[0] || '',
    loginPosterEnabled: doc.loginPosterEnabled !== false,
  };
}

const posterFieldsFor = (kind, urls) => {
  const list = cleanUrlList(urls);
  if (kind === 'mobile') {
    return {
      loginPosterUrlsMobile: list,
      loginPosterUrlMobile: list[0] || '',
    };
  }
  return {
    loginPosterUrls: list,
    loginPosterUrl: list[0] || '',
  };
};

const samePoster = (a, b) => {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const pathA = toUploadsPathname(left);
  const pathB = toUploadsPathname(right);
  return Boolean(pathA && pathA === pathB);
};

/** Public — client + dashboard read site notice / posters */
export const getSiteSettings = async (req, res) => {
  try {
    const doc = await getOrCreateSettings();
    return res.status(200).json({
      success: true,
      data: settingsPayload(doc, req),
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch site settings',
      error: error.message,
    });
  }
};

/**
 * Admin — multipart file upload for login posters.
 * Saves file under backend/uploads/posters and stores a full public URL in DB.
 * Field: poster | body.type: desktop | mobile
 */
export const uploadLoginPoster = async (req, res) => {
  try {
    if (req.role !== 'supperadmin' && req.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can upload login posters',
      });
    }

    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
      });
    }

    const kind =
      req.query?.type === 'mobile' || req.body?.type === 'mobile'
        ? 'mobile'
        : 'desktop';
    const uploadedUrls = files.map((file) =>
      absolutizeUploadUrl(`/uploads/posters/${file.filename}`, req)
    );

    const existing = await getOrCreateSettings();
    const current =
      kind === 'mobile'
        ? storedPosterList(
            existing,
            'loginPosterUrlsMobile',
            'loginPosterUrlMobile'
          )
        : storedPosterList(existing, 'loginPosterUrls', 'loginPosterUrl');
    const next = cleanUrlList([...current, ...uploadedUrls]);

    const doc = await SiteSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: posterFieldsFor(kind, next) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message:
        uploadedUrls.length > 1
          ? 'Posters uploaded successfully'
          : 'Poster uploaded successfully',
      data: {
        url: uploadedUrls[uploadedUrls.length - 1],
        urls: uploadedUrls,
        type: kind,
        ...settingsPayload(doc, req),
      },
    });
  } catch (error) {
    console.error('Error uploading login poster:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload poster',
    });
  }
};

/** Admin — update marquee and/or login posters (URL or data URL) */
export const updateSiteSettings = async (req, res) => {
  try {
    if (req.role !== 'supperadmin' && req.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can update site settings',
      });
    }

    const {
      marqueeText,
      loginPosterUrl,
      loginPosterUrlMobile,
      loginPosterUrls,
      loginPosterUrlsMobile,
      loginPosterEnabled,
    } = req.body || {};

    const update = {};
    if (marqueeText !== undefined) {
      update.marqueeText = String(marqueeText).trim() || DEFAULT_MARQUEE;
    }

    const persistList = async (values, kind) => {
      const stored = [];
      for (const value of values) {
        const saved = await persistPosterValue(value, kind, req);
        if (saved) stored.push(saved);
      }
      return cleanUrlList(stored);
    };

    if (loginPosterUrls !== undefined || loginPosterUrl !== undefined) {
      const incoming = Array.isArray(loginPosterUrls)
        ? loginPosterUrls
        : loginPosterUrl
          ? [loginPosterUrl]
          : [];
      Object.assign(
        update,
        posterFieldsFor('desktop', await persistList(incoming, 'desktop'))
      );
    }
    if (
      loginPosterUrlsMobile !== undefined ||
      loginPosterUrlMobile !== undefined
    ) {
      const incoming = Array.isArray(loginPosterUrlsMobile)
        ? loginPosterUrlsMobile
        : loginPosterUrlMobile
          ? [loginPosterUrlMobile]
          : [];
      Object.assign(
        update,
        posterFieldsFor('mobile', await persistList(incoming, 'mobile'))
      );
    }
    if (loginPosterEnabled !== undefined) {
      update.loginPosterEnabled = Boolean(loginPosterEnabled);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No settings fields provided',
      });
    }

    const existing = await SiteSettings.findOne({ key: SETTINGS_KEY });

    const doc = await SiteSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const dropRemovedFiles = (previous, next) => {
      for (const url of previous) {
        if (!next.some((item) => samePoster(item, url))) {
          deletePosterFile(url);
        }
      }
    };
    if (update.loginPosterUrls !== undefined) {
      dropRemovedFiles(
        storedPosterList(existing, 'loginPosterUrls', 'loginPosterUrl'),
        update.loginPosterUrls
      );
    }
    if (update.loginPosterUrlsMobile !== undefined) {
      dropRemovedFiles(
        storedPosterList(
          existing,
          'loginPosterUrlsMobile',
          'loginPosterUrlMobile'
        ),
        update.loginPosterUrlsMobile
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Site settings updated successfully',
      data: settingsPayload(doc, req),
    });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update site settings',
    });
  }
};

/** Admin — remove one poster from the desktop or mobile list. */
export const deleteLoginPoster = async (req, res) => {
  try {
    if (req.role !== 'supperadmin' && req.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can delete login posters',
      });
    }

    const kind =
      req.query?.type === 'mobile' || req.body?.type === 'mobile'
        ? 'mobile'
        : 'desktop';
    const url = String(req.body?.url || req.query?.url || '').trim();
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Poster url is required',
      });
    }

    const existing = await getOrCreateSettings();
    const current =
      kind === 'mobile'
        ? storedPosterList(
            existing,
            'loginPosterUrlsMobile',
            'loginPosterUrlMobile'
          )
        : storedPosterList(existing, 'loginPosterUrls', 'loginPosterUrl');
    const next = current.filter((item) => !samePoster(item, url));
    if (next.length === current.length) {
      return res.status(404).json({
        success: false,
        message: 'Poster not found',
      });
    }

    const doc = await SiteSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: posterFieldsFor(kind, next) },
      { new: true }
    );
    deletePosterFile(url);

    return res.status(200).json({
      success: true,
      message: 'Poster deleted',
      data: settingsPayload(doc, req),
    });
  } catch (error) {
    console.error('Error deleting login poster:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete poster',
    });
  }
};
