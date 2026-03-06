import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../api/client';

type GrowthConfig = {
  firstDepositBonusPercent: number;
  firstDepositBonusMaxAmount: number;
  firstDepositWagerMultiplier: number;
  cashbackPercent: number;
  cashbackPeriodDays: number;
  referralRewardType: string;
  referralFlatAmount: number;
  referralPercentOfLoss: number;
  vipSilverThreshold: number;
  vipGoldThreshold: number;
  vipPlatinumThreshold: number;
  vipSilverCashbackPercent: number;
  vipGoldCashbackPercent: number;
  vipPlatinumCashbackPercent: number;
};

type GrowthStats = {
  bonusUsage: Record<string, number>;
  referralStats: { totalReferrals: number; totalCommissionPaid: number };
  revenueToday: { totalBetVolume: number; totalPayout: number; netRevenue: number } | null;
  revenueLast7Days: Array<{ date: string; totalBetVolume: number; totalPayout: number; netRevenue: number }>;
};

export default function AdminGrowth() {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<GrowthConfig>>({});
  const [msg, setMsg] = useState('');

  function load() {
    Promise.all([
      api.get<GrowthConfig>('/admin/growth-config'),
      api.get<GrowthStats>('/admin/growth'),
    ])
      .then(([c, s]) => {
        setForm({ ...c.data });
        setStats(s.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    api
      .patch('/admin/growth-config', form)
      .then((r) => {
        setForm(r.data);
        setMsg('Saved');
        load();
      })
      .catch(() => setMsg('Save failed'))
      .finally(() => setSaving(false));
  }

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-900">Growth & revenue</h1>
      <p className="mt-1 text-slate-600">Configure bonuses, referral, VIP and view growth analytics.</p>

      {stats && (
        <Card title="Growth analytics" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-slate-500">Bonus usage (by status)</p>
              <pre className="mt-1 text-sm font-mono">{JSON.stringify(stats.bonusUsage, null, 2)}</pre>
            </div>
            <div>
              <p className="text-sm text-slate-500">Referrals</p>
              <p className="mt-1 font-semibold">Total: {stats.referralStats.totalReferrals}</p>
              <p className="text-sm">Commission paid: ₹{stats.referralStats.totalCommissionPaid.toFixed(0)}</p>
            </div>
            {stats.revenueToday && (
              <div>
                <p className="text-sm text-slate-500">Revenue today</p>
                <p className="mt-1">Bet volume: ₹{stats.revenueToday.totalBetVolume.toFixed(0)}</p>
                <p className="text-sm">Payout: ₹{stats.revenueToday.totalPayout.toFixed(0)}</p>
                <p className="text-sm font-medium text-teal-600">Net: ₹{stats.revenueToday.netRevenue.toFixed(0)}</p>
              </div>
            )}
          </div>
          {stats.revenueLast7Days?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Last 7 days</p>
              <ul className="mt-1 space-y-1 text-sm">
                {stats.revenueLast7Days.map((d) => (
                  <li key={d.date}>{d.date}: ₹{Number(d.netRevenue ?? 0).toFixed(0)}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card title="Growth config" className="mt-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">First deposit bonus %</label>
              <input
                type="number"
                min={0}
                value={form.firstDepositBonusPercent ?? ''}
                onChange={(e) => setForm({ ...form, firstDepositBonusPercent: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">First deposit max ₹</label>
              <input
                type="number"
                min={0}
                value={form.firstDepositBonusMaxAmount ?? ''}
                onChange={(e) => setForm({ ...form, firstDepositBonusMaxAmount: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">First deposit wager multiplier</label>
              <input
                type="number"
                min={0}
                value={form.firstDepositWagerMultiplier ?? ''}
                onChange={(e) => setForm({ ...form, firstDepositWagerMultiplier: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">Cashback %</label>
              <input
                type="number"
                min={0}
                value={form.cashbackPercent ?? ''}
                onChange={(e) => setForm({ ...form, cashbackPercent: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">Referral reward (flat ₹)</label>
              <input
                type="number"
                min={0}
                value={form.referralFlatAmount ?? ''}
                onChange={(e) => setForm({ ...form, referralFlatAmount: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">VIP Silver threshold (₹)</label>
              <input
                type="number"
                min={0}
                value={form.vipSilverThreshold ?? ''}
                onChange={(e) => setForm({ ...form, vipSilverThreshold: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">VIP Gold threshold (₹)</label>
              <input
                type="number"
                min={0}
                value={form.vipGoldThreshold ?? ''}
                onChange={(e) => setForm({ ...form, vipGoldThreshold: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">VIP Platinum threshold (₹)</label>
              <input
                type="number"
                min={0}
                value={form.vipPlatinumThreshold ?? ''}
                onChange={(e) => setForm({ ...form, vipPlatinumThreshold: Number(e.target.value) })}
                className="input mt-1 w-full"
              />
            </div>
          </div>
          {msg && <p className="text-sm text-teal-600">{msg}</p>}
          <Button type="submit" variant="primary" loading={saving}>Save config</Button>
        </form>
      </Card>
    </div>
  );
}
