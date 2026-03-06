import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';

type Profile = { referralCode: string; totalWagered: number; vipLevel: string };
type ReferralStats = { count: number; totalCommission: number };

export default function Dashboard() {
  const { user } = useAuth();
  const { walletBalance, lastResult } = useSocket();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [cashbackMsg, setCashbackMsg] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [cashbackLoading, setCashbackLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const loadProfile = useCallback(() => {
    api.get<Profile>('/user/me').then((r) => setProfile(r.data)).catch(() => {});
    api.get<ReferralStats>('/user/referrals').then((r) => setReferralStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'user') loadProfile();
  }, [user?.role, loadProfile]);

  const copyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    }
  };

  const claimCashback = () => {
    setCashbackMsg('');
    setCashbackLoading(true);
    api.post<{ amount: number }>('/bonus/cashback')
      .then((r) => {
        setCashbackMsg(r.data.amount > 0 ? `₹${r.data.amount} cashback credited!` : 'No cashback available this period.');
        loadProfile();
      })
      .catch((e: { response?: { data?: { error?: string } } }) => {
        setCashbackMsg(e.response?.data?.error || 'Claim failed');
      })
      .finally(() => setCashbackLoading(false));
  };

  const redeemPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoMsg('');
    setPromoLoading(true);
    api.post<{ amount: number }>('/bonus/redeem', { code: promoCode.trim() })
      .then((r) => {
        setPromoMsg(`₹${r.data.amount} credited!`);
        setPromoCode('');
        loadProfile();
      })
      .catch((e: { response?: { data?: { error?: string } } }) => {
        setPromoMsg(e.response?.data?.error || 'Redeem failed');
      })
      .finally(() => setPromoLoading(false));
  };

  if (user?.role === 'admin') {
    return (
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <p className="mt-1 text-slate-600">Manage users, withdrawals, and settings.</p>
        </div>
        <Link
          to="/admin"
          className="card block max-w-md border-amber-200 bg-amber-50/50 transition hover:border-amber-300 hover:shadow-md"
        >
          <div className="card-body">
            <span className="font-semibold text-amber-800">Go to Admin panel</span>
            <p className="mt-1 text-sm text-amber-700">Users, withdrawals, emergency settings</p>
          </div>
        </Link>
      </div>
    );
  }

  const quickLinks = [
    { to: '/wallet', label: 'Wallet', desc: 'Deposit & view balance' },
    { to: '/game', label: 'Game', desc: 'Number prediction (0–9)' },
    { to: '/leaderboard', label: 'Leaderboard', desc: 'Top players' },
    { to: '/withdrawal', label: 'Withdraw', desc: 'Request withdrawal' },
  ];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">Welcome back, {user?.email}</p>
        {profile && (
          <p className="mt-1 text-sm text-slate-500">
            VIP: <span className="font-medium capitalize text-teal-600">{profile.vipLevel}</span>
            {profile.totalWagered > 0 && ` · Wagered: ₹${profile.totalWagered.toLocaleString()}`}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {walletBalance != null && (
          <Card title="Balance">
            <p className="balance-display">₹{walletBalance.available.toFixed(2)}</p>
            <p className="balance-muted">Locked: ₹{walletBalance.locked.toFixed(2)}</p>
          </Card>
        )}
        {lastResult != null && (
          <Card title="Last result">
            <p className="text-slate-700">
              Round result: <strong className="text-teal-600">{lastResult.result}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500 break-all">Seed: {lastResult.serverSeed}</p>
          </Card>
        )}
      </div>

      {profile && (
        <Card title="Refer & rewards" className="mt-6">
          <div className="space-y-4">
            {profile.referralCode && (
              <div>
                <p className="text-sm font-medium text-slate-700">Your referral code</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm">{profile.referralCode}</code>
                  <Button type="button" variant="secondary" onClick={copyReferralCode}>
                    {copyDone ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                {referralStats != null && (
                  <p className="mt-1 text-xs text-slate-500">
                    {referralStats.count} referral(s) · ₹{referralStats.totalCommission.toFixed(0)} earned
                  </p>
                )}
              </div>
            )}
            <div>
              <Button type="button" variant="secondary" onClick={claimCashback} loading={cashbackLoading}>
                Claim cashback
              </Button>
              {cashbackMsg && <p className="mt-1 text-sm text-slate-600">{cashbackMsg}</p>}
            </div>
            <form onSubmit={redeemPromo} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="label text-sm">Promo code</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="input mt-0.5 w-full"
                />
              </div>
              <Button type="submit" variant="secondary" loading={promoLoading}>Redeem</Button>
            </form>
            {promoMsg && <p className="text-sm text-slate-600">{promoMsg}</p>}
          </div>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="card block transition hover:border-teal-300 hover:shadow-md"
            >
              <div className="card-body">
                <span className="font-semibold text-slate-900">{label}</span>
                <p className="mt-1 text-sm text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
