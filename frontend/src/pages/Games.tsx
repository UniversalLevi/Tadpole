import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/ui/Card';

const PredictionGame = lazy(() => import('./Game'));
const AviatorGame = lazy(() => import('./Aviator'));

type TabId = 'prediction' | 'aviator';

export default function Games() {
  const { user } = useAuth();
  const { connected, reconnecting } = useSocket();
  const [params, setParams] = useSearchParams();

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const currentTab: TabId = (params.get('tab') === 'aviator' ? 'aviator' : 'prediction');

  function switchTab(next: TabId) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', next);
      return p;
    }, { replace: true });
  }

  const liveLabel = useMemo(
    () => (connected ? 'Live' : reconnecting ? 'Reconnecting…' : 'Connecting…'),
    [connected, reconnecting]
  );

  return (
    <div className="page-container overflow-x-hidden">
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Games</h1>
          <p className="mt-1 text-slate-600 text-sm">
            Switch between Number Prediction and Aviator crash game.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium min-h-[32px] inline-flex items-center ${
            connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {liveLabel}
        </span>
      </div>

      <Card className="mt-4">
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              currentTab === 'prediction'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => switchTab('prediction')}
          >
            Number Prediction
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
              currentTab === 'aviator'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => switchTab('aviator')}
          >
            Aviator (Crash)
          </button>
        </div>
        <div className="mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              </div>
            }
          >
            {currentTab === 'prediction' ? <PredictionGame /> : <AviatorGame />}
          </Suspense>
        </div>
      </Card>
    </div>
  );
}

