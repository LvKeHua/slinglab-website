import { useStore } from '../../store/useStore';
import EmptyState from '../common/EmptyState';

export default function AssetsTable() {
  const assets = useStore((s) => s.assets);

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Assets ({assets.length})</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cmm-card text-cmm-muted">
            {['Asset', 'Amount', 'Avg Entry', 'Current Price', 'Value (USDT)', 'PnL', 'Spread'].map((c) => (
              <th key={c} className="text-left py-2.5 px-2 font-medium text-xs uppercase tracking-wider">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.length === 0 ? (
            <tr><td colSpan={7}><EmptyState text="No Assets" /></td></tr>
          ) : (
            assets.map((a, i) => (
              <tr key={a.asset || i} className="border-t border-cmm-border hover:bg-cmm-border/30">
                <td className="py-2.5 px-2 font-medium">{a.asset}</td>
                <td className="py-2.5 px-2">{a.amount}</td>
                <td className="py-2.5 px-2">${a.avgEntry.toLocaleString()}</td>
                <td className="py-2.5 px-2">${a.currentPrice.toLocaleString()}</td>
                <td className="py-2.5 px-2">${a.value.toLocaleString()}</td>
                <td className={`py-2.5 px-2 font-semibold ${a.pnl >= 0 ? 'text-cmm-green' : 'text-cmm-red'}`}>
                  {a.pnl >= 0 ? '+' : ''}{a.pnl.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-cmm-muted">--</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
