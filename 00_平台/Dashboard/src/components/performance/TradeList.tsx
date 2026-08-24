import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { filterTrades } from '../../types';
import EmptyState from '../common/EmptyState';

type SortDir = 'asc' | 'desc';

export default function TradeList() {
  const closedTrades = useStore((s) => s.closedTrades);
  const filter = useStore((s) => s.filter);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => filterTrades(closedTrades, filter), [closedTrades, filter]);
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => sortDir === 'desc' ? b.realisedPnl - a.realisedPnl : a.realisedPnl - b.realisedPnl);
  }, [filtered, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  return (
    <div className="bg-cmm-card2 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Trade List ({filtered.length})</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cmm-card text-cmm-muted">
            {['Symbol', 'Dir', 'Size', 'Entry', 'Exit', 'Hold Time', 'Realised PNL', 'R'].map((c) => (
              <th
                key={c}
                className={`text-left py-2 px-3 font-medium text-xs uppercase tracking-wider ${c === 'Realised PNL' ? 'cursor-pointer select-none hover:text-cmm-text' : ''}`}
                onClick={c === 'Realised PNL' ? toggleSort : undefined}
              >
                {c} {c === 'Realised PNL' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={8}><EmptyState text="No closed trades" /></td></tr>
          ) : (
            sorted.map((t) => (
              <tr key={t.id} className="border-t border-cmm-border hover:bg-cmm-border/30">
                <td className="py-2 px-3 font-medium">{t.symbol}</td>
                <td className="py-2 px-3"><span className={t.dir === 'Long' ? 'text-cmm-green' : 'text-cmm-red'}>{t.dir}</span></td>
                <td className="py-2 px-3">{t.size}</td>
                <td className="py-2 px-3">${t.entry?.toLocaleString() ?? '-'}</td>
                <td className="py-2 px-3">${t.exit?.toLocaleString() ?? '-'}</td>
                <td className="py-2 px-3 text-cmm-muted">{t.holdTime}</td>
                <td className={`py-2 px-3 font-semibold ${t.realisedPnl >= 0 ? 'text-cmm-green' : 'text-cmm-red'}`}>
                  {t.realisedPnl >= 0 ? '+' : ''}{t.realisedPnl.toFixed(2)}
                </td>
                <td className="py-2 px-3">{t.rMultiple?.toFixed(1) ?? '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
