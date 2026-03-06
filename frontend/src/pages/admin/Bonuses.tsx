import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../api/client';

type Bonus = {
  _id: string;
  type: string;
  name: string;
  percentage: number;
  maxAmount: number;
  wagerMultiplier: number;
  expiryDate?: string;
  isActive: boolean;
  code?: string;
  maxRedemptions?: number;
};

export default function AdminBonuses() {
  const [list, setList] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'promo' as 'deposit_match' | 'cashback' | 'promo',
    name: '',
    percentage: 0,
    maxAmount: 0,
    wagerMultiplier: 0,
    code: '',
    maxRedemptions: undefined as number | undefined,
    expiryDate: '',
  });
  const [msg, setMsg] = useState('');

  function load() {
    api.get<Bonus[]>('/admin/bonuses').then((r) => setList(r.data)).catch(() => setList([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setCreating(true);
    api
      .post('/admin/bonuses', {
        type: form.type,
        name: form.name,
        percentage: form.percentage,
        maxAmount: form.maxAmount,
        wagerMultiplier: form.wagerMultiplier,
        code: form.code.trim() || undefined,
        maxRedemptions: form.maxRedemptions,
        expiryDate: form.expiryDate || undefined,
      })
      .then(() => {
        setForm({ ...form, name: '', code: '', maxAmount: 0, maxRedemptions: undefined, expiryDate: '' });
        setMsg('Bonus created');
        load();
      })
      .catch((err: { response?: { data?: { error?: string } } }) => setMsg(err.response?.data?.error || 'Create failed'))
      .finally(() => setCreating(false));
  }

  function toggleActive(id: string, isActive: boolean) {
    api.patch(`/admin/bonuses/${id}`, { isActive: !isActive }).then(() => load()).catch(() => {});
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-900">Bonuses & promo codes</h1>
      <p className="mt-1 text-slate-600">Create and manage promo codes and bonus templates.</p>

      <Card title="Create promo code" className="mt-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'promo' || v === 'deposit_match' || v === 'cashback') setForm({ ...form, type: v });
                }}
                className="input mt-1"
              >
                <option value="promo">Promo</option>
                <option value="deposit_match">Deposit match</option>
                <option value="cashback">Cashback</option>
              </select>
            </div>
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input mt-1 w-full"
                required
                placeholder="e.g. WELCOME50"
              />
            </div>
            <div>
              <label className="label">Code (for promo)</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="input mt-1 w-full"
                placeholder="PROMO50"
              />
            </div>
            <div>
              <label className="label">Max amount (₹)</label>
              <input
                type="number"
                min={0}
                value={form.maxAmount || ''}
                onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) || 0 })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">Wager multiplier</label>
              <input
                type="number"
                min={0}
                value={form.wagerMultiplier || ''}
                onChange={(e) => setForm({ ...form, wagerMultiplier: Number(e.target.value) || 0 })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="label">Max redemptions</label>
              <input
                type="number"
                min={0}
                value={form.maxRedemptions ?? ''}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : undefined })}
                className="input mt-1 w-full"
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div>
              <label className="label">Expiry (ISO date)</label>
              <input
                type="text"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="input mt-1 w-full"
                placeholder="2025-12-31T23:59:59Z"
              />
            </div>
          </div>
          {msg && <p className="text-sm text-amber-700">{msg}</p>}
          <Button type="submit" variant="primary" loading={creating}>Create</Button>
        </form>
      </Card>

      <Card title="All bonuses" className="mt-6">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">No bonuses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Code</th>
                  <th className="pb-2 pr-4">Max ₹</th>
                  <th className="pb-2 pr-4">Wager</th>
                  <th className="pb-2 pr-4">Active</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b._id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{b.type}</td>
                    <td className="py-2 pr-4">{b.name}</td>
                    <td className="py-2 pr-4 font-mono">{b.code || '—'}</td>
                    <td className="py-2 pr-4">{b.maxAmount}</td>
                    <td className="py-2 pr-4">{b.wagerMultiplier}x</td>
                    <td className="py-2 pr-4">{b.isActive ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      <Button type="button" variant="secondary" onClick={() => toggleActive(b._id, b.isActive)}>
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
