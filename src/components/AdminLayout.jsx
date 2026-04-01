import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { Camera, LayoutDashboard, MapPin, AlertTriangle, LogOut, Bell, Server, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // ----- GIAO THỨC ALARM TOÀN CỤC (GLOBAL SOCKET NOTIFICATIONS) -----
  useEffect(() => {
    if (!user) return; // Chỉ active ổ cắm khi đã login

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token: localStorage.getItem('token') || '' },
      transports: ['websocket', 'polling']
    });

    socket.on('new_incident', (payload) => {
      // 1. Phóng Màn Hình Đỏ Xuyên Không
      toast.custom((t) => (
        <div 
          onClick={() => {
            toast.dismiss(t.id);
            navigate('/dashboard');
          }}
          className={`${t.visible ? 'animate-enter' : 'animate-leave'} cursor-pointer hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-shadow max-w-md w-full glass bg-red-500/15 border border-red-500/60 shadow-lg shadow-red-500/30 rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 relative overflow-hidden backdrop-blur-xl`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl z-0" />
          <div className="flex-1 w-0 p-4 relative z-10">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <ShieldAlert className="h-10 w-10 text-red-500 shadow-md animate-pulse" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-red-400 font-mono tracking-widest uppercase">⚠️ {payload?.detail || 'Còi Báo Động Mới Nhất'}</p>
                <p className="mt-1 text-sm text-slate-200 font-medium leading-snug">
                  Hệ thống ghi nhận Sự cố Rớt Mạng / Ngoại Tuyến mới. Vui lòng kiểm tra Bảng Radar Chống Nhiễu!
                </p>
                <p className="text-[10px] text-red-300 font-mono mt-2 flex items-center gap-1 opacity-80"><AlertTriangle className="w-3 h-3" /> CLICK HERE TO VIEW RADAR</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 8000, id: 'global_ws_new_incident' });

      // 2. Kích Hoạt Loa Báo
      try {
        const beep = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/9JWAAACf/2Q==');
        beep.play().catch(e => { });
      } catch (e) { }
    });

    socket.on('device_status_change', (payload) => {
      toast.error(
        <div 
          onClick={() => {
            toast.dismiss('global_ws_device_offline');
            navigate('/dashboard');
          }}
          className="cursor-pointer"
        >
          BÁO ĐỘNG ĐỎ: Trạm NVR {payload?.ip || ''} MẤT KẾT NỐI TỔNG! <br/>
          <span className="text-xs opacity-80 decoration-solid underline mt-1 block">Click về Dashboard để xem Radar</span>
        </div>, 
      {
        icon: '⚡',
        style: { background: 'rgba(239, 68, 68, 0.95)', color: '#fff', fontWeight: 'bold' },
        id: 'global_ws_device_offline'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);
  // -------------------------------------------------------------

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
