import { RefreshCw } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Sidebar from './Sidebar';

function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function PageContainer() {
  const lastUpdated = useStore((s) => s.lastUpdated);
  const syncing = useStore((s) => s.syncing);
  const syncFromExchange = useStore((s) => s.syncFromExchange);

  return (
    <div className="flex min-h-screen bg-cmm-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Sync bar - visible on all pages */}
        <div className="flex justify-end items-center gap-3 px-6 pt-3 pb-0">
          {lastUpdated && (
            <span className="text-xs text-cmm-muted/60">
              Last updated: {formatTime(lastUpdated)}
            </span>
          )}
          <button
            onClick={syncFromExchange}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium text-cmm-green hover:text-cmm-green/80 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync from Exchange'}
          </button>
        </div>
        <main className="flex-1 p-6 overflow-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
