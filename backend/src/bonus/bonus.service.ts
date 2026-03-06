import mongoose from 'mongoose';
import { Bonus, UserBonus, User, Bet } from '../models/index.js';
import { getGrowthConfig } from '../models/GrowthConfig.js';
import { updateBalance } from '../wallet/wallet.service.js';
import type { VIPLevel } from '../models/User.js';

/**
 * Get or create the first-deposit bonus template (type deposit_match). Uses GrowthConfig for defaults.
 */
export async function getOrCreateFirstDepositBonus(session?: mongoose.mongo.ClientSession): Promise<mongoose.Types.ObjectId> {
  const opts = session ? { session } : {};
  let bonus = await Bonus.findOne({ type: 'deposit_match', isActive: true }, null, opts).lean();
  if (bonus) return bonus._id;
  const config = await getGrowthConfig();
  const [created] = await Bonus.create(
    [
      {
        type: 'deposit_match',
        name: 'First Deposit Bonus',
        percentage: config.firstDepositBonusPercent,
        maxAmount: config.firstDepositBonusMaxAmount,
        wagerMultiplier: config.firstDepositWagerMultiplier,
        isActive: true,
      },
    ],
    opts
  );
  return created._id;
}

/**
 * Apply first-deposit bonus: credit bonus amount and create UserBonus with wager requirement.
 * Call only when user has no prior deposit and no existing active deposit_match userBonus.
 */
export async function applyFirstDepositBonus(
  userId: string,
  depositAmount: number,
  session: mongoose.mongo.ClientSession
): Promise<number> {
  const config = await getGrowthConfig();
  const bonusAmount = Math.min(
    (config.firstDepositBonusPercent / 100) * depositAmount,
    config.firstDepositBonusMaxAmount
  );
  if (bonusAmount < 1) return 0;

  const bonusId = await getOrCreateFirstDepositBonus(session);
  const existing = await UserBonus.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    bonusId,
  }).session(session).lean();
  if (existing) return 0; // already had first-deposit bonus
  const wagerRequired = bonusAmount * config.firstDepositWagerMultiplier;

  await UserBonus.create(
    [
      {
        userId: new mongoose.Types.ObjectId(userId),
        bonusId,
        amount: bonusAmount,
        wagerRequired,
        wagerCompleted: 0,
        status: 'active',
      },
    ],
    { session }
  );

  await updateBalance(userId, {
    type: 'bonus_credit',
    amount: bonusAmount,
    referenceId: `first_deposit_${userId}_${Date.now()}`,
    session,
  });

  return bonusAmount;
}

function getCashbackPercentForLevel(level: VIPLevel | undefined, config: Awaited<ReturnType<typeof getGrowthConfig>>): number {
  switch (level) {
    case 'silver': return config.vipSilverCashbackPercent;
    case 'gold': return config.vipGoldCashbackPercent;
    case 'platinum': return config.vipPlatinumCashbackPercent;
    default: return config.cashbackPercent;
  }
}

/**
 * Compute and credit weekly cashback for a user: 5% (or VIP %) of net loss in last N days.
 * Returns amount credited. User must not have claimed in the same period (lastCashbackAt).
 */
export async function claimCashback(userId: string): Promise<{ amount: number }> {
  const config = await getGrowthConfig();
  const periodMs = config.cashbackPeriodDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - periodMs);

  const user = await User.findById(userId).select('lastCashbackAt vipLevel').lean();
  if (!user) throw new Error('User not found');
  if (user.lastCashbackAt && new Date(user.lastCashbackAt).getTime() > cutoff.getTime()) {
    throw new Error('Cashback already claimed for this period. Try again later.');
  }

  const lostBets = await Bet.aggregate<{ totalLoss: number }>([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'lost', createdAt: { $gte: cutoff } } },
    { $group: { _id: null, totalLoss: { $sum: '$amount' } } },
  ]);
  const totalLoss = lostBets[0]?.totalLoss ?? 0;
  if (totalLoss < 1) return { amount: 0 };

  const percent = getCashbackPercentForLevel(user.vipLevel as VIPLevel | undefined, config);
  const amount = Math.floor((totalLoss * percent) / 100);
  if (amount < 1) return { amount: 0 };

  await updateBalance(userId, {
    type: 'cashback',
    amount,
    referenceId: `cashback_${userId}_${Date.now()}`,
  });
  await User.updateOne({ _id: userId }, { $set: { lastCashbackAt: new Date() } });
  return { amount };
}

/**
 * Redeem a promo code. Creates UserBonus and credits wallet. One redemption per user per code.
 */
export async function redeemPromoCode(userId: string, code: string): Promise<{ amount: number }> {
  const normalizedCode = code.trim().toUpperCase();
  const bonus = await Bonus.findOne({ type: 'promo', code: normalizedCode, isActive: true }).lean();
  if (!bonus) throw new Error('Invalid or expired promo code');
  if (bonus.expiryDate && new Date(bonus.expiryDate) < new Date()) {
    throw new Error('Promo code has expired');
  }
  if (bonus.maxRedemptions != null) {
    const count = await UserBonus.countDocuments({ bonusId: bonus._id });
    if (count >= bonus.maxRedemptions) throw new Error('Promo code limit reached');
  }
  const alreadyRedeemed = await UserBonus.exists({
    userId: new mongoose.Types.ObjectId(userId),
    bonusId: bonus._id,
  });
  if (alreadyRedeemed) throw new Error('You have already used this promo code');

  const amount = bonus.maxAmount > 0 ? bonus.maxAmount : Math.floor((bonus.percentage / 100) * 100); // fallback if no maxAmount
  if (amount < 1) throw new Error('Invalid promo code');

  const wagerRequired = amount * (bonus.wagerMultiplier || 0);
  await UserBonus.create({
    userId: new mongoose.Types.ObjectId(userId),
    bonusId: bonus._id,
    amount,
    wagerRequired,
    wagerCompleted: 0,
    status: 'active',
    expiresAt: bonus.expiryDate,
  });
  await updateBalance(userId, {
    type: 'bonus_credit',
    amount,
    referenceId: `promo_${bonus._id}_${userId}_${Date.now()}`,
  });
  return { amount };
}
