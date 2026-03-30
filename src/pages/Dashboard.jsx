import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Camera, AlertTriangle, CheckCircle, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Resolved(0)=Green, Processing(1)=Orange, Pending(2)=Red

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
     total_nvrs: 0,
     nvrs_offline: 0,
     total_cameras: 0,
     tickets_pending: 0,
     tickets_processing: 0,
     tickets_resolved: 0
  });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Func A: Lọc Dữ Liệu Lõi Thống Kê Array
  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/dashboard');
      const data = res.data?.data || res.data;
      if (data) {
         setStats({
            total_nvrs: data.infra?.total_devices || 0,
            nvrs_offline: data.infra?.devices_offline || 0,
            total_cameras: data.infra?.total_cameras || 0,
            tickets_pending: data.incidents?.pending || 0,
            tickets_processing: data.incidents?.processing || 0,
            tickets_resolved: data.incidents?.resolved || 0
         });
      }
    } catch (error) {
       console.error("Dashboard Stats Fetch Error:", error);
    }
  };

  // Func B: Rót Data vào Trạm 5 Dòng Tình Báo
  const fetchIncidents = async () => {
     try {
       const res = await api.get('/incidents?limit=5');
       setIncidents(res.data?.data || res.data || []);
     } catch (error) {
        console.error("Dashboard Incidents Fetch Error:", error);
     }
  };

  const loadAll = async () => {
     setLoading(true);
     await Promise.all([fetchStats(), fetchIncidents()]);
     setLoading(false);
  };

  useEffect(() => {
    loadAll();

    // =============== WEBSOCKET (HEARTBEAT) ===============
    // Phải cấu hình trích xuất Domain API nhưng xóa nhánh '/api' để lấy TCP IP Gốc
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    console.log("WebSocket Connecting to:", socketUrl);
    
    const socket = io(socketUrl, {
       auth: { token: localStorage.getItem('token') || '' },
       transports: ['websocket', 'polling'] 
    });

    socket.on('connect', () => {
       console.log('✅ Dashboard WS Connected. Target Locked:', socket.id);
    });

    socket.on('new_incident', (payload) => {
       console.warn("WS 🔔 [new_incident]:", payload);
       
       // Súng Nổ Cảnh Báo Giao Diện (Toast Custom Glass)
       toast.custom((t) => (
         <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass bg-red-500/15 border border-red-500/60 shadow-lg shadow-red-500/30 rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 relative overflow-hidden backdrop-blur-xl`}>
           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl z-0" />
           <div className="flex-1 w-0 p-4 relative z-10">
             <div className="flex items-start">
               <div className="flex-shrink-0 pt-0.5">
                 <ShieldAlert className="h-10 w-10 text-red-500 shadow-md animate-pulse" />
               </div>
               <div className="ml-3 flex-1">
                 <p className="text-sm font-black text-red-400 font-mono tracking-widest uppercase">⚠️ Tín Hiệu Nổ Lỗi Thiết Bị</p>
                 <p className="mt-1 text-sm text-slate-200 font-medium leading-snug">
                   {payload?.message || 'Hệ thống radar vừa soi được một nhánh thiết bị Mất Video Hàng Loạt hoặc Rụng Nguồn!'}
                 </p>
               </div>
             </div>
           </div>
           <div className="flex border-l border-slate-700/60 relative z-10">
             <button onClick={() => toast.dismiss(t.id)} className="w-full h-full p-4 flex items-center justify-center text-xs font-black tracking-widest text-slate-400 hover:text-white hover:bg-red-500/20 transition-all focus:outline-none">
               TẮT CÒI
             </button>
           </div>
         </div>
       ), { duration: 8000, id: 'ws_new_incident' });

       // Cực kì quan trọng: Phải Load lại Tình báo phía sau Lưng để Trạm Dashboard Đồng Bộ Ngay Lập Tức!
       fetchStats();
       fetchIncidents();
    });

    socket.on('device_status_change', (payload) => {
       console.warn("WS 📡 [device_status]:", payload);
       
       toast.custom((t) => (
         <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass bg-amber-500/15 border border-amber-500/60 shadow-lg shadow-amber-500/30 rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 relative overflow-hidden backdrop-blur-xl`}>
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl z-0" />
           <div className="flex-1 w-0 p-4 relative z-10">
             <div className="flex items-start">
               <div className="flex-shrink-0 pt-0.5">
                 <Server className="h-10 w-10 text-amber-500 shadow-md animate-pulse" />
               </div>
               <div className="ml-3 flex-1">
                 <p className="text-sm font-black text-amber-400 font-mono tracking-widest uppercase">📡 SÓNG TRẠM LÕI MẤT KẾT NỐI</p>
                 <p className="mt-1 text-sm text-slate-200 font-medium leading-snug">
                   Theo tín hiệu siêu âm, ID Trạm {payload?.device_id || 'UNKNOWN'} vừa bốc hơi ({payload?.message || 'Báo Offline'}).
                 </p>
               </div>
             </div>
           </div>
           <div className="flex border-l border-slate-700/60 relative z-10">
             <button onClick={() => toast.dismiss(t.id)} className="w-full h-full p-4 flex items-center justify-center text-xs font-black tracking-widest text-slate-400 hover:text-white hover:bg-amber-500/20 transition-all focus:outline-none">
               RÕ
             </button>
           </div>
         </div>
       ), { duration: 6000, id: 'ws_dev_status' });

       // Trạm NVR đứt nét -> Số lượng TỔNG NVR OFFLINE sẽ bị thay đổi
       fetchStats();
    });

    return () => {
       socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-primary">
        <div className="w-16 h-16 rounded-full border-[6px] border-primary/20 border-t-primary animate-spin mb-4 shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
        <div className="font-mono tracking-[0.3em] font-bold text-sm animate-pulse">BOOTING RADAR...</div>
      </div>
    );
  }

  // Khớp Array màu thủ công với Data PieChart (Resolved/Processing/Pending)
  const pieData = [
    { name: 'Xanh Chín', value: stats.tickets_resolved },     // Green
    { name: 'Đang Code/Xử lý', value: stats.tickets_processing }, // Orange
    { name: 'Chờ Treo (Lửa)', value: stats.tickets_pending },    // Red
  ];

  return (
    <div className="text-white animate-fade-in-up space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-black tracking-tight mb-0.5 flex items-center font-mono">
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary drop-shadow-md">
             RADAR CHỈ HUY TRẠM V-SEC
           </span>
           <span className="ml-4 text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> SOCKET LIVE
           </span>
        </h1>
        <p className="text-slate-400 text-sm font-medium">Bản đồ Giám sát Nhãn quan Số. Tự động Rung sóng Còi báo khi Nhận Diện Lỗi Cháy chập mạng Tầng 1 (Live Real-time).</p>
      </div>

      {/* KPI CARDS KHỐI A */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Tổng NVR */}
        <div onClick={() => navigate('/devices')} className="glass p-6 rounded-2xl border border-blue-500/20 flex flex-col justify-between group cursor-pointer hover:border-blue-500/50 transition-all shadow-lg hover:shadow-[0_4px_25px_rgba(59,130,246,0.15)] relative overflow-hidden h-[150px]">
          <div className="flex justify-between items-start z-10">
            <p className="text-[11px] text-blue-300 font-bold tracking-widest uppercase opacity-80 mt-1">QUY MÔ NVR</p>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Server className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto">
             <h3 className="text-[2.75rem] leading-none font-black font-mono tracking-widest text-white drop-shadow-lg flex items-end">
               {stats.total_nvrs}
             </h3>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/25 transition-colors z-0" />
        </div>

        {/* Card 2: NVR SỤP NGUỒN */}
        <div onClick={() => navigate('/devices')} className={`glass p-6 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all shadow-lg h-[150px] relative overflow-hidden ${stats.nvrs_offline > 0 ? 'border border-red-500/60 shadow-[0_4px_30px_rgba(239,68,68,0.25)]' : 'border border-slate-700/50 hover:border-slate-500'}`}>
          <div className="flex justify-between items-start z-10">
            <p className={`text-[11px] font-bold tracking-widest uppercase mt-1 ${stats.nvrs_offline > 0 ? 'text-red-300' : 'text-slate-400'}`}>TRỤ NVR BÁO CỨNG</p>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${stats.nvrs_offline > 0 ? 'bg-red-500/20 border-red-500/40 text-red-500 shadow-inner' : 'bg-slate-800/80 border-slate-700 text-slate-500'}`}>
              <Cpu className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto flex items-end justify-between">
             <h3 className={`text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg ${stats.nvrs_offline > 0 ? 'text-red-500 animate-[bounce_1s_infinite]' : 'text-slate-500'}`}>
               {stats.nvrs_offline}
             </h3>
             {stats.nvrs_offline > 0 && <span className="text-[10px] font-black tracking-widest text-red-100 bg-red-500/30 border border-red-500/50 px-2 py-1 rounded shadow-md mb-2">NGẮT ĐIỆN TÍNH</span>}
          </div>
          {stats.nvrs_offline > 0 && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl transition-colors z-0" />}
        </div>

        {/* Card 3: TỔNG CAMERA */}
        <div onClick={() => navigate('/cameras')} className="glass p-6 rounded-2xl border border-primary/20 flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-all shadow-lg hover:shadow-[0_4px_25px_rgba(6,182,212,0.15)] relative overflow-hidden h-[150px]">
          <div className="flex justify-between items-start z-10">
            <p className="text-[11px] text-primary/80 font-bold tracking-widest uppercase mt-1">SÓNG LƯỚI KHÁCH</p>
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto">
             <h3 className="text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg text-white flex items-end">
               {stats.total_cameras}
             </h3>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/25 transition-colors z-0" />
        </div>

        {/* Card 4: TICKETS PENDING */}
        <div className={`glass p-6 rounded-2xl flex flex-col justify-between transition-all shadow-lg h-[150px] relative overflow-hidden ${stats.tickets_pending > 0 ? 'border border-amber-500/60 shadow-[0_4px_30px_rgba(245,158,11,0.25)]' : 'border border-slate-700/50'}`}>
          <div className="flex justify-between items-start z-10">
            <p className={`text-[11px] font-bold tracking-widest uppercase mt-1 ${stats.tickets_pending > 0 ? 'text-amber-300' : 'text-slate-400'}`}>HỒ SƠ MỤC PENDING</p>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${stats.tickets_pending > 0 ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-inner' : 'bg-slate-800/80 border-slate-700 text-slate-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto flex items-end justify-between">
             <h3 className={`text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg ${stats.tickets_pending > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
               {stats.tickets_pending}
             </h3>
             {stats.tickets_pending > 0 && <span className="text-[10px] font-black tracking-widest text-amber-100 bg-amber-500/30 border border-amber-500/50 px-2 py-1 rounded shadow-md mb-2 animate-pulse">CHỜ KTV ỨNG CỨU</span>}
          </div>
          {stats.tickets_pending > 0 && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl transition-colors z-0 animate-[pulse_3s_ease-in-out_infinite]" />}
        </div>

      </div>

      {/* HAI KHỐI CỘT BÊN DƯỚI */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        
        {/* Cột Trái (Biểu Đồ Tròn) chiếm 4 phần - Rất Đẹp Theo Giao Diện UI Pro */}
        <div className="xl:col-span-4 glass p-8 rounded-3xl border border-slate-700/60 flex flex-col shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-900/40 min-h-[440px]">
          <h3 className="text-sm font-black mb-6 flex items-center text-slate-200 uppercase tracking-[0.15em]">
            <div className="w-2 h-6 bg-blue-500 rounded-sm mr-3"></div>
            Đánh Giá Tỉ Lệ Đỏ Trắng
          </h3>
          <div className="flex-1 w-full flex items-center justify-center relative my-4">
            {(stats.tickets_pending === 0 && stats.tickets_resolved === 0 && stats.tickets_processing === 0) ? (
              <div className="text-slate-500 text-sm flex flex-col items-center">
                <CheckCircle className="w-16 h-16 mb-4 text-green-500/20 drop-shadow-md" />
                <span className="font-mono tracking-widest opacity-80 text-xs">NO TICKETS FOUND. CLEAN.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                     <filter id="dropshadow" height="130%">
                        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.5"/>
                     </filter>
                  </defs>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={125}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                    style={{ filter: 'url(#dropshadow)' }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(51, 65, 85, 0.8)', borderRadius: '1rem', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                    itemStyle={{ fontWeight: '900', letterSpacing: '0.05em' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Chữ Số Đè Lên Giữa Tâm */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-2xl">
                <span className="text-[3.5rem] leading-none font-black font-mono tracking-tighter text-white drop-shadow-lg mb-1">
                  {stats.tickets_resolved + stats.tickets_pending + stats.tickets_processing}
                </span>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 opacity-80">TỔNG VÉ ĐẦU RA</span>
            </div>
          </div>
          
          {/* Box Chú Giải (Legend) */}
          <div className="mt-auto grid grid-cols-3 gap-0 bg-[#0f172a] rounded-xl border border-slate-700/80 p-1.5 shadow-inner">
            <div className="flex flex-col items-center justify-center text-center p-3">
              <span className="w-3.5 h-3.5 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] mb-2.5"></span>
              <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.1em] leading-tight text-center">CHỜ XỬ LÝ (PENDING)</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-3 border-l border-r border-slate-700/50">
              <span className="w-3.5 h-3.5 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] mb-2.5"></span>
              <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.1em] leading-tight text-center">ĐANG VÁ (PROCESSING)</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-3">
              <span className="w-3.5 h-3.5 bg-green-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] mb-2.5"></span>
              <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.1em] leading-tight text-center">ĐÃ HỘI PHỤC (RESOLVED)</span>
            </div>
          </div>
        </div>

        {/* Cột Phải (Incident Board) chiếm 8 phần */}
        <div className="xl:col-span-8 glass p-0 rounded-3xl border border-slate-700/60 flex flex-col shadow-2xl overflow-hidden bg-slate-900/60 min-h-[440px]">
          <div className="p-7 px-8 bg-gradient-to-r from-red-500/10 via-slate-900/40 to-slate-900/40 border-b border-slate-700/80 flex justify-between items-center z-10">
            <h3 className="text-[14px] font-black flex items-center text-red-400 uppercase tracking-widest drop-shadow-md">
              <ShieldAlert className="w-5 h-5 mr-3 opacity-90" />
              Tình Báo Lỗi: Bảng 5 Sự Cố Phát Sinh Mới Nhất Dưới Radar
            </h3>
            <span className="flex items-center text-[10px] text-slate-300 font-black tracking-widest uppercase bg-rose-900/30 px-3 py-1.5 rounded border border-rose-500/30 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></span> LUỒNG ĐIỆN TÍNH MỞ
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
             {incidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10">
                   <CheckCircle className="w-20 h-20 text-green-500/10 mb-6 drop-shadow-md" />
                   <p className="text-slate-400 font-bold tracking-[0.1em] uppercase text-sm">Hồ Sơ Toàn Mạng Sạch Nhẵn. Không Có Bất Kỳ Vết Rách Nào!</p>
                </div>
             ) : (
                <ul className="space-y-4">
                   {incidents.map((incident, idx) => {
                      const isPending = incident.status === 'pending';
                      const isProcessing = incident.status === 'processing';
                      const badgeColor = isPending ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_4px_10px_rgba(239,68,68,0.1)]' : (isProcessing ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_4px_10px_rgba(245,158,11,0.1)]' : 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_4px_10px_rgba(16,185,129,0.1)]');

                      return (
                         <li key={idx} className="group glass bg-slate-800/20 hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 hover:border-slate-500 transition-all flex items-start gap-5 cursor-pointer shadow-md hover:shadow-xl" onClick={() => incident.device_id && navigate(`/devices/${incident.device_id}`)}>
                            <div className="shrink-0 mt-0.5">
                               {isPending ? <AlertTriangle className="w-6 h-6 text-red-500 drop-shadow-md" /> : (isProcessing ? <Activity className="w-6 h-6 text-amber-500 drop-shadow-md" /> : <ShieldAlert className="w-6 h-6 text-slate-500" />)}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/30">
                                  <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded border ${badgeColor}`}>
                                     {incident.status || 'UNKNOWN TICKET'}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-500/80">
                                     TIME: {new Date(incident.created_at).toLocaleString('vi-VN')}
                                  </span>
                               </div>
                               <p className="text-[15px] font-bold text-slate-200 line-clamp-2 leading-relaxed opacity-90 pr-10">
                                  {incident.error_type || 'Error_Type bị null. Mất Tín hiệu Nặng / Đứt cáp chìm...'}
                               </p>
                               {incident.device_id && (
                                  <p className="text-xs text-slate-500 mt-3 font-mono font-bold flex items-center bg-slate-900/50 w-max px-3 py-1.5 rounded-lg border border-slate-700/50 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                     <Server className="w-3.5 h-3.5 mr-2" /> TỪ NVR: #{incident.device_id}
                                     <ArrowRight className="w-3.5 h-3.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </p>
                               )}
                            </div>
                         </li>
                      );
                   })}
                </ul>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
