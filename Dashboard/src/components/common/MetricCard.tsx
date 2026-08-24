interface Props {
  label: string;
  value: string;
  color?: string;
}

export default function MetricCard({ label, value, color }: Props) {
  return (
    <div className="bg-cmm-card2 rounded-lg p-5 shadow-sm">
      <div className="text-xs text-cmm-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color || '#E8EAED' }}>{value}</div>
    </div>
  );
}
