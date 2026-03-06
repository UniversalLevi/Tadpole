import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commissionEarned: { type: Number, default: 0 },
    firstDepositAt: { type: Date },
    referrerIp: { type: String },
    referredIp: { type: String },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1 });
referralSchema.index({ referredUserId: 1 }, { unique: true });

export const Referral = mongoose.model('Referral', referralSchema);
