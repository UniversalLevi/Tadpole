import crypto from 'node:crypto';

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Deterministic result 0-9 from serverSeed and roundNumber.
 * result = hash(serverSeed + roundNumber) % 10
 */
export function computeResult(serverSeed: string, roundNumber: number): number {
  const input = serverSeed + String(roundNumber);
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 10;
}

/**
 * Deterministic crash point (multiplier) from serverSeed and roundNumber.
 *
 * Steps:
 * - hash = sha256(serverSeed + roundNumber)
 * - r in [0, 1) derived from first 52 bits
 * - multiplier = floor((1 / (1 - r)) * 100) / 100
 * - capped to maxMultiplier for sanity
 */
export function computeCrashPoint(serverSeed: string, roundNumber: number, maxMultiplier: number = 100): number {
  const input = serverSeed + String(roundNumber);
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // 52 bits => 13 hex chars (13*4 = 52)
  const n = parseInt(hash.slice(0, 13), 16);
  const denom = 2 ** 52;
  const r = Math.min(0.999999999999, Math.max(0, n / denom)); // ensure < 1
  const raw = 1 / (1 - r);
  const m = Math.floor(raw * 100) / 100;
  return Math.min(maxMultiplier, Math.max(1, m));
}
