import type { GameEngine, GameId } from './types.js';

const engines = new Map<GameId, GameEngine>();

export function registerEngine(engine: GameEngine): void {
  engines.set(engine.id, engine);
}

export function startEngine(id: GameId): void {
  const e = engines.get(id);
  if (!e) throw new Error(`Engine not registered: ${id}`);
  e.start();
}

export function stopEngine(id: GameId): void {
  const e = engines.get(id);
  if (!e) return;
  e.stop();
}

export async function recoverEnginesOnStartup(): Promise<void> {
  for (const e of engines.values()) {
    await e.recoverOnStartup();
  }
}

