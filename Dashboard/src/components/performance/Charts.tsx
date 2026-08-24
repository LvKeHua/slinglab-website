import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { useStore } from '../../store/useStore';
import { filterTrades } from '../../types';

export default function Charts() {
  const closedTrades = useStore((s) => s.closedTrades);
  const filter = useStore((s) => s.filter);

  const { dailyData, cumulativeData } = useMemo(() => {
    const filtered = filterTrades(closedTrades, filter);

    // Aggregate by date for bar chart
    const dayMap: Record<string, number> = {};
    filtered.forEach((t) => {
      const day = t.date || t.holdTime;
      dayMap[day] = (dayMap[day] || 0) + t.realisedPnl;
    });

    const sortedDays = Object.keys(dayMap).sort();
    const daily = sortedDays.map((day) => ({ day, pnl: Math.round(dayMap[day] * 100) / 100 }));

    // Build cumulative PnL (in date order)
    const cumArr: { day: string; cumulativePnl: number }[] = [];
    let cum = 0;
    filtered
      .slice()
      .sort((a, b) => (a.date || a.holdTime).localeCompare(b.date || b.holdTime))
      .forEach((t) => {
        cum += t.realisedPnl;
        cumArr.push({ day: t.date || t.holdTime, cumulativePnl: Math.round(cum * 100) / 100 });
      });

    return { dailyData: daily, cumulativeData: cumArr };
  }, [closedTrades, filter]);

  if (dailyData.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-cmm-card2 rounded-lg p-4 flex items-center justify-center text-cmm-muted text-sm h-[280px]">No data for this period</div>
        <div className="bg-cmm-card2 rounded-lg p-4 flex items-center justify-center text-cmm-muted text-sm h-[280px]">No data for this period</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Bar chart — Daily P&L */}
      <div className="bg-cmm-card2 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Daily P&L</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyData}>
            <XAxis dataKey="day" tick={{ fill: '#9AA0A6', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9AA0A6', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="pnl" shape={(props: unknown) => {
              const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: { pnl: number } };
              const barHeight = Math.abs(height);
              const barY = height < 0 ? y - barHeight : y;
              return <rect x={x} y={barY} width={width} height={barHeight} fill={payload.pnl >= 0 ? '#00C897' : '#FF4D4F'} rx={2} />;
            }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart — Cumulative P&L */}
      <div className="bg-cmm-card2 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333842" />
            <XAxis dataKey="day" tick={{ fill: '#9AA0A6', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9AA0A6', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="cumulativePnl" stroke="#00C897" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
