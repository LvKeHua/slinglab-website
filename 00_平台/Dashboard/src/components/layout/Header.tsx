import { TrendingDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Header() {
  const userName = useStore((s) => s.userName);
  const closedTrades = useStore((s) => s.closedTrades);
  const closedCount = closedTrades.length;
  const closedPnL = closedTrades.reduce((sum, t) => sum + t.realisedPnl, 0);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center py-3">
        <h1 className="text-lg font-semibold">Good Afternoon {userName}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-cmm-red/20 text-cmm-red text-xs font-semibold px-3 py-1.5 rounded-full">
            <TrendingDown size={14} />
            <span>Today, CMM trader bias is BEARISH</span>
          </div>
          <div className="text-sm text-cmm-muted">
            {closedCount} trades closed | ${closedPnL.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="border-b border-cmm-border" />
    </div>
  );
}
