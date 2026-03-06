import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const LAST_BET_AMOUNT_KEY = 'tadpole_last_bet_amount';
const MIN_BET = 10;
const MAX_BET = 10000;
const BET_TOAST_MS = 2500;
const WALLET_PULSE_MS = 1500;

type LastResultItem = { roundNumber: number; result: number };

function getStoredBetAmount(): string {
  try {
    const v = localStorage.getItem(LAST_BET_AMOUNT_KEY);
    if (v == null) return '';
    const n = parseFloat(v);
    if (Number.isNaN(n) || n < MIN_BET || n > MAX_BET) return '';
    return String(Math.round(n));
  } catch {
    return '';
  }
}

function setStoredBetAmount(amount: string): void {
  try {
    const n = parseFloat(amount);
    if (!Number.isNaN(n) && n >= MIN_BET && n <= MAX_BET) {
      localStorage.setItem(LAST_BET_AMOUNT_KEY, String(Math.round(n)));
    }
  } catch {}
}

export default function Game() {
  const { user } = useAuth();
  const { round, lastResult, walletBalance, walletUpdatedAt, connected, reconnecting, bettingPaused, refetchRound } = useSocket();
  const [prediction, setPrediction] = useState<number>(0);
  const [amount, setAmount] = useState(getStoredBetAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(round.secondsRemaining);
  const [betPlacedToast, setBetPlacedToast] = useState(false);
  const [lastResults, setLastResults] = useState<LastResultItem[]>([]);
  const [lastResultsLoading, setLastResultsLoading] = useState(true);
  const [roundError, setRoundError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showWalletPulse, setShowWalletPulse] = useState(false);

  useEffect(() => {
    setSecondsRemaining(round.secondsRemaining);
  }, [round.secondsRemaining]);

  useEffect(() => {
    if (round.status !== 'betting' || secondsRemaining <= 0) return;
    const t = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [round.status, secondsRemaining]);

  useEffect(() => {
    if (!betPlacedToast) return;
    const t = setTimeout(() => setBetPlacedToast(false), BET_TOAST_MS);
    return () => clearTimeout(t);
  }, [betPlacedToast]);

  function loadLastResults() {
    setLastResultsLoading(true);
    api.get<{ items: LastResultItem[] }>('/game/last-results?limit=10')
      .then((res) => setLastResults(res.data.items ?? []))
      .catch(() => setLastResults([]))
      .finally(() => setLastResultsLoading(false));
  }

  useEffect(() => {
    loadLastResults();
  }, []);

  useEffect(() => {
    if (lastResult) loadLastResults();
  }, [lastResult?.roundId]);

  useEffect(() => {
    if (walletUpdatedAt == null) return;
    setShowWalletPulse(true);
    const t = setTimeout(() => setShowWalletPulse(false), WALLET_PULSE_MS);
    return () => clearTimeout(t);
  }, [walletUpdatedAt]);

  const canBet = round.status === 'betting' && secondsRemaining > 0 && !bettingPaused;
  const maxWalletAmount =
    walletBalance != null ? Math.max(0, Math.floor(walletBalance.available)) : 0;

  async function handleRetryRound() {
    setRoundError(false);
    setRetrying(true);
    try {
      await refetchRound();
    } catch {
      setRoundError(true);
    } finally {
      setRetrying(false);
    }
  }

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  async function handlePlaceBet(e: React.FormEvent) {
    e.preventDefault();
    if (bettingPaused) {
      setError('Betting is temporarily paused');
      return;
    }
    if (!round.roundId) {
      setError('No active round');
      return;
    }
    if (!canBet) {
      setError('Betting closed. Wait for next round.');
      return;
    }
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num < MIN_BET || num > MAX_BET) {
      setError(`Amount must be between ${MIN_BET} and ${MAX_BET} INR`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/bet', { roundId: round.roundId, prediction, amount: num });
      setStoredBetAmount(amount);
      setBetPlacedToast(true);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Bet failed';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  const initialLoading = !connected && !round.roundId && !lastResult;

  return (
    <div className="page-container overflow-x-hidden">
      {betPlacedToast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Bet placed!
        </div>
      )}

      <Link to="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-700 min-h-[44px] inline-flex items-center">
        ← Back to Dashboard
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Number Prediction (0–9)</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium min-h-[44px] inline-flex items-center ${
            connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {connected ? 'Live' : reconnecting ? 'Reconnecting…' : 'Connecting…'}
        </span>
      </div>

      {walletBalance != null && (
        <p className={`mt-2 rounded-lg px-2 py-1 transition-colors ${showWalletPulse ? 'wallet-pulse' : ''} text-slate-600`}>
          Balance: <strong className="text-slate-900">₹{walletBalance.available.toFixed(2)}</strong>
          <span className="text-slate-500"> (locked: ₹{walletBalance.locked.toFixed(2)})</span>
        </p>
      )}

      {bettingPaused && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
          Betting is temporarily paused. Please try again later.
        </div>
      )}

      {lastResult && (
        <Card className="mt-6 overflow-hidden">
          <div className="bg-gradient-to-b from-teal-50 to-white border-b border-slate-200 px-5 py-4 md:px-6 md:py-5">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-1">Winning number</p>
            <div className="result-reveal flex items-center justify-center min-h-[4.5rem]">
              <span className="text-5xl md:text-6xl font-bold tabular-nums text-teal-600 drop-shadow-sm">
                {lastResult.result}
              </span>
            </div>
            <p className="text-center text-slate-600 text-sm mt-2">Result for this round — verify with seed below</p>
          </div>
          <div className="card-body">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▸</span> Server seed (for verification)
              </summary>
              <p className="mt-2 text-xs text-slate-500 break-all font-mono bg-slate-50 rounded-lg p-3">
                {lastResult.serverSeed}
              </p>
            </details>
          </div>
        </Card>
      )}

      {roundError && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 flex flex-wrap items-center gap-2">
          <span>Could not load round.</span>
          <Button type="button" variant="secondary" onClick={handleRetryRound} disabled={retrying}>
            {retrying ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      )}

      {initialLoading && (
        <p className="mt-6 text-slate-600">Loading round…</p>
      )}

      {round.roundId ? (
        <Card title={`Round #${round.roundNumber} — ${round.status === 'betting' ? 'Betting open' : 'Closed'}`} className="mt-6 sticky bottom-4 z-10 shadow-lg md:static md:bottom-auto md:shadow-none">
          {round.status === 'betting' && (
            <p className="text-lg font-semibold text-teal-600 mb-4">
              Time left: {Math.max(0, secondsRemaining)}s
            </p>
          )}
          {round.status === 'closed' && (
            <p className="text-amber-700 font-medium mb-4">Result processing…</p>
          )}
          {round.status === 'betting' && (
            <form onSubmit={handlePlaceBet} className="space-y-4">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <div>
                <label className="label">Prediction (0–9)</label>
                <select
                  value={prediction}
                  onChange={(e) => setPrediction(Number(e.target.value))}
                  className="input min-h-[44px]"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount (INR)</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAmount(String(MIN_BET))}
                    className="min-h-[44px]"
                  >
                    Min ({MIN_BET})
                  </Button>
                  <input
                    type="number"
                    min={MIN_BET}
                    max={maxWalletAmount}
                    step={10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`${MIN_BET} – ${maxWalletAmount}`}
                    className="input w-32 flex-1 min-w-0 min-h-[44px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAmount(String(maxWalletAmount))}
                    className="min-h-[44px]"
                  >
                    Max ({maxWalletAmount})
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!canBet}
                className="min-h-[44px]"
              >
                {canBet ? 'Place bet' : 'Betting closed'}
              </Button>
              {!canBet && secondsRemaining <= 0 && round.status === 'betting' && (
                <p className="text-sm text-slate-500">Wait for next round.</p>
              )}
            </form>
          )}
          {round.serverSeedHash && (
            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                Provably fair
              </summary>
              <div className="px-3 pb-3 text-xs text-slate-600 space-y-1">
                <p>Server seed hash (before result): <code className="break-all font-mono">{round.serverSeedHash}</code></p>
                <p>After the round, the server seed is revealed so you can verify the result.</p>
              </div>
            </details>
          )}
        </Card>
      ) : !initialLoading && !roundError && (
        <p className="mt-6 text-slate-600">Waiting for next round…</p>
      )}

      {lastResults.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Last 10 results</p>
          <div className="flex gap-2 overflow-x-auto pb-2 -webkit-overflow-scrolling-touch scrollbar-thin">
            {lastResultsLoading ? (
              <span className="text-slate-500 text-sm">Loading…</span>
            ) : (
              lastResults.map((item) => (
                <div
                  key={item.roundNumber}
                  className="flex-shrink-0 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center min-w-[4rem] shadow-sm"
                >
                  <span className="text-xs font-medium text-slate-500 block">#{item.roundNumber}</span>
                  <span className="text-2xl font-bold tabular-nums text-teal-600 mt-0.5 block">{item.result}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
