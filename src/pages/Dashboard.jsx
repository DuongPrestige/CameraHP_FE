import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Camera, AlertTriangle, CheckCircle, ShieldAlert, Cpu, Play, Check, Database, VideoOff } from 'lucide-react';
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
     cameras_offline: 0,
     tickets_pending: 0,
     tickets_processing: 0,
     tickets_resolved: 0
  });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Func A: Lấy Dữ Liệu Lõi Thống Kê đúng chuẩn
  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/dashboard');
      const data = res.data?.data || res.data;
      if (data) {
         setStats({
            total_nvrs: Number(data.infra?.devices_total) || 0,
            nvrs_offline: Number(data.infra?.devices_offline) || 0,
            total_cameras: Number(data.infra?.cameras_total) || 0,
            cameras_offline: Number(data.infra?.cameras_offline) || 0,
            tickets_pending: Number(data.incidents?.pending) || 0,
            tickets_processing: Number(data.incidents?.processing) || 0,
            tickets_resolved: Number(data.incidents?.resolved) || 0
         });
      }
    } catch (error) {
       console.error("Dashboard Stats Fetch Error:", error);
    }
  };

  // Func B: Lấy Bảng Trực Ban Còi Lỗi Nghiệp Vụ
  const fetchIncidents = async () => {
     try {
       const res = await api.get('/incidents?status=PENDING&limit=10');
       const dt = res.data?.data || res.data || [];
       
       setIncidents(dt);
     } catch (error) {
        console.error("Dashboard Incidents Fetch Error:", error);
     }
  };

  const loadAll = async () => {
     setLoading(true);
     await Promise.all([fetchStats(), fetchIncidents()]);
     setLoading(false);
  };

  // Workflow KTV: Gắp Lỗi Mạng Tại Chỗ
  const handleUpdateTicketStatus = async (e, incidentId, newStatus) => {
    e.stopPropagation(); 
    try {
       const body = { status: newStatus };
       if (newStatus === 'resolved') {
          body.resolve_note = "Xử lý khẩn cấp thông qua Màn Hình Dashboard Tổng Cục.";
       }
       await api.put(`/incidents/${incidentId}`, body);
       toast.success(`Hệ thống Ghi Nhận: Chuyển thẻ phạt #${incidentId} thành ${newStatus.toUpperCase()}`, { icon: newStatus === 'resolved' ? '✅' : '🛠️' });
       
       fetchIncidents();
       fetchStats();
    } catch (error) {
       toast.error(`Từ Chối Thao Tác: ${error.response?.data?.message || 'Lỗi Máy Chủ'}`, { icon: '❌' });
    }
  };

  useEffect(() => {
    loadAll();

    // =============== WEBSOCKET (HEARTBEAT) ===============
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const socket = io(socketUrl, {
       auth: { token: localStorage.getItem('token') || '' },
       transports: ['websocket', 'polling'] 
    });

    socket.on('connect', () => {
       console.log('✅ Dashboard WS Connected.');
    });

    socket.on('new_incident', (payload) => {
       toast.custom((t) => (
         <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass bg-red-500/15 border border-red-500/60 shadow-lg shadow-red-500/30 rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 relative overflow-hidden backdrop-blur-xl`}>
           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl z-0" />
           <div className="flex-1 w-0 p-4 relative z-10">
             <div className="flex items-start">
               <div className="flex-shrink-0 pt-0.5">
                 <ShieldAlert className="h-10 w-10 text-red-500 shadow-md animate-pulse" />
               </div>
               <div className="ml-3 flex-1">
                 <p className="text-sm font-black text-red-400 font-mono tracking-widest uppercase">⚠️ {payload?.detail || 'Còi Báo Động Mới Nhất'}</p>
                 <p className="mt-1 text-sm text-slate-200 font-medium leading-snug">
                   Sự cố mới vừa cập bến. Bảng lỗi Zero-Latency đang đồng bộ.
                 </p>
               </div>
             </div>
           </div>
         </div>
       ), { duration: 8000, id: 'ws_new_incident' });

       try{
          const beep = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/9JWAAACf/2Q==');
          beep.play().catch(e => {}); 
       } catch(e){}

       fetchStats();
       fetchIncidents();
    });

    socket.on('incident_updated', (payload) => {
       fetchStats();
       fetchIncidents();
    });

    socket.on('device_status_change', (payload) => {
       toast.error(`BÁO ĐỘNG ĐỎ: Thiết bị NVR ${payload?.ip || ''} vừa MẤT KẾT NỐI MẠNG!`, {
         icon: '⚡',
         style: { background: 'rgba(239, 68, 68, 0.95)', color: '#fff', fontWeight: 'bold' }
       });
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

  const pieData = [
    { name: 'Xanh Chín', value: Number(stats.tickets_resolved) || 0 },
    { name: 'Đang Xử lý', value: Number(stats.tickets_processing) || 0 },
    { name: 'Chờ Treo (Lửa)', value: Number(stats.tickets_pending) || 0 },
  ];

  // Logic Tách Mảng Lỗi Đặc Biệt
  const badHddList = incidents.filter(ticket => 
      ticket.error_type?.toUpperCase().includes('HDD') || 
      ticket.error_type?.toUpperCase().includes('STORAGE')
  );

  const videoLossList = incidents.filter(ticket =>
      ticket.error_type?.toUpperCase().includes('VIDEOLOSS')
  );

  return (
    <div className="text-white animate-fade-in-up space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-black tracking-tight mb-0.5 flex items-center font-mono">
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary drop-shadow-md">
             TỔNG TRẠM V-SEC DASHBOARD
           </span>
           <span className="ml-4 text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> SOCKET LIVE
           </span>
        </h1>
        <p className="text-slate-400 text-sm font-medium border-l-2 border-primary/50 pl-3">Sở Chỉ Huy Thời Gian Thực - Mọi thiết bị trên Lưới đều đang được giám sát.</p>
      </div>

      {/* KPI CARDS KHỐI 1 (5 ITEM) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Card 1: Tổng NVR */}
        <div onClick={() => navigate('/devices')} className="glass p-5 xl:p-6 rounded-2xl border border-blue-500/20 flex flex-col justify-between group cursor-pointer hover:border-blue-500/50 transition-all shadow-lg relative overflow-hidden h-[150px]">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] xl:text-[11px] text-blue-300 font-bold tracking-widest uppercase opacity-80 mt-1">QUY MÔ ĐẦU GHI</p>
            <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Server className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto">
             <h3 className="text-[2rem] xl:text-[2.75rem] leading-none font-black font-mono tracking-widest text-white drop-shadow-lg flex items-end">
               {stats.total_nvrs}
             </h3>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/25 transition-colors z-0" />
        </div>

        {/* Card 2: NVR SỤP NGUỒN */}
        <div onClick={() => navigate('/devices')} className={`glass p-5 xl:p-6 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all shadow-lg h-[150px] relative overflow-hidden ${stats.nvrs_offline > 0 ? 'border border-red-500/60 shadow-[0_4px_30px_rgba(239,68,68,0.25)]' : 'border border-emerald-500/20 hover:border-emerald-500/50'}`}>
          <div className="flex justify-between items-start z-10">
            <p className={`text-[10px] xl:text-[11px] font-bold tracking-widest uppercase mt-1 ${stats.nvrs_offline > 0 ? 'text-red-300' : 'text-emerald-400/80'}`}>NVR MẤT MẠNG</p>
            <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${stats.nvrs_offline > 0 ? 'bg-red-500/20 border-red-500/40 text-red-500 shadow-inner' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
              <Cpu className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto flex items-end justify-between">
             <h3 className={`text-[2rem] xl:text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg ${stats.nvrs_offline > 0 ? 'text-red-500 animate-[bounce_1s_infinite]' : 'text-emerald-500'}`}>
               {stats.nvrs_offline}
             </h3>
          </div>
          {stats.nvrs_offline > 0 && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl transition-colors z-0" />}
        </div>

        {/* Card 3: TỔNG CAMERA */}
        <div onClick={() => navigate('/cameras')} className="glass p-5 xl:p-6 rounded-2xl border border-primary/20 flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-all shadow-lg relative overflow-hidden h-[150px]">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] xl:text-[11px] text-primary/80 font-bold tracking-widest uppercase mt-1">SÓNG LƯỚI CAMERA</p>
            <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto">
             <h3 className="text-[2rem] xl:text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg text-white flex items-end">
               {stats.total_cameras}
             </h3>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/25 transition-colors z-0" />
        </div>

        {/* Card 4: CAMERA MẤT MẠNG (TẮT) */}
        <div onClick={() => navigate('/cameras')} className={`glass p-5 xl:p-6 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all shadow-lg h-[150px] relative overflow-hidden ${stats.cameras_offline > 0 ? 'border border-amber-500/60 shadow-[0_4px_30px_rgba(245,158,11,0.25)]' : 'border border-emerald-500/20 hover:border-emerald-500/50'}`}>
          <div className="flex justify-between items-start z-10">
            <p className={`text-[10px] xl:text-[11px] font-bold tracking-widest uppercase mt-1 ${stats.cameras_offline > 0 ? 'text-amber-300' : 'text-emerald-400/80'}`}>MẮT CAM ĐANG TẮT</p>
            <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${stats.cameras_offline > 0 ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-inner animate-[pulse_2s_infinite]' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
              <VideoOff className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto flex items-end justify-between">
             <h3 className={`text-[2rem] xl:text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg ${stats.cameras_offline > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
               {stats.cameras_offline}
             </h3>
          </div>
          {stats.cameras_offline > 0 && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl transition-colors z-0" />}
        </div>

        {/* Card 5: TICKETS PENDING */}
        <div className={`glass p-5 xl:p-6 rounded-2xl md:col-span-1 xl:col-span-1 flex flex-col justify-between transition-all shadow-lg h-[150px] relative overflow-hidden ${stats.tickets_pending > 0 ? 'border border-rose-500/60 shadow-[0_4px_30px_rgba(244,63,94,0.25)]' : 'border border-slate-700/50'}`}>
          <div className="flex justify-between items-start z-10">
            <p className={`text-[10px] xl:text-[11px] font-bold tracking-widest uppercase mt-1 ${stats.tickets_pending > 0 ? 'text-rose-300' : 'text-slate-400'}`}>BÁO ĐỘNG (LỖI)</p>
            <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${stats.tickets_pending > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-500 shadow-inner animate-[spin_3s_linear_infinite]' : 'bg-slate-800/80 border-slate-700 text-slate-500'}`}>
              <AlertTriangle className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
          </div>
          <div className="z-10 mt-auto flex items-end justify-between">
             <h3 className={`text-[2rem] xl:text-[2.75rem] leading-none font-black font-mono tracking-widest drop-shadow-lg ${stats.tickets_pending > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
               {stats.tickets_pending}
             </h3>
          </div>
          {stats.tickets_pending > 0 && <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl transition-colors z-0" />}
        </div>

      </div>

      {/* KHU VỰC 2 & 3: GRID 12 CỘT TỔNG HỢP MỚI */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        
        {/* CỘT 1 (3 Phần): DANH SÁCH CAMERA CHẾT (VIDEOLOSS) */}
        <div className="xl:col-span-4 glass p-0 rounded-3xl border border-slate-700/60 flex flex-col shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-900/40 min-h-[380px]">
          <div className="p-4 px-6 bg-amber-500/10 border-b border-slate-700/80 flex items-center">
             <VideoOff className="w-5 h-5 text-amber-500 mr-2" />
             <h3 className="text-[13px] font-black text-amber-400 uppercase tracking-widest drop-shadow-md">Danh Sách Camera Chết</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {videoLossList.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-60">
                 <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                 <span className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">Phân Mảng Tín Hiệu Tốt</span>
               </div>
            ) : (
               <ul className="space-y-3">
                 {videoLossList.map(item => (
                   <li key={item.id} className="bg-slate-800/50 p-3 rounded-xl border border-amber-500/30 shadow-md relative overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]"></div>
                     <div className="flex justify-between items-start pl-2">
                        <div>
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-black tracking-widest mr-2">
                             {item.error_type}
                          </span>
                          <p className="text-xs text-slate-300 mt-2 font-medium">Đầu ghi Mẹ:</p>
                          <p className="font-mono text-white tracking-widest text-sm bg-slate-900 px-2 py-1 rounded inline-block border border-slate-700 mt-1">
                            {item.device?.ip_address || item.device_id || 'UNKNOWN-IP'}
                          </p>
                        </div>
                        <button onClick={(e) => handleUpdateTicketStatus(e, item.id, 'processing')} className="bg-amber-500/20 hover:bg-amber-500 hover:text-white text-amber-400 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                           <Play className="w-4 h-4" />
                        </button>
                     </div>
                   </li>
                 ))}
               </ul>
            )}
          </div>
        </div>

        {/* CỘT 2 (5 Phần): 🏥 SỨC KHỎE Ổ CỨNG (HDD HEALTH) GIỮA MÀN HÌNH */}
        <div className={`xl:col-span-5 glass rounded-3xl border flex flex-col shadow-2xl relative overflow-hidden transition-all duration-500 min-h-[380px] ${badHddList.length > 0 ? 'border-red-500/60 bg-red-900/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-emerald-500/30 bg-emerald-900/10'}`}>
          <div className={`p-4 px-6 border-b flex items-center justify-between ${badHddList.length > 0 ? 'bg-red-500/20 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
             <div className="flex items-center">
               <Database className={`w-5 h-5 mr-3 ${badHddList.length > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
               <h3 className={`text-[14px] font-black uppercase tracking-widest drop-shadow-md ${badHddList.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Sức Khỏe Ổ Cứng Toàn Tập</h3>
             </div>
             {badHddList.length === 0 && <CheckCircle className="w-6 h-6 text-emerald-400" />}
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {badHddList.length === 0 ? (
               <div className="animate-fade-in-up">
                 <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
                    <ShieldAlert className="w-28 h-28 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] relative z-10" />
                 </div>
                 <h2 className="text-2xl font-black text-emerald-400 tracking-wider">100% XUẤT SẮC</h2>
                 <p className="text-emerald-500/70 font-mono tracking-widest mt-2">MỌI Ổ CỨNG ĐỀU TRONG TÌNH TRẠNG ỔN ĐỊNH</p>
               </div>
            ) : (
               <div className="w-full h-full flex flex-col animate-fade-in-up">
                 <div className="flex items-center justify-center mb-6">
                   <AlertTriangle className="w-16 h-16 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce" />
                   <div className="ml-4 text-left">
                     <h2 className="text-2xl sm:text-3xl font-black text-red-500 tracking-wider drop-shadow-lg leading-tight">CẢNH BÁO!<br/>CÓ {badHddList.length} Ổ CỨNG BỊ LỖI</h2>
                   </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar w-full bg-black/30 rounded-xl p-4 border border-red-500/30">
                    <p className="text-[10px] text-red-400/80 uppercase tracking-widest mb-3 font-bold border-b border-red-500/30 pb-2">Danh Sách Trạm Thiệt Hại (Chuẩn bị SATA Mới):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {badHddList.map(item => (
                         <div key={item.id} onClick={() => item.device_id && navigate(`/devices/${item.device_id}`)} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors">
                            <Database className="w-6 h-6 text-red-400 mb-2 opacity-80" />
                            <span className="font-mono text-white font-bold tracking-widest">{item.device?.ip_address || item.device_id || 'UNKNOWN'}</span>
                            <span className="text-[8px] bg-red-600 px-2 py-0.5 rounded text-white font-black mt-2 uppercase text-center xl:break-normal">{item.error_type}</span>
                         </div>
                       ))}
                    </div>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* CỘT 3 (3 Phần): BIỂU ĐỒ PIE CHART */}
        <div className="xl:col-span-3 glass p-6 rounded-3xl border border-slate-700/60 flex flex-col shadow-2xl relative overflow-hidden bg-slate-900/40 min-h-[380px]">
          <h3 className="text-[12px] font-black mb-4 flex items-center text-slate-300 uppercase tracking-widest text-center justify-center">
            Biểu Đồ Trạng Thái Tổng
          </h3>
          <div className="flex-1 w-full flex items-center justify-center relative my-2">
            {(stats.tickets_pending === 0 && stats.tickets_resolved === 0 && stats.tickets_processing === 0) ? (
              <div className="text-slate-500 text-sm flex flex-col items-center">
                <CheckCircle className="w-12 h-12 mb-3 text-emerald-500/20" />
                <span className="font-mono tracking-widest opacity-80 text-[9px] bg-emerald-500/10 px-2 py-1 text-emerald-400 rounded-full border border-emerald-500/30">MẠNG SẠCH</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(51, 65, 85, 0.8)', borderRadius: '1rem', color: '#fff' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="mt-auto grid grid-cols-1 gap-1.5 font-mono">
            <div className="flex justify-between items-center text-xs bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
               <span className="flex items-center text-slate-300 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>PENDING</span>
               <span className="text-white font-bold">{stats.tickets_pending}</span>
            </div>
            <div className="flex justify-between items-center text-xs bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
               <span className="flex items-center text-slate-300 text-[10px]"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>PROCESSING</span>
               <span className="text-white font-bold">{stats.tickets_processing}</span>
            </div>
            <div className="flex justify-between items-center text-xs bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
               <span className="flex items-center text-slate-300 text-[10px]"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>RESOLVED</span>
               <span className="text-white font-bold">{stats.tickets_resolved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC 4: BẢNG LỖI NGHIỆP VỤ MAX SIZE (12 CỘT TỔNG HỢP) */}
      <div className="glass p-0 rounded-3xl border border-slate-700/60 flex flex-col shadow-2xl overflow-hidden bg-slate-900/60 max-h-[600px] mt-6">
        <div className="p-5 px-8 bg-gradient-to-r from-rose-500/10 via-slate-900/40 to-slate-900/40 border-b border-slate-700/80 flex justify-between items-center z-10 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
          <h3 className="text-[14px] font-black flex items-center text-rose-400 uppercase tracking-widest drop-shadow-md z-10">
            <ShieldAlert className="w-5 h-5 mr-3 opacity-90 animate-pulse" />
            TẤT CẢ SỰ CỐ GHI NHẬN (CẦN XỬ LÝ GẤP)
          </h3>
          <span className="flex items-center text-[10px] text-slate-300 font-black tracking-widest uppercase bg-rose-900/30 px-3 py-1.5 rounded border border-rose-500/30 shadow-inner z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] shadow-[0_0_10px_rgba(239,68,68,1)]"></span> LIVE DATA
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
           {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-70">
                 <CheckCircle className="w-16 h-16 text-emerald-400 mb-4 drop-shadow-md" />
                 <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm">Hệ Thống An Toàn Tuyệt Đối</p>
              </div>
           ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                 {incidents.map((incident, idx) => {
                    const isPending = incident.status === 'pending';
                    const isVidLoss = incident.error_type?.toUpperCase().includes('VIDEOLOSS');
                    const isHdd = incident.error_type?.toUpperCase().includes('HDD') || incident.error_type?.toUpperCase().includes('STORAGE');
                    
                    return (
                       <li key={incident.id || idx} className="group glass bg-slate-800/40 hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 hover:border-slate-500 transition-all shadow-md relative overflow-hidden flex flex-col justify-between">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPending ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500'}`}></div>
                          
                          <div className="pl-2">
                             <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded border flex items-center shadow-sm ${isVidLoss ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : isHdd ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                   <AlertTriangle className="w-3 h-3 mr-1.5" /> 
                                   {incident.error_type || 'INCIDENT'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded">
                                   {new Date(incident.created_at).toLocaleTimeString('vi-VN')}
                                </span>
                             </div>
                             
                             <div className="flex items-center mt-3 text-[14px]">
                                 <div className="text-slate-400 font-medium whitespace-nowrap mr-2">IP Thiết bị:</div>
                                 <div className="font-mono font-black text-white bg-black/40 border border-slate-700 px-3 py-1.5 rounded-md tracking-wider flex items-center shadow-inner group-hover:border-primary/50 transition-colors">
                                     <Server className="w-3 h-3 mr-2 opacity-70" />
                                     {incident.device?.ip_address || incident.device_id || 'CHƯA RÕ'}
                                 </div>
                             </div>
                          </div>
                          
                          <div className="mt-5 pt-4 border-t border-slate-700/50">
                             {isPending ? (
                                 <button 
                                    onClick={(e) => handleUpdateTicketStatus(e, incident.id, 'processing')}
                                    className="flex items-center justify-center w-full bg-red-600/20 hover:bg-red-500 font-black text-[11px] text-red-400 hover:text-white uppercase tracking-widest px-4 py-3 rounded-xl border border-red-500/40 transition-all shadow-md active:scale-95"
                                 >
                                    <Play className="w-4 h-4 mr-2" />
                                    XỬ LÝ NGAY
                                 </button>
                             ) : (
                                 <button 
                                    onClick={(e) => handleUpdateTicketStatus(e, incident.id, 'resolved')}
                                    className="flex items-center justify-center w-full bg-amber-500/20 hover:bg-green-500 font-black text-[11px] text-amber-400 hover:text-white uppercase tracking-widest px-4 py-3 rounded-xl border border-amber-500/40 transition-all shadow-md active:scale-95 group/btn"
                                 >
                                    <Check className="w-4 h-4 mr-2 group-hover/btn:text-white" />
                                    ĐÃ XONG
                                 </button>
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
  );
}
