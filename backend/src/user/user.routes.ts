import mongoose from 'mongoose';
import { Router, Request, Response } from 'express';
import { User } from '../models/index.js';
import { Referral } from '../models/index.js';

const router = Router();

router.get('/me', async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await User.findById(userId)
      .select('email role referralCode totalWagered vipLevel')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      referralCode: user.referralCode ?? '',
      totalWagered: user.totalWagered ?? 0,
      vipLevel: user.vipLevel ?? 'bronze',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.get('/referrals', async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const refs = await Referral.aggregate<{ count: number; totalCommission: number }>([
      { $match: { referrerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, count: { $sum: 1 }, totalCommission: { $sum: '$commissionEarned' } } },
    ]);
    const data = refs[0] ?? { count: 0, totalCommission: 0 };
    return res.json({ count: data.count, totalCommission: data.totalCommission });
  } catch {
    return res.status(500).json({ error: 'Failed to get referrals' });
  }
});

export default router;
