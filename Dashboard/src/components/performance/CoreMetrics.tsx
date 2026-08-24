import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { filterTrades } from '../../types';
import MetricCard from '../common/MetricCard';

export default function CoreMetrics() {
  const closedTrades = useStore((s) => s.closedTrades);
  const filter = useStore((s) => s.filter);

  const filtered = useMemo(() => filterTrades(closedTrades, filter), [closedTrades, filter]);
  const wins = filtered.filter((t) => t.realisedPnl > 0);
  const losses = filtered.filter((t) => t.realisedPnl < 0);
  const totalPnl = filtered.reduce((s, t) => s + t.realisedPnl, 0);
  const winRate = filtered.length > 0 ? (wins.length / filtered.length * 100).toFixed(1) + '%' : '-';
  const avgR = filtered.length > 0 ? (filtered.reduce((s, t) => s + (t.rMultiple || 0), 0) / filtered.length).toFixed(2) : '-';
  const grossWin = wins.reduce((s, t) => s + t.realisedPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realisedPnl, 0));
  const pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : '-';

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <MetricCard label="Total P&L" value={'$' + totalPnl.toFixed(2)} color={totalPnl >= 0 ? '#00C897' : '#FF4D4F'} />
      <MetricCard label="Win Rate" value={winRate} />
      <MetricCard label="Avg R per Trade" value={avgR} />
      <MetricCard label="Profit Factor" value={pf} />
    </div>
  );
}
