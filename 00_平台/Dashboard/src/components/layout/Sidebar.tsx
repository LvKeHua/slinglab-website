import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, PieChart, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

const MAIN_NAV = [
  { path: '/stone', label: 'Home', icon: LayoutDashboard },
  { path: '/stone/performance', label: 'Performance', icon: BarChart3 },
  { path: '/stone/analytics', label: 'Analytics', icon: PieChart },
];

export default function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);
  const location = useLocation();
  const navigate = useNavigate();
  const w = collapsed ? 'w-16' : 'w-56';

  const isActive = (path: string) =>
    path === '/stone'
      ? location.pathname === '/stone' || location.pathname === '/stone/'
      : location.pathname.startsWith(path);

  return (
    <aside className={`${w} transition-all duration-300 bg-cmm-card border-r border-cmm-border flex flex-col flex-shrink-0 h-screen sticky top-0`}>
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b border-cmm-border">
        {collapsed ? (
          <span className="text-cmm-green font-bold text-lg">C</span>
        ) : (
          <span className="text-cmm-green font-bold text-lg tracking-wider">CMM</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-1 p-2">
        {MAIN_NAV.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                active ? 'bg-cmm-green/20 text-cmm-green' : 'text-cmm-muted hover:bg-cmm-card2 hover:text-cmm-text'
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        {!collapsed && <div className="my-1 border-t border-cmm-border" />}

        {/* Settings */}
        <button
          onClick={() => navigate('/stone/settings')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            isActive('/stone/settings') ? 'bg-cmm-green/20 text-cmm-green' : 'text-cmm-muted hover:bg-cmm-card2 hover:text-cmm-text'
          }`}
        >
          <Settings size={20} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium truncate">Settings</span>}
        </button>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-cmm-border">
        <button
          onClick={toggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-cmm-muted hover:bg-cmm-card2 hover:text-cmm-text transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
