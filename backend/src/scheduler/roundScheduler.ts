import { registerEngine, recoverEnginesOnStartup, startEngine, stopEngine } from '../engine/engineManager.js';
import { predictionEngine } from '../games/prediction/prediction.engine.js';
import { aviatorEngine } from '../games/aviator/index.js';

// Register default engines when this module is loaded.
registerEngine(predictionEngine);
registerEngine(aviatorEngine);

export async function recoverRoundOnStartup(): Promise<void> {
  await recoverEnginesOnStartup();
}

export function startRoundScheduler(): void {
  startEngine('prediction');
}

export function stopRoundScheduler(): void {
  stopEngine('prediction');
}

export function startAviatorEngine(): void {
  startEngine('aviator');
}

export function stopAviatorEngine(): void {
  stopEngine('aviator');
}
