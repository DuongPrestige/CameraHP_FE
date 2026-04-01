import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { Camera, LayoutDashboard, MapPin, AlertTriangle, LogOut, Bell, Server } from 'lucide-react';
import { cn } from '../utils/cn';

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menu = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/locations', name: 'Locations', icon: MapPin },
    { path: '/devices', name: 'NVR Devices', icon: Server },
    { path: '/cameras', name: 'Cameras', icon: Camera },
    { path: '/incidents', name: 'Incidents', icon: AlertTriangle },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 glass flex flex-col z-20 border-r border-slate-700/50 shadow-2xl relative">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Camera className="w-5 h-5 text-slate-900" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-white">HÒA PHÁT HD</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "text-white bg-slate-800 border border-slate-700/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary/70")} />
                <span className="font-medium tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-slate-400 hover:text-danger w-full px-4 py-3 rounded-lg hover:bg-danger/10 transition-colors group"
          >
            <LogOut className="w-5 h-5 group-hover:text-danger" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Decorative background blur */}
        <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <header className="h-20 glass z-10 flex items-center justify-between px-8 border-b border-slate-700/50 bg-surface/50">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {menu.find(m => location.pathname.startsWith(m.path))?.name || 'Monitoring'}
          </h2>

          <div className="flex items-center space-x-8">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              {/* Fake notification dot */}
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger rounded-full animate-pulse ring-2 ring-surface"></span>
            </button>
            <div className="flex items-center space-x-4 pl-8 border-l border-slate-700/50">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-white">
                  {user?.username || 'Operator'}
                </span>
                <span className="text-xs text-slate-400 border border-slate-700 bg-slate-800 rounded px-1.5 py-0.5 mt-0.5 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 p-[2px]">
                <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.username?.charAt(0).toUpperCase() || 'O'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
