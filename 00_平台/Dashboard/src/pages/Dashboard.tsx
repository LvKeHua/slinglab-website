import { useState } from 'react';
import Header from '../components/layout/Header';
import TabSwitch from '../components/common/TabSwitch';
import PositionsTable from '../components/dashboard/PositionsTable';
import AssetsTable from '../components/dashboard/AssetsTable';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';

export default function Dashboard() {
  const [tab, setTab] = useState('positions');

  return (
    <div>
      <Header />

      {/* Main content: left table + right analytics */}
      <div className="flex gap-6">
        {/* Left */}
        <div className="flex-1 space-y-6">
          <div className="bg-cmm-card2 rounded-lg p-5 shadow-sm">
            <TabSwitch
              tabs={[{ key: 'positions', label: 'Positions' }, { key: 'assets', label: 'Assets' }]}
              active={tab}
              onChange={setTab}
            />
            {tab === 'positions' ? <PositionsTable /> : <AssetsTable />}
          </div>
        </div>

        {/* Right analytics */}
        <div className="w-[340px] flex-shrink-0">
          <div className="bg-cmm-card2 rounded-lg p-4 shadow-sm">
            <AnalyticsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
