import mongoose from 'mongoose';

export type UserBonusStatus = 'active' | 'completed' | 'expired';

const userBonusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bonusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bonus', required: true },
    amount: { type: Number, required: true },
    wagerRequired: { type: Number, required: true },
    wagerCompleted: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired'],
      default: 'active',
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

userBonusSchema.index({ userId: 1, status: 1 });
userBonusSchema.index({ userId: 1 });

export const UserBonus = mongoose.model('UserBonus', userBonusSchema);
