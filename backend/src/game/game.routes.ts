import { Router, Request, Response } from 'express';
import { Round, Bet } from '../models/index.js';
import { getSystemConfig } from '../models/SystemConfig.js';
import { getGrowthConfig } from '../models/GrowthConfig.js';
import { getCurrentRound } from '../round/round.service.js';

const router = Router();

const LEADERBOARD_CACHE_TTL_MS = 60 * 1000;
type LeaderboardCacheEntry = { data: { items: Array<{ userId: string; value: number; rank: number }> }; expiresAt: number };
const leaderboardCache = new Map<string, LeaderboardCacheEntry>();

function getLeaderboardCacheKey(period: string, metric: string): string {
  return `lb_${period}_${metric}`;
}

router.get('/current-round', async (_req: Request, res: Response) => {
  try {
    const [round, config] = await Promise.all([getCurrentRound(), getSystemConfig()]);
    if (!round) {
      return res.json({ round: null, bettingPaused: config.bettingPaused });
    }
    const payload: Record<string, unknown> = {
      _id: round._id,
      roundNumber: round.roundNumber,
      status: round.status,
      bettingClosesAt: round.bettingClosesAt,
      serverSeedHash: round.serverSeedHash,
      totalBetAmount: round.totalBetAmount ?? 0,
    };
    if (round.status === 'settled' && round.result !== undefined) {
      payload.result = round.result;
      payload.serverSeed = round.serverSeed;
    }
    return res.json({ round: payload, bettingPaused: config.bettingPaused });
  } catch {
    return res.status(500).json({ error: 'Failed to get current round' });
  }
});

router.get('/rounds/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;
  try {
    const round = await Round.findById(roundId).select('-__v').lean();
    if (!round) return res.status(404).json({ error: 'Round not found' });
    const payload = { ...round };
    if (round.status !== 'settled') {
      delete (payload as Record<string, unknown>).serverSeed;
    }
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: 'Failed to get round' });
  }
});

router.get('/last-results', async (req: Request, res: Response) => {
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
  try {
    const items = await Round.find({ status: 'settled' })
      .sort({ roundNumber: -1 })
      .limit(limit)
      .select('roundNumber result')
      .lean();
    return res.json({ items });
  } catch {
    return res.status(500).json({ error: 'Failed to get last results' });
  }
});

router.get('/vip-thresholds', async (_req: Request, res: Response) => {
  try {
    const config = await getGrowthConfig();
    return res.json({
      silver: config.vipSilverThreshold,
      gold: config.vipGoldThreshold,
      platinum: config.vipPlatinumThreshold,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to get VIP thresholds' });
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'day';
  const metric = (req.query.metric as string) || 'volume';
  if (!['day', 'week'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period. Use day or week.' });
  }
  if (!['volume', 'biggestWin', 'wagered'].includes(metric)) {
    return res.status(400).json({ error: 'Invalid metric. Use volume, biggestWin, or wagered.' });
  }
  const cacheKey = getLeaderboardCacheKey(period, metric);
  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return res.json(cached.data);
  }
  const cutoff = period === 'day'
    ? new Date(Date.now() - 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const matchStage: Record<string, unknown> = { createdAt: { $gte: cutoff } };
    if (metric === 'biggestWin') matchStage.status = 'won';
    const sumField = metric === 'biggestWin' ? '$payoutAmount' : '$amount';
    const items = await Bet.aggregate<{ _id: import('mongoose').Types.ObjectId; value: number }>([
      { $match: matchStage },
      { $group: { _id: '$userId', value: { $sum: sumField } } },
      { $sort: { value: -1 } },
      { $limit: 10 },
    ]);
    const result = {
      items: items.map((row, i) => ({
        userId: String(row._id),
        value: Math.round(row.value * 100) / 100,
        rank: i + 1,
      })),
    };
    leaderboardCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
    });
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/rounds', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const skip = (page - 1) * limit;
  try {
    const [items, total] = await Promise.all([
      Round.find().sort({ roundNumber: -1 }).skip(skip).limit(limit).select('-serverSeed').lean(),
      Round.countDocuments(),
    ]);
    return res.json({ items, total, page, limit });
  } catch {
    return res.status(500).json({ error: 'Failed to list rounds' });
  }
});

export default router;
