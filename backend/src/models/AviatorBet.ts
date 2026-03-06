import mongoose from 'mongoose';

export type AviatorBetStatus = 'active' | 'cashed_out' | 'lost';

const aviatorBetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: 'AviatorRound', required: true, index: true },
    betAmount: { type: Number, required: true },
    autoCashout: { type: Number },
    cashoutMultiplier: { type: Number },
    payout: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'cashed_out', 'lost'], default: 'active', index: true },
  },
  { timestamps: true }
);

aviatorBetSchema.index({ roundId: 1, status: 1 });
aviatorBetSchema.index({ userId: 1, createdAt: -1 });

export const AviatorBet = mongoose.model('AviatorBet', aviatorBetSchema);

