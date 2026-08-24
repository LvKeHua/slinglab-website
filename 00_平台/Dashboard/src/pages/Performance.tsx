import FilterBar from '../components/performance/FilterBar';
import CoreMetrics from '../components/performance/CoreMetrics';
import Charts from '../components/performance/Charts';
import DetailStats from '../components/performance/DetailStats';
import TradeList from '../components/performance/TradeList';

export default function Performance() {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Performance</h1>
      <FilterBar />
      <CoreMetrics />
      <Charts />
      <DetailStats />
      <TradeList />
    </div>
  );
}
