import http from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { setPredictionEmitters } from '../engine/emitters.js';
import { setAviatorEmitters } from '../games/aviator/index.js';
let io: Server | null = null;

export function initSocket(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: { origin: config.frontendOrigin, credentials: true },
  });
  const predictionRoom = 'game';
  const aviatorRoom = 'game:aviator';
  io.on('connection', (socket: Socket) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    let userId: string | null = null;
    if (token && typeof token === 'string') {
      try {
        const payload = jwt.verify(token, config.jwtAccessSecret) as { sub: string };
        userId = payload.sub;
        socket.data.userId = userId;
      } catch {
        socket.disconnect(true);
        return;
      }
    }
    socket.join(predictionRoom);
    if (userId) socket.join(`user:${userId}`);
    socket.on('aviator:join', () => socket.join(aviatorRoom));
    socket.on('aviator:leave', () => socket.leave(aviatorRoom));
    socket.on('disconnect', () => {});
  });
  setPredictionEmitters({
    roundStarted: (payload) => io?.to(predictionRoom).emit('round:started', payload),
    roundTimer: (payload) => io?.to(predictionRoom).emit('round:timer', payload),
    roundClosed: (payload) => io?.to(predictionRoom).emit('round:closed', payload),
    roundResult: (payload) => io?.to(predictionRoom).emit('round:result', payload),
    walletUpdate: (userId: string, payload: { availableBalance: number; lockedBalance: number }) => {
      io?.to(`user:${userId}`).emit('wallet:update', payload);
    },
  });
  setAviatorEmitters({
    countdown: (payload) => io?.to(aviatorRoom).emit('aviator:countdown', payload),
    roundStarted: (payload) => io?.to(aviatorRoom).emit('aviator:round:started', payload),
    tick: (payload) => io?.to(aviatorRoom).volatile.emit('aviator:tick', payload),
    crashed: (payload) => io?.to(aviatorRoom).emit('aviator:round:crashed', payload),
  });
  return io;
}

export function getIo(): Server | null {
  return io;
}

export function emitBetConfirmed(userId: string, payload: { betId: string; roundId: string; prediction: number; amount: number }): void {
  io?.to(`user:${userId}`).emit('bet:confirmed', payload);
}
