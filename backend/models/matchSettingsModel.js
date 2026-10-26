import mongoose from 'mongoose';

import subAdmin from './subAdminModel.js';

// Stores Match Control hides. Each admin's hide only applies to their downline.
// Compound uniqueness: same match can be hidden independently by different admins.
const deactivateMatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
    },
    sport: {
      type: String,
      enum: ['cricket', 'tennis', 'soccer', 'horse-racing'],
      required: true,
    },
    matchName: {
      type: String,
    },
    deactivateBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: subAdmin,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

deactivateMatchSchema.index({ matchId: 1, deactivateBy: 1 }, { unique: true });

const DeactivatedMatch = mongoose.model(
  'DeactivatedMatch',
  deactivateMatchSchema
);

/**
 * Drop legacy unique matchId index and remove old site-wide hides that had no
 * owner (those incorrectly hid matches for every level). Admins re-hide under
 * the new per-admin downline scope.
 */
async function migrateLegacyDeactivatedMatches() {
  try {
    await DeactivatedMatch.collection.dropIndex('matchId_1');
  } catch {
    // Index may not exist
  }

  try {
    const result = await DeactivatedMatch.deleteMany({
      $or: [{ deactivateBy: null }, { deactivateBy: { $exists: false } }],
    });
    if (result.deletedCount) {
      console.log(
        `[DeactivatedMatch] Cleared ${result.deletedCount} legacy site-wide hide(s)`
      );
    }
  } catch (err) {
    console.error('[DeactivatedMatch] legacy migrate failed:', err.message);
  }
}

if (mongoose.connection.readyState === 1) {
  migrateLegacyDeactivatedMatches();
} else {
  mongoose.connection.once('connected', migrateLegacyDeactivatedMatches);
}

export default DeactivatedMatch;
