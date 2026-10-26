import mongoose from 'mongoose';

/**
 * Singleton site-wide settings (marquee / login posters).
 * One document is upserted and reused.
 */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
    },
    marqueeText: {
      type: String,
      default: '100% Secure and Trusted',
    },
    loginPosterUrl: {
      type: String,
      default: '',
    },
    loginPosterUrlMobile: {
      type: String,
      default: '',
    },
    loginPosterUrls: {
      type: [String],
      default: [],
    },
    loginPosterUrlsMobile: {
      type: [String],
      default: [],
    },
    loginPosterEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
export default SiteSettings;
