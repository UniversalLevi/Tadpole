export type GameId = 'prediction' | 'aviator';

export interface GameEngine {
  id: GameId;
  start(): void;
  stop(): void;
  recoverOnStartup(): Promise<void>;
}

