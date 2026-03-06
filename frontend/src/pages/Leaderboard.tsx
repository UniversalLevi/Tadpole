import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { api } from '../api/client';

type LeaderboardItem = { userId: string; value: number; rank: number };

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [metric, setMetric] = useState<'volume' | 'biggestWin' | 'wagered'>('volume');
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: LeaderboardItem[] }>(`/game/leaderboard?period=${period}&metric=${metric}`)
      .then((r) => setItems(r.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [period, metric]);

  if (user?.role === 'admin') {
    return (
      <div className="page-container">
        <p className="text-slate-600">Leaderboard is for players. <Link to="/admin" className="text-teal-600 hover:underline">Go to Admin</Link>.</p>
      </div>
    );
  }

  const metricLabel = metric === 'volume' ? 'Wagered' : metric === 'biggestWin' ? 'Biggest win' : 'Wagered';
  const valueLabel = metric === 'biggestWin' ? '₹' : '₹';

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
        <p className="mt-1 text-slate-600">Top players by {metricLabel.toLowerCase()}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-sm font-medium text-slate-700">Period:</span>
        {(['day', 'week'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${period === p ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {p === 'day' ? 'Today' : 'This week'}
          </button>
        ))}
        <span className="text-sm font-medium text-slate-700 ml-2">Metric:</span>
        {(['volume', 'biggestWin', 'wagered'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${metric === m ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {m === 'volume' ? 'Volume' : m === 'biggestWin' ? 'Biggest win' : 'Wagered'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500">No data for this period.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {items.map((item) => (
              <li key={item.userId} className="flex items-center justify-between py-3 first:pt-0">
                <span className="font-medium text-slate-700">#{item.rank}</span>
                <span className="text-slate-500 font-mono text-sm truncate max-w-[8rem]" title={item.userId}>
                  {item.userId.slice(-6)}
                </span>
                <span className="font-semibold text-teal-600">
                  {valueLabel}{item.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
