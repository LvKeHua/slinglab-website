import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import PageContainer from './components/layout/PageContainer';
import Dashboard from './pages/Dashboard';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

export default function App() {
  const loadFromBackend = useStore((s) => s.loadFromBackend);

  useEffect(() => { loadFromBackend(); }, [loadFromBackend]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/stone" element={<PageContainer />}>
          <Route index element={<Dashboard />} />
          <Route path="performance" element={<Performance />} />
          <Route path="analytics" element={<div className="text-cmm-muted p-12 text-center">Analytics page coming soon</div>} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/stone" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
