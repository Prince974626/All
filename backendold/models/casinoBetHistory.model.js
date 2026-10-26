import mongoose from 'mongoose';

const casinoBetHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String, // or mongoose.Schema.Types.ObjectId if you prefer
      required: true,
      index: true, // for faster queries
    },
    userName: { type: String, required: true }, // maps to "mobile"
    game_uid: { type: String, required: true },
    game_name: { type: String },
    game_round: { type: String, required: true },
    bet_amount: { type: Number, default: 0 },
    win_amount: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    wallet_before: { type: Number },
    wallet_after: { type: Number },
    currency_code: { type: String },
    token: { type: String },
    provider_timestamp: { type: Date },
    providerRaw: { type: Object },
    processedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicates from retries
casinoBetHistorySchema.index({ userName: 1, game_round: 1 }, { unique: true });
// Index for userId queries
casinoBetHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('CasinoBetHistory', casinoBetHistorySchema);
