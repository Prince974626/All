import mongoose from 'mongoose';

/**
 * Stores every raw GGR provider callback payload for debugging
 * (wallet mismatch, retries, duplicate rounds, etc.).
 */
const casinoGgrCallbackLogSchema = new mongoose.Schema(
  {
    rawBody: { type: mongoose.Schema.Types.Mixed, required: true },
    rawHeaders: { type: mongoose.Schema.Types.Mixed },
    query: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userName: { type: String, index: true },
    game_uid: { type: String, index: true },
    game_round: { type: String, index: true },
    processed: { type: Boolean, default: false, index: true },
    processResult: { type: String, default: '' },
    appliedDelta: { type: Number, default: 0 },
    walletBefore: { type: Number },
    walletAfter: { type: Number },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

casinoGgrCallbackLogSchema.index({ createdAt: -1 });
casinoGgrCallbackLogSchema.index({ userName: 1, createdAt: -1 });

export default mongoose.model(
  'CasinoGgrCallbackLog',
  casinoGgrCallbackLogSchema
);
