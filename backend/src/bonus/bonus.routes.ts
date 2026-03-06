import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { claimCashback, redeemPromoCode } from './bonus.service.js';

const router = Router();
const redeemSchema = z.object({ body: z.object({ code: z.string().min(1) }) });

router.post('/cashback', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const result = await claimCashback(userId);
    return res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claim failed';
    return res.status(400).json({ error: msg });
  }
});

router.post('/redeem', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const parsed = redeemSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await redeemPromoCode(userId, parsed.data.body.code);
    return res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Redeem failed';
    return res.status(400).json({ error: msg });
  }
});

export default router;
