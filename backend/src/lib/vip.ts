import type { VIPLevel } from '../models/User.js';
import type { GrowthConfigDoc } from '../models/GrowthConfig.js';

export function computeVipLevel(totalWagered: number, config: GrowthConfigDoc): VIPLevel {
  if (totalWagered >= config.vipPlatinumThreshold) return 'platinum';
  if (totalWagered >= config.vipGoldThreshold) return 'gold';
  if (totalWagered >= config.vipSilverThreshold) return 'silver';
  return 'bronze';
}
