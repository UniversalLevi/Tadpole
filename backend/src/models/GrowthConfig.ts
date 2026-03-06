import mongoose from 'mongoose';

const GROWTH_CONFIG_ID = 'growth';

export type VIPLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

const growthConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: GROWTH_CONFIG_ID },
    // First deposit bonus
    firstDepositBonusPercent: { type: Number, default: 100 },
    firstDepositBonusMaxAmount: { type: Number, default: 500 },
    firstDepositWagerMultiplier: { type: Number, default: 5 },
    // Cashback
    cashbackPercent: { type: Number, default: 5 },
    cashbackPeriodDays: { type: Number, default: 7 },
    // Referral: flat reward on referred user's first deposit
    referralRewardType: { type: String, enum: ['flat', 'percent_loss'], default: 'flat' },
    referralFlatAmount: { type: Number, default: 100 },
    referralPercentOfLoss: { type: Number, default: 5 },
    // VIP thresholds (total wager in INR)
    vipSilverThreshold: { type: Number, default: 10000 },
    vipGoldThreshold: { type: Number, default: 50000 },
    vipPlatinumThreshold: { type: Number, default: 200000 },
    // VIP cashback by level (override base cashback)
    vipSilverCashbackPercent: { type: Number, default: 2 },
    vipGoldCashbackPercent: { type: Number, default: 5 },
    vipPlatinumCashbackPercent: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const GrowthConfigModel = mongoose.model('GrowthConfig', growthConfigSchema);

const defaults = {
  _id: GROWTH_CONFIG_ID,
  firstDepositBonusPercent: 100,
  firstDepositBonusMaxAmount: 500,
  firstDepositWagerMultiplier: 5,
  cashbackPercent: 5,
  cashbackPeriodDays: 7,
  referralRewardType: 'flat',
  referralFlatAmount: 100,
  referralPercentOfLoss: 5,
  vipSilverThreshold: 10000,
  vipGoldThreshold: 50000,
  vipPlatinumThreshold: 200000,
  vipSilverCashbackPercent: 2,
  vipGoldCashbackPercent: 5,
  vipPlatinumCashbackPercent: 5,
};

export interface GrowthConfigDoc {
  firstDepositBonusPercent: number;
  firstDepositBonusMaxAmount: number;
  firstDepositWagerMultiplier: number;
  cashbackPercent: number;
  cashbackPeriodDays: number;
  referralRewardType: 'flat' | 'percent_loss';
  referralFlatAmount: number;
  referralPercentOfLoss: number;
  vipSilverThreshold: number;
  vipGoldThreshold: number;
  vipPlatinumThreshold: number;
  vipSilverCashbackPercent: number;
  vipGoldCashbackPercent: number;
  vipPlatinumCashbackPercent: number;
}

export async function getGrowthConfig(): Promise<GrowthConfigDoc> {
  let doc = await GrowthConfigModel.findById(GROWTH_CONFIG_ID).lean();
  if (!doc) {
    await GrowthConfigModel.create(defaults);
    doc = await GrowthConfigModel.findById(GROWTH_CONFIG_ID).lean();
  }
  return {
    firstDepositBonusPercent: doc?.firstDepositBonusPercent ?? defaults.firstDepositBonusPercent,
    firstDepositBonusMaxAmount: doc?.firstDepositBonusMaxAmount ?? defaults.firstDepositBonusMaxAmount,
    firstDepositWagerMultiplier: doc?.firstDepositWagerMultiplier ?? defaults.firstDepositWagerMultiplier,
    cashbackPercent: doc?.cashbackPercent ?? defaults.cashbackPercent,
    cashbackPeriodDays: doc?.cashbackPeriodDays ?? defaults.cashbackPeriodDays,
    referralRewardType: (doc?.referralRewardType as 'flat' | 'percent_loss') ?? defaults.referralRewardType,
    referralFlatAmount: doc?.referralFlatAmount ?? defaults.referralFlatAmount,
    referralPercentOfLoss: doc?.referralPercentOfLoss ?? defaults.referralPercentOfLoss,
    vipSilverThreshold: doc?.vipSilverThreshold ?? defaults.vipSilverThreshold,
    vipGoldThreshold: doc?.vipGoldThreshold ?? defaults.vipGoldThreshold,
    vipPlatinumThreshold: doc?.vipPlatinumThreshold ?? defaults.vipPlatinumThreshold,
    vipSilverCashbackPercent: doc?.vipSilverCashbackPercent ?? defaults.vipSilverCashbackPercent,
    vipGoldCashbackPercent: doc?.vipGoldCashbackPercent ?? defaults.vipGoldCashbackPercent,
    vipPlatinumCashbackPercent: doc?.vipPlatinumCashbackPercent ?? defaults.vipPlatinumCashbackPercent,
  };
}

export async function updateGrowthConfig(updates: Partial<GrowthConfigDoc>): Promise<GrowthConfigDoc> {
  await GrowthConfigModel.findByIdAndUpdate(
    GROWTH_CONFIG_ID,
    { $set: updates },
    { new: true, upsert: true }
  );
  return getGrowthConfig();
}
