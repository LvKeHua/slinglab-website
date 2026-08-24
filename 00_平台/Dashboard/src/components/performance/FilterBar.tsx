import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { filterTrades } from '../../types';
import type { Filter } from '../../types';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

export default function FilterBar() {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const closedTrades = useStore((s) => s.closedTrades);

  const filtered = useMemo(() => filterTrades(closedTrades, filter), [closedTrades, filter]);
  const wins = filtered.filter((t) => t.realisedPnl > 0).length;
  const grossWin = filtered.filter((t) => t.realisedPnl > 0).reduce((s, t) => s + t.realisedPnl, 0);
  const grossLoss = Math.abs(filtered.filter((t) => t.realisedPnl < 0).reduce((s, t) => s + t.realisedPnl, 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : '-';

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
              filter === f.key ? 'bg-cmm-green/20 text-cmm-green' : 'bg-cmm-card text-cmm-muted hover:text-cmm-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-4 text-sm text-cmm-muted">
        <span>Total Trades: <strong className="text-cmm-text">{filtered.length}</strong></span>
        <span>Win Rate: <strong className="text-cmm-green">{filtered.length > 0 ? (wins / filtered.length * 100).toFixed(1) + '%' : '-'}</strong></span>
        <span>Profit Factor: <strong className="text-cmm-text">{profitFactor}</strong></span>
      </div>
    </div>
  );
}
