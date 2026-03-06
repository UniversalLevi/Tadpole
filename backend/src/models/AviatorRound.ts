import mongoose from 'mongoose';

export type AviatorRoundStatus = 'betting' | 'running' | 'crashed';

const aviatorRoundSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true, index: true },
    crashPoint: { type: Number, required: true },
    serverSeed: { type: String, required: true },
    serverSeedHash: { type: String, required: true },
    status: { type: String, enum: ['betting', 'running', 'crashed'], required: true, index: true },
    bettingClosesAt: { type: Date, required: true },
    runningStartedAt: { type: Date },
    startedAt: { type: Date, required: true },
    crashedAt: { type: Date },
  },
  { timestamps: true }
);

aviatorRoundSchema.index({ roundNumber: -1 });
aviatorRoundSchema.index({ status: 1, roundNumber: -1 });

export const AviatorRound = mongoose.model('AviatorRound', aviatorRoundSchema);

