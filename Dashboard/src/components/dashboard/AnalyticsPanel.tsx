import { useMemo } from 'react';
import { useStore } from '../../store/useStore';

export default function AnalyticsPanel() {
  const positions = useStore((s) => s.positions);
  const assets = useStore((s) => s.assets);
  const closedTrades = useStore((s) => s.closedTrades);

  const metrics = useMemo(() => {
    const posPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const astPnl = assets.reduce((s, a) => s + a.pnl, 0);
    const closedPnl = closedTrades.reduce((s, t) => s + t.realisedPnl, 0);
    const totalGainLoss = posPnl + astPnl + closedPnl;
    const netWorth = 50834.07 + totalGainLoss;

    const gains = closedTrades.filter((t) => t.realisedPnl > 0);
    const losses = closedTrades.filter((t) => t.realisedPnl < 0);
    const avgDailyGain = gains.length > 0 ? gains.reduce((s, t) => s + t.realisedPnl, 0) / (closedTrades.length || 1) : 0;
    const largestGain = gains.length > 0 ? Math.max(...gains.map((t) => t.realisedPnl)) : 0;
    const avgTradesDay = closedTrades.length > 0 ? closedTrades.length / 7 : 0;
    const avgTradeLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.realisedPnl), 0) / losses.length : 0;

    let mw = 0, ml = 0, cw = 0, cl = 0;
    closedTrades.forEach((t) => {
      if (t.realisedPnl > 0) { cw++; cl = 0; mw = Math.max(mw, cw); }
      else { cl++; cw = 0; ml = Math.max(ml, cl); }
    });

    const tradeExpectancy = closedTrades.length > 0 ? closedPnl / closedTrades.length : 0;
    const avgDailyVolume = closedTrades.length > 0 ? closedTrades.reduce((s, t) => s + parseFloat(t.size || '0'), 0) / 7 : 0;
    const totalVol = closedTrades.reduce((s, t) => s + parseFloat(t.size || '0'), 0);
    const avgTradeWin = gains.length > 0 ? gains.reduce((s, t) => s + t.realisedPnl, 0) / gains.length : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.realisedPnl)) : 0;

    return {
      netWorth, totalGainLoss, avgDailyGain, largestGain, avgTradesDay,
      avgTradeLoss, maxConsecutiveWin: mw, tradeExpectancy, avgDailyVolume,
      totalTradesVolume: totalVol, avgTradeWin, maxConsecutiveLoss: ml, largestLoss,
    };
  }, [positions, assets, closedTrades]);

  const items = [
    { label: 'Total Gain/Loss', val: metrics.totalGainLoss, fmt: '$' + metrics.totalGainLoss.toFixed(2) },
    { label: 'Avg Daily Gain', val: metrics.avgDailyGain, fmt: '$' + metrics.avgDailyGain.toFixed(2) },
    { label: 'Largest Gain', val: metrics.largestGain, fmt: '$' + metrics.largestGain.toFixed(2) },
    { label: 'Avg # of Trades/day', val: metrics.avgTradesDay, fmt: metrics.avgTradesDay > 0 ? metrics.avgTradesDay.toFixed(1) : '-' },
    { label: 'Avg Trade Loss', val: metrics.avgTradeLoss, fmt: metrics.avgTradeLoss > 0 ? '$' + metrics.avgTradeLoss.toFixed(2) : '-' },
    { label: 'Max Consecutive Win', val: metrics.maxConsecutiveWin, fmt: metrics.maxConsecutiveWin > 0 ? String(metrics.maxConsecutiveWin) : '-' },
    { label: 'Trade Expectancy', val: metrics.tradeExpectancy, fmt: '$' + metrics.tradeExpectancy.toFixed(2) },
    { label: 'Avg Daily Volume', val: metrics.avgDailyVolume, fmt: metrics.avgDailyVolume > 0 ? metrics.avgDailyVolume.toFixed(1) : '-' },
    { label: 'Total Trades Volume', val: metrics.totalTradesVolume, fmt: metrics.totalTradesVolume > 0 ? metrics.totalTradesVolume.toFixed(1) : '-' },
    { label: 'Avg Trade Win', val: metrics.avgTradeWin, fmt: metrics.avgTradeWin > 0 ? '$' + metrics.avgTradeWin.toFixed(2) : '-' },
    { label: 'Max Consecutive Loss', val: metrics.maxConsecutiveLoss, fmt: metrics.maxConsecutiveLoss > 0 ? String(metrics.maxConsecutiveLoss) : '-' },
    { label: 'Largest Losses', val: metrics.largestLoss, fmt: metrics.largestLoss < 0 ? '$' + metrics.largestLoss.toFixed(2) : '-' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold">Analytics</h2>
        <span className="text-xs text-cmm-muted bg-cmm-card px-2 py-0.5 rounded">This Week</span>
      </div>
      <div className="mb-3">
        <div className="text-xs text-cmm-muted uppercase tracking-wider mb-0.5">Total net worth</div>
        <div className="text-3xl font-bold text-cmm-gold">${metrics.netWorth.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => {
          const color = m.val > 0 ? 'text-cmm-green' : m.val < 0 ? 'text-cmm-red' : 'text-cmm-muted';
          return (
            <div key={m.label} className="bg-cmm-card rounded-lg p-2">
              <div className="text-[11px] text-cmm-muted mb-0.5 truncate">{m.label}</div>
              <div className={`text-sm font-semibold ${color}`}>{m.fmt}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
