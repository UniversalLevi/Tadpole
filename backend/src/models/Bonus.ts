import mongoose from 'mongoose';

export type BonusType = 'deposit_match' | 'cashback' | 'promo';

const bonusSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deposit_match', 'cashback', 'promo'],
      required: true,
    },
    name: { type: String, required: true },
    percentage: { type: Number, default: 0 },
    maxAmount: { type: Number, default: 0 },
    wagerMultiplier: { type: Number, default: 0 },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    code: { type: String, sparse: true }, // for promo codes
    maxRedemptions: { type: Number }, // for promo codes, null = unlimited
  },
  { timestamps: true }
);

bonusSchema.index({ type: 1 });
bonusSchema.index({ code: 1 }, { unique: true, sparse: true });

export const Bonus = mongoose.model('Bonus', bonusSchema);
