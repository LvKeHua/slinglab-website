import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { filterTrades } from '../../types';

export default function DetailStats() {
  const closedTrades = useStore((s) => s.closedTrades);
  const filter = useStore((s) => s.filter);

  const stats = useMemo(() => {
    const filtered = filterTrades(closedTrades, filter);
    const wins = filtered.filter((t) => t.realisedPnl > 0);
    const losses = filtered.filter((t) => t.realisedPnl < 0);
    const totalPnl = filtered.reduce((s, t) => s + t.realisedPnl, 0);
    const winRate = filtered.length > 0 ? (wins.length / filtered.length * 100) : 0;
    const avgR = filtered.length > 0 ? filtered.reduce((s, t) => s + (t.rMultiple || 0), 0) / filtered.length : 0;
    const grossWin = wins.reduce((s, t) => s + t.realisedPnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0));
    const avgW = wins.length > 0 ? wins.reduce((s, t) => s + t.realisedPnl, 0) / wins.length : 0;
    const avgL = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0)) / losses.length : 0;
    const lg = wins.length > 0 ? Math.max(...wins.map((t) => t.realisedPnl)) : 0;
    const ll = losses.length > 0 ? Math.min(...losses.map((t) => t.realisedPnl)) : 0;

    let mw = 0, ml = 0, cw = 0, cl = 0;
    filtered.forEach((t) => {
      if (t.realisedPnl > 0) { cw++; cl = 0; mw = Math.max(mw, cw); }
      else { cl++; cw = 0; ml = Math.max(ml, cl); }
    });

    return [
      { label: 'Total Trades', val: String(filtered.length) },
      { label: 'Avg Win', val: avgW > 0 ? '$' + avgW.toFixed(2) : '-' },
      { label: 'Winning Trades', val: String(wins.length) },
      { label: 'Avg Loss', val: avgL > 0 ? '$' + avgL.toFixed(2) : '-' },
      { label: 'Losing Trades', val: String(losses.length) },
      { label: 'Largest Win', val: lg > 0 ? '$' + lg.toFixed(2) : '-' },
      { label: 'Win Rate (%)', val: winRate.toFixed(1) + '%' },
      { label: 'Largest Loss', val: ll < 0 ? '$' + ll.toFixed(2) : '-' },
      { label: 'Avg R per Trade', val: avgR > 0 ? avgR.toFixed(2) : '-' },
      { label: 'Max Consecutive Wins', val: String(mw) },
      { label: 'Profit Factor', val: grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : '-' },
      { label: 'Max Consecutive Losses', val: String(ml) },
    ];
  }, [closedTrades, filter]);

  return (
    <div className="bg-cmm-card2 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3">Detailed Statistics</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between py-1.5 border-b border-cmm-border/50 text-sm">
            <span className="text-cmm-muted">{s.label}</span>
            <span className="font-semibold">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
