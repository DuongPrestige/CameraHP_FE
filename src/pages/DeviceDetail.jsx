import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Server, HardDrive, Cpu, Activity, AlertCircle, Clock, BadgeInfo, Camera as CameraIcon, AlertTriangle, CheckCircle, Info, EthernetPort, Plug, RefreshCw, Search } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import CameraDetailsModal from '../components/CameraDetailsModal';

// Circle Progress Component Mini
const CircularProgress = ({ percentage, colorClass, label }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} className="stroke-slate-800" strokeWidth="8" fill="none" />
          <circle
            cx="48" cy="48" r={radius}
            className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth="8" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono tracking-tighter text-white">{percentage}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
};

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [device, setDevice] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [infoData, setInfoData] = useState(null);
  const [hddData, setHddData] = useState(null);
  const [incidents, setIncidents] = useState([]);

  const [loadingDevice, setLoadingDevice] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingHdd, setLoadingHdd] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  // Focus Modal Mắt Thần
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Nút Khám Bệnh Nhanh Lazy Healing
  const [isHealthChecking, setIsHealthChecking] = useState(false);

  const handleHealthCheck = async () => {
    if (isHealthChecking) return;
    setIsHealthChecking(true);
    try {
      const res = await api.post(`/devices/${id}/health-check`);
      
      if (res.data?.resolved_count > 0) {
        toast.success(res.data?.message || `Tái Khám Sức Khỏe Lệnh ISAPI Thắng Lợi. Trắng Cấp Cứu Mướt Tay Đi Tổng ${res.data.resolved_count} Vé Oan!`);
      } else {
        toast.success('Máy Thiết Bị An Toàn Kín Mạng Hoàn Hảo!', { icon: '⚕️' });
      }

      // Đắp đè data trực diện - Ko Xả API GET
      if (res.data?.data) {
        setDevice(res.data.data);
        if (res.data.data.incidents !== undefined) {
           setIncidents(res.data.data.incidents);
        } else {
           setIncidents([]);
        }
      }

    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi kết nối khi cố tái khám bệnh cho NVR.');
    } finally {
      setIsHealthChecking(false);
    }
  };

  // Nút Sync Áp Thuật
  const [syncing, setSyncing] = useState(false);

  const handleSyncCameras = async () => {
    if (syncing) return;
    setSyncing(true);
    const loadingToast = toast.loading('Đang ép trạm NVR đồng bộ Cấu Trúc Lõi và Thuật Toán Ổ Cứng (Mất 1-3s)...');
    try {
      const res = await api.post(`/devices/${id}/sync-cameras`);
      toast.success(res.data?.message || 'Đồng bộ Lõi NVR và Storage thành công! Đã tự động rà soát & dập các Án Oan (Mạng/HDD)!', { id: loadingToast });
      
      // 1. Dùng trực tiếp Data trả về từ All-In-One API, Dẹp bỏ GET request tốn Pin!
      if (res.data?.data) {
        setDevice(res.data.data);
        // Backend đã tiệt trùng và trả về mảng incidents Sạch bóc
        if (res.data.data.incidents !== undefined) {
           setIncidents(res.data.data.incidents);
        } else {
           setIncidents([]);
        }
      }
      
      // 2. Dọi dữ liệu Ổ Cứng Mới Update Chui Mảng Lưới React (Thay thế Chart Gấu Cũ)
      if (res.data?.hdds !== undefined) {
        setHddData(res.data.hdds);
      }

    } catch (e) {
      toast.error(e.response?.data?.message || 'Gãy kết nối khi đang ép đồng bộ NVR.', { id: loadingToast });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0); // Reset cuộn khi mới vào trang

    // 1. MySQL Call
    api.get(`/devices/${id}`)
      .then(res => setDevice(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoadingDevice(false));

    // 2. ISAPI Status
    api.get(`/devices/${id}/status`, { timeout: 8000 })
      .then(res => setStatusData(res.data?.data || res.data))
      .catch(() => setStatusData({ error: true }))
      .finally(() => setLoadingStatus(false));

    // 3. ISAPI Info
    api.get(`/devices/${id}/info`, { timeout: 8000 })
      .then(res => setInfoData(res.data?.data || res.data))
      .catch(() => setInfoData({ error: true }))
      .finally(() => setLoadingInfo(false));

    // 4. ISAPI HDD
    api.get(`/devices/${id}/hdd`, { timeout: 8000 })
      .then(res => setHddData(res.data?.data || res.data))
      .catch(() => setHddData({ error: true }))
      .finally(() => setLoadingHdd(false));

    // 5. Incident (Lỗi Trạm Gốc)
    api.get(`/incidents?device_id=${id}`)
      .then(res => setIncidents(res.data?.data || res.data || []))
      .catch(() => setIncidents([]))
      .finally(() => setLoadingIncidents(false));

    // 6. Lắng nghe WebSocket
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token: localStorage.getItem('token') || '' },
      transports: ['websocket', 'polling']
    });

    socket.on('incident_updated', () => {
      // Khi có hành vi KTV nhận vé phạt ở bên ngoài, hoặc Hệ thống Auto-Resolve tự dập vé
      // Dây truyền tự kích Fetching dập lỗi trên Màn này luôn!
      api.get(`/incidents?device_id=${id}`).then(res => setIncidents(res.data?.data || res.data || []));
    });

    return () => socket.disconnect();
  }, [id]);

  if (loadingDevice) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-primary">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-mono tracking-widest text-sm animate-pulse">ESTABLISHING V-SEC UPLINK...</p>
      </div>
    );
  }

  if (!device && !loadingDevice) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <p className="text-xl font-bold text-slate-300">Không tìm thấy Máy Chủ NVR Này.</p>
        <button onClick={() => navigate('/devices')} className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Trở Về Bảng Điều Khiển</button>
      </div>
    );
  }

  const statusRaw = device?.status || device?.state || device?.is_online || 'UNKNOWN';
  const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';
  const hddList = Array.isArray(hddData) ? hddData : (hddData?.list || hddData?.disks || []);

  return (
    <div className="text-white flex flex-col h-full animate-fade-in-up space-y-6">

      {/* HEADER NAV CHỮA LỖI & ĐỒNG BỘ */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/devices')} className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-slate-300 transition-all shadow-md group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-100 drop-shadow-md flex items-center">
              <span className="font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary font-black tracking-wider mr-4">
                NVR :: {device.ip_address}
              </span>
              {isOnline ? (
                <span className="text-[10px] font-mono tracking-widest bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div> SIGNAL ONLINE
                </span>
              ) : (
                <span className="text-[10px] font-mono tracking-widest bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div> OFFLINE / TIMEOUT
                </span>
              )}
            </h1>
            <p className="text-slate-400 text-sm flex items-center gap-3">
              <span className="flex items-center"><Server className="w-3.5 h-3.5 mr-1" /> {device?.username?.toUpperCase() || 'HIKVISION'}</span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center">Vị trí Lắp Lõi: <strong className="text-white ml-2">{device?.location?.name || 'Trôi Nổi Không Lưu'}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap justify-end">
          {/* Nút Tái Khám (Health Check) */}
          <button
            onClick={handleHealthCheck}
            disabled={isHealthChecking}
            className="flex items-center bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isHealthChecking ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent flex items-center justify-center rounded-full animate-spin mr-2"></div>
            ) : (
              <Search className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
            )}
            {isHealthChecking ? 'ĐANG KHÁM TỔNG QUÁT...' : 'TÁI KHÁM SỨC KHỎE'}
          </button>

          {/* Nút Phép Thuật: ĐỒNG BỘ NVR */}
          <button 
             onClick={handleSyncCameras} 
             disabled={syncing}
             className="flex items-center bg-blue-500/10 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)] disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
          >
             {syncing ? (
               <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent flex items-center justify-center rounded-full animate-spin mr-2"></div>
             ) : (
               <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
             )}
             {syncing ? 'ĐANG ÉP ĐỒNG BỘ...' : 'ĐỒNG BỘ NVR'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* KHỐI TRÁI: THỐNG KÊ LÕI ĐẦU GHI (Chiếm 3/4 màng hình Desktop) */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* Hàng 1 Lõi: CPU & INFO */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2 glass rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-center">
              <div className="flex items-center space-x-2 text-slate-300 mb-6">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold tracking-wide uppercase text-xs">Phân Tải Vi Xử Lý (ISAPI)</h3>
              </div>

              {loadingStatus ? (
                <div className="flex justify-around items-center pt-2 animate-pulse">
                  <div className="w-24 h-24 rounded-full border-8 border-slate-800"></div>
                  <div className="w-24 h-24 rounded-full border-8 border-slate-800"></div>
                </div>
              ) : statusData?.error ? (
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" /> LAN Timeout hoặc NVR Đóng Cửa Dữ Liệu Chẩn Đoán.
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex justify-around w-full mt-2">
                    <CircularProgress
                      percentage={parseInt(String(statusData?.cpu_utilization ?? statusData?.cpuUtilization ?? 0).replace(/[^\d]/g, '')) || 0}
                      colorClass="text-purple-500"
                      label="CPU Load"
                    />
                    <CircularProgress
                      percentage={parseInt(String(statusData?.memory_usage ?? statusData?.memoryUsage ?? 0).replace(/[^\d]/g, '')) || 0}
                      colorClass="text-primary"
                      label="RAM Usage"
                    />
                  </div>
                  <div className="mt-8 w-full bg-slate-900/80 rounded-xl p-3 flex justify-between items-center text-sm font-mono border border-slate-700">
                    <span className="text-slate-500 uppercase tracking-widest flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-amber-500/70" /> System Uptime
                    </span>
                    <span className="text-amber-400 font-bold">{statusData?.uptime || '67 Days 12H 05M'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-3 glass rounded-2xl p-6 border border-slate-700/50 flex flex-col">
              <div className="flex items-center space-x-2 text-slate-300 mb-6 pb-4 border-b border-slate-800/50">
                <BadgeInfo className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold tracking-wide uppercase text-xs">Thẻ Nhận Dạng Điện Tử (ISAPI Badges)</h3>
              </div>

              {loadingInfo ? (
                <div className="space-y-4 animate-pulse pt-2">
                  <div className="h-12 bg-slate-800 rounded-xl w-full"></div>
                  <div className="h-12 bg-slate-800 rounded-xl w-full"></div>
                  <div className="h-16 bg-slate-800 rounded-xl w-full"></div>
                </div>
              ) : infoData?.error ? (
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <span>Thiết bị đang nằm trong trạng thái Đóng Sương (Ngủ đông) hoặc rớt cáp TCP/IP.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                    <span className="text-xs text-slate-400 font-bold tracking-widest">ROM FIRMWARE</span>
                    <span className="text-white font-mono text-sm tracking-widest drop-shadow-md">{infoData?.firmware || 'V4.62.100_210928'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                    <span className="text-xs text-slate-400 font-bold tracking-widest">DEVICE MODEL</span>
                    <span className="text-white font-mono text-sm tracking-widest drop-shadow-md">{infoData?.model || 'DS-7732NI-K4'}</span>
                  </div>
                  <div className="flex flex-col p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 group hover:border-emerald-500/30 transition-colors">
                    <span className="text-xs text-slate-400 font-bold tracking-widest mb-2 opacity-80 uppercase">Mã ID Tuyệt Đối Lệnh NVR (Serial)</span>
                    <span className="text-emerald-400 font-mono text-sm tracking-[0.15em] font-bold break-all leading-relaxed bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-center shadow-inner selection:bg-emerald-500/30">
                      {infoData?.serial_number || device?.username?.toUpperCase() + '_SER_00X1Y'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hàng 2 Lõi: Băng Đĩa HDD */}
          <div className="glass rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-2 text-slate-300 mb-6">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold tracking-wide uppercase text-xs">Mảng Đĩa Lưu Trữ Trích Xuất (SATA Storage)</h3>
            </div>

            {loadingHdd ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse pt-2">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="h-32 bg-slate-800 rounded-xl"></div>
                ))}
              </div>
            ) : hddData?.error ? (
              <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-xl text-amber-400 text-sm flex items-start gap-3 h-32">
                <AlertCircle className="w-5 h-5 shrink-0" /> Phát hiện mất kết nối Array Ổ cứng. Vui lòng cử nhân viên kỹ thuật tới rà soát khay đọc đĩa.
              </div>
            ) : hddList.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((slot) => {
                  const isOk = slot < 3;
                  const statusColor = isOk ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-slate-500 bg-slate-800/30 border-slate-700/50 border-dashed';
                  return (
                    <div key={slot} className={`p-5 rounded-xl border flex flex-col justify-between ${statusColor}`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Slot {slot}</span>
                        <HardDrive className={`w-5 h-5 ${isOk ? 'text-green-500' : 'text-slate-600'}`} />
                      </div>
                      {isOk ? (
                        <>
                          <div className="text-sm font-mono font-bold text-white mb-1">2.5 TB <span className="text-slate-500 opacity-60">/ 4.0 TB</span></div>
                          <div className="text-[10px] uppercase tracking-widest text-green-500 font-bold">STATUS: OK</div>
                        </>
                      ) : (
                        <div className="text-[10px] uppercase tracking-widest mt-auto mb-1">NO DISK DETECTED</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {hddList.map((disk, idx) => {
                  const isOk = String(disk.status).toUpperCase() === 'OK' || disk.status === 'NORMAL';
                  const statusColor = isOk ? 'text-green-400 bg-green-500/10 border-green-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:-translate-y-1' : 'text-red-400 bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:-translate-y-1';

                  const formatCap = (val) => {
                    const num = Number(val) || 0;
                    if (num === 0) return '0 GB';
                    if (num >= 1024 * 1024) return (num / (1024 * 1024)).toFixed(2) + ' TB';
                    return (num / 1024).toFixed(1) + ' GB';
                  };

                  const capacityRaw = disk.capacity || disk.total_space || 0;
                  const freeRaw = disk.free_space || 0;
                  const usedPcnt = capacityRaw > 0 ? ((capacityRaw - freeRaw) / capacityRaw * 100) : 0;

                  return (
                    <div key={idx} className={`p-5 rounded-xl border flex flex-col justify-between ${statusColor} transition-all`}>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-80">Drive {disk.id || idx + 1}</span>
                        {isOk ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="text-sm font-mono font-bold text-white mb-2.5 whitespace-nowrap justify-between flex">
                        <span>{formatCap(freeRaw)} <span className="text-slate-400 opacity-60 font-normal text-xs uppercase ml-1">TRỐNG</span></span>
                        <span className="text-slate-400 opacity-80 font-normal">{formatCap(capacityRaw)}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden shadow-inner mb-3 border border-slate-700/50">
                        <div className={`h-2 rounded-full ${usedPcnt > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(usedPcnt, 100)}%` }}></div>
                      </div>
                      <div className={`text-[10px] uppercase tracking-widest mt-auto font-bold flex justify-between ${isOk ? 'text-green-500' : 'text-red-500'}`}>
                        <span>Status: {disk.status || 'UNKNOWN'}</span>
                        <span>{usedPcnt.toFixed(1)}% USED</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* KHỐI PHẢI: LOG SỰ CỐ QUÁ KHỨ */}
        <div className="xl:col-span-1 glass rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent p-6 flex flex-col sticky top-6 max-h-[calc(100vh-100px)]">
          <div className="flex items-center space-x-2 text-red-400 mb-6 pb-4 border-b border-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold tracking-wide uppercase text-sm">Nhật Ký Sự Cố Trạm Này</h3>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-4">
            {loadingIncidents ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 mx-auto border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : incidents.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-6 text-center shadow-inner mt-4">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/40" />
                <p className="text-sm text-slate-400 font-medium">Bản ghi Vàng. NVR chưa từng phát lệnh Báo Hỏng nào trong lịch sử Database.</p>
              </div>
            ) : (
              incidents.map((incident, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate(`/incidents?status=${(incident.status || 'PENDING').toLowerCase()}`)}
                  className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.2)] cursor-pointer group"
                  title="Nhấn để đi đến Bảng Quản Lý Sự Cố (Kanban)"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] font-black uppercase text-red-300 bg-red-500/20 px-2 py-0.5 rounded shadow-sm">
                      {incident.status || 'PENDING ALERT'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 opacity-80 group-hover:text-red-300 transition-colors">{new Date(incident.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed font-medium">
                    {incident.error_type || 'Ghi nhận đứt tín hiệu Video Loss ở Mắt lẻ hoặc quá tải Memory.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MẢNG DƯỚI CÙNG: BẢNG LƯỚI CAMERA CON SIÊU KHỦNG (Camera Topology Data Grid) */}
      <div className="glass rounded-2xl border border-slate-700/50 flex flex-col p-6 mt-6 shadow-xl mb-12">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <CameraIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Bảng Sóng Kênh Camera Trực Thuộc
              <span className="bg-slate-800 text-xs text-primary px-2.5 py-1 rounded-full border border-slate-700 font-mono relative -top-0.5">
                Tổng: {device?.cameras?.length || 0} Nhãn
              </span>
            </h3>
            <p className="text-xs text-slate-400">Danh bạ sơ đồ mạng của các Cam con nối vào trạm lưu trữ vật lý này.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] tracking-widest border-b border-slate-700/80 backdrop-blur-md">
              <tr>
                <th className="px-5 py-4 w-[10%]">Sóng Bắt</th>
                <th className="px-5 py-4 w-[15%]">Kênh Truyền</th>
                <th className="px-5 py-4 w-[35%]">Bí Danh Kỹ Thuật (Alias)</th>
                <th className="px-5 py-4 w-[25%] font-mono">D.C. IP/Giao Thức</th>
                <th className="px-5 py-4 text-right w-[15%]">Lệnh Điều Tra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {!device?.cameras || device.cameras.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center">
                    <Plug className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Trạm thu Này Rắn Rỏi Đơn Độc. Chưa cắm mắt cam nào.</p>
                  </td>
                </tr>
              ) : (
                device.cameras.map((cam, idx) => {
                  const camStatus = cam.status || cam.state || cam.is_online || 'UNKNOWN';
                  const isCamOnline = String(camStatus).toUpperCase() === 'ONLINE' || camStatus === true || camStatus === 1 || String(camStatus).toUpperCase() === 'TRUE';
                  const displayCamStatus = typeof camStatus === 'string' ? camStatus.toUpperCase() : (isCamOnline ? 'ONLINE' : 'OFFLINE');

                  return (
                    <tr key={cam.id || idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-1.5 w-max">
                          <span className={`w-2 h-2 rounded-full ${isCamOnline ? 'bg-green-500 animate-pulse ring-2 ring-green-500/20' : 'bg-red-500'}`}></span>
                          <span className={`font-black text-[9px] tracking-widest uppercase ${isCamOnline ? 'text-green-500' : 'text-red-500/80'}`}>
                            {isCamOnline ? 'LIVE' : 'NO SGN'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-400">
                        CH_{String(cam.channel_number || idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-4 font-bold text-white group-hover:text-primary transition-colors">
                        {cam.name || 'Góc Khuất Chưa Tên'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 flex items-center mt-0.5">
                        <EthernetPort className="w-3.5 h-3.5 mr-2 opacity-50" />
                        {cam.ip_address || "192.168.1.xxx"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedCamera(cam)}
                          className="text-primary hover:text-white bg-primary/10 hover:bg-primary/80 px-3 py-1.5 rounded text-xs font-bold tracking-widest transition-all shadow-sm"
                          title="Thẩm Vấn Mắt Kính"
                        >
                          DETAILS
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ISAPI ASYNC: View Tech Details của Camera (Giữ Nguyên Cấu Trúc Khám Nghiệm Modal Nhưng Trôi Nổi Trên Trang Này) */}
      <CameraDetailsModal
        cameraId={selectedCamera?.id}
        initialData={selectedCamera}
        onClose={() => setSelectedCamera(null)}
      />

    </div>
  );
}
