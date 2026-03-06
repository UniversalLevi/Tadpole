import mongoose from 'mongoose';

const dailyStatsSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    totalBetVolume: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    netRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyStatsSchema.index({ date: -1 });

export const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);
