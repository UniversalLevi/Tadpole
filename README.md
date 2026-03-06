# Tadpole

Monorepo for the Tadpole platform.

- **backend/** ? Node.js + Express + TypeScript (API, auth, wallet, payments, withdrawals, admin)
- **frontend/** ? Vite + React + TypeScript (Phase 1: auth, dashboard, wallet, deposit, withdrawal, admin panel)

Phase 1: Core financial infrastructure only (no games).

## Setup

1. **MongoDB** ? Use a replica set (required for transactions). Example local: `mongod --replSet rs0` then `rs.initiate()`.
2. **Backend** ? From `backend/`: copy `.env.example` to `.env`, set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and optionally Razorpay keys + `WEBHOOK_SECRET` for deposits. Run `npm install` and `npm run dev`.
3. **Frontend** ? From `frontend/`: set `VITE_API_URL=http://localhost:5000` if needed. Run `npm install` and `npm run dev`.
4. **First admin** ? Register a user, then in MongoDB set `role: "admin"` for that user: `db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })`.

## Phase 1 testing checklist

Before considering Phase 1 complete, verify:

- Duplicate webhook call (same payment id) ? single credit; idempotent
- Two concurrent deposit requests (same user) ? both processed; no double credit
- Withdrawal with insufficient balance ? rejected; no deduction
- Admin double approval (same withdrawal) ? second attempt rejected
- JWT expiry ? 401; refresh flow works; after refresh expiry, re-login required
- 100 test deposits with 0 duplicate credits
- No negative balance possible
- Logs show every transaction
- Admin can freeze user

## Phase 4 (UX & observability)

- **Round cache** — `GET /game/current-round` is served from in-memory cache when a round is active; Mongo is queried only on cache miss (e.g. after restart or between rounds). Slow cache-miss queries are logged when they exceed `SLOW_QUERY_MS`.
- **CORS / HTTPS** — Set `FRONTEND_ORIGIN` to a single origin in production (no wildcard). For HTTPS, run the backend behind a reverse proxy (e.g. Nginx) that terminates TLS and sets `x-forwarded-proto`; the app will redirect HTTP to HTTPS when `NODE_ENV=production`.
- **Admin metrics** — `GET /admin/metrics` (admin only): active users (last 15 min), bets per minute, round timing config, payment volume (24h). `GET /admin/analytics` (admin only): daily active users, signup→deposit conversion, bet frequency by day, average bet size, retention (day 1 / day 7). All computed from MongoDB; no Redis required.
