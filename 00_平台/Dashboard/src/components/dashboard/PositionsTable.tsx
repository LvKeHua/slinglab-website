import { useStore } from '../../store/useStore';
import EmptyState from '../common/EmptyState';

export default function PositionsTable() {
  const positions = useStore((s) => s.positions);

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Positions ({positions.length})</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-cmm-card text-cmm-muted">
            {['Symbol', 'Price', 'Amount', 'Entry', 'Account', 'Unrealised PNL'].map((c) => (
              <th key={c} className="text-left py-2.5 px-3 font-medium text-xs uppercase tracking-wider">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 ? (
            <tr><td colSpan={6}><EmptyState text="No Open Positions" /></td></tr>
          ) : (
            positions.map((p) => (
              <tr key={p.id} className="border-t border-cmm-border hover:bg-cmm-border/30">
                <td className="py-2.5 px-3 font-medium">{p.symbol}</td>
                <td className="py-2.5 px-3">${p.price}</td>
                <td className="py-2.5 px-3">{p.amount}</td>
                <td className="py-2.5 px-3">${p.entry}</td>
                <td className="py-2.5 px-3 text-cmm-muted">{p.account}</td>
                <td className={`py-2.5 px-3 font-semibold ${p.unrealizedPnl >= 0 ? 'text-cmm-green' : 'text-cmm-red'}`}>
                  {p.unrealizedPnl >= 0 ? '+' : ''}{p.unrealizedPnl.toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
