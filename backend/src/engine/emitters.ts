export type PredictionRoundStarted = (payload: { roundId: string; roundNumber: number; bettingClosesAt: Date; serverSeedHash: string }) => void;
export type PredictionRoundTimer = (payload: { roundId: string; secondsRemaining: number }) => void;
export type PredictionRoundClosed = (payload: { roundId: string }) => void;
export type PredictionRoundResult = (payload: { roundId: string; result: number; serverSeed: string }) => void;
export type WalletUpdate = (userId: string, payload: { availableBalance: number; lockedBalance: number }) => void;

type PredictionEmitters = {
  roundStarted: PredictionRoundStarted;
  roundTimer: PredictionRoundTimer;
  roundClosed: PredictionRoundClosed;
  roundResult: PredictionRoundResult;
  walletUpdate: WalletUpdate;
};

let predictionEmitters: PredictionEmitters = {
  roundStarted: () => {},
  roundTimer: () => {},
  roundClosed: () => {},
  roundResult: () => {},
  walletUpdate: () => {},
};

export function setPredictionEmitters(next: Partial<PredictionEmitters>): void {
  predictionEmitters = { ...predictionEmitters, ...next };
}

export function emitPredictionRoundStarted(payload: Parameters<PredictionRoundStarted>[0]): void {
  predictionEmitters.roundStarted(payload);
}
export function emitPredictionRoundTimer(payload: Parameters<PredictionRoundTimer>[0]): void {
  predictionEmitters.roundTimer(payload);
}
export function emitPredictionRoundClosed(payload: Parameters<PredictionRoundClosed>[0]): void {
  predictionEmitters.roundClosed(payload);
}
export function emitPredictionRoundResult(payload: Parameters<PredictionRoundResult>[0]): void {
  predictionEmitters.roundResult(payload);
}
export function emitWalletUpdate(userId: string, payload: { availableBalance: number; lockedBalance: number }): void {
  predictionEmitters.walletUpdate(userId, payload);
}

