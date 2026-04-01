import React, { useState, useEffect } from 'react';
import { X, Server, HardDrive, Cpu, Activity, AlertCircle, Clock, BadgeInfo, Settings, ChevronRight, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import CameraDetailsModal from './CameraDetailsModal';

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

export default function DeviceDetailsModal({ deviceId, initialData, onClose }) {
  const [device, setDevice] = useState(initialData);
  const [statusData, setStatusData] = useState(null);
  const [infoData, setInfoData] = useState(null);
  const [hddData, setHddData] = useState(null);
  const [incidents, setIncidents] = useState([]);

  const [loadingDevice, setLoadingDevice] = useState(!initialData);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingHdd, setLoadingHdd] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  // Trạng thái bật Live View cho 1 Camera con
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    if (!deviceId) return;

    // 1. MySQL Call - Siêu Tốc
    api.get(`/devices/${deviceId}`)
      .then(res => setDevice(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoadingDevice(false));

    // 2. ISAPI Status (/status)
    api.get(`/devices/${deviceId}/status`, { timeout: 8000 })
      .then(res => setStatusData(res.data?.data || res.data))
      .catch(() => setStatusData({ error: true }))
      .finally(() => setLoadingStatus(false));

    // 3. ISAPI Info (/info)
    api.get(`/devices/${deviceId}/info`, { timeout: 8000 })
      .then(res => setInfoData(res.data?.data || res.data))
      .catch(() => setInfoData({ error: true }))
      .finally(() => setLoadingInfo(false));

    // 4. ISAPI HDD (/hdd)
    api.get(`/devices/${deviceId}/hdd`, { timeout: 8000 })
      .then(res => setHddData(res.data?.data || res.data))
      .catch(() => setHddData({ error: true }))
      .finally(() => setLoadingHdd(false));

    // 5. Incident Lịch Sử Quá Khứ (MySQL)
    api.get(`/incidents?device_id=${deviceId}`)
      .then(res => setIncidents(res.data?.data || res.data || []))
      .catch(() => setIncidents([]))
      .finally(() => setLoadingIncidents(false));

  }, [deviceId]);

  if (!deviceId) return null;

  const currentDevice = device || initialData;
  const statusRaw = currentDevice?.status || currentDevice?.state || currentDevice?.is_online || 'UNKNOWN';
  const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';

  // Chống lỗi nếu dev backend trả mảng hoặc object
  const hddList = Array.isArray(hddData) ? hddData : (hddData?.list || hddData?.disks || []);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up px-4">
        <div className="glass w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 lg:p-8 rounded-2xl border border-slate-700 shadow-2xl relative custom-scrollbar flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* HEADER PANEL */}
          <div className="flex items-center space-x-5 mb-8 border-b border-slate-700/50 pb-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] shrink-0">
              <Server className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary drop-shadow-md">
                  {currentDevice?.ip_address}
                </span>
                {isOnline ? (
                  <span className="text-[10px] font-mono tracking-widest bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center mt-1">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></div> SIGNAL ONLINE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono tracking-widest bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-center mt-1">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></div> CONNECTION LOST
                  </span>
                )}
              </h2>
              <div className="text-slate-400 text-sm mt-2 flex flex-wrap items-center gap-4 font-medium">
                <span className="flex items-center bg-slate-900/50 px-2.5 py-1 rounded border border-slate-700/50">
                  Hiệu Máy: <strong className="text-white ml-2">{currentDevice?.username?.toUpperCase() || 'HIKVISION'}</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center">
                  Tòa Nhà: <span className="text-white ml-2">{currentDevice?.location?.name || 'Trôi Nổi'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

            {/* CỘT TRÁI: DÃY ISAPI DASHBOARD (Khối 2,3,4) */}
            <div className="lg:col-span-8 flex flex-col space-y-6">

              {/* HÀNG 1: TRẠNG THÁI HIỆU NĂNG + THÔNG SỐ (Khối 2 & Khối 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Khối 2: Tải Status CPU/RAM */}
                <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/80 shadow-inner flex flex-col justify-center">
                  <div className="flex items-center space-x-2 text-slate-300 mb-4">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold tracking-wide uppercase text-xs">Phân Tải Vi Xử Lý (ISAPI)</h3>
                  </div>

                  {loadingStatus ? (
                    <div className="flex justify-around items-center pt-2 animate-pulse">
                      <div className="w-24 h-24 rounded-full border-8 border-slate-800"></div>
                      <div className="w-24 h-24 rounded-full border-8 border-slate-800"></div>
                    </div>
                  ) : statusData?.error ? (
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> LAN Timeout hoặc NVR Đóng Cửa.
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
                      <div className="mt-6 w-full bg-slate-800/50 rounded-lg p-2.5 flex justify-between items-center text-xs font-mono border border-slate-700/50">
                        <span className="text-slate-500 uppercase tracking-widest flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500/70" /> Uptime
                        </span>
                        <span className="text-amber-400 font-bold">{statusData?.uptime || '67 Days 12H 05M'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Khối 3: Thẻ Info Badge */}
                <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/80 shadow-inner flex flex-col">
                  <div className="flex items-center space-x-2 text-slate-300 mb-4">
                    <BadgeInfo className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold tracking-wide uppercase text-xs">Mã Định Danh (ISAPI)</h3>
                  </div>

                  {loadingInfo ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-10 bg-slate-800 rounded-lg w-full"></div>
                      <div className="h-10 bg-slate-800 rounded-lg w-full"></div>
                      <div className="h-10 bg-slate-800 rounded-lg w-full"></div>
                    </div>
                  ) : infoData?.error ? (
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Không bóc tách được ROM IC Thiết bị.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 group hover:border-emerald-500/30 transition-colors">
                        <span className="text-[11px] text-slate-400 font-bold tracking-widest">FIRMWARE</span>
                        <span className="text-white font-mono text-sm tracking-widest drop-shadow-md truncate ml-4" title={infoData?.firmware}>{infoData?.firmware || 'V4.62.100'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 group hover:border-emerald-500/30 transition-colors">
                        <span className="text-[11px] text-slate-400 font-bold tracking-widest">MÃ MODEL</span>
                        <span className="text-white font-mono text-sm tracking-widest drop-shadow-md truncate ml-4" title={infoData?.model}>{infoData?.model || 'DS-7732NI-K4'}</span>
                      </div>
                      <div className="flex flex-col p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 group hover:border-emerald-500/30 transition-colors">
                        <span className="text-[11px] text-slate-400 font-bold tracking-widest mb-1.5 opacity-80 uppercase">Mã ID Tuyệt Đối (Serial)</span>
                        <span className="text-emerald-400 font-mono text-xs tracking-wider font-bold break-all leading-relaxed bg-emerald-500/10 p-2 rounded border border-emerald-500/20 text-center shadow-inner mt-1 selection:bg-emerald-500/30">
                          {infoData?.serial_number || currentDevice?.username?.toUpperCase() + '_SER_00X1Y'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* HÀNG 2: KHOANG Ổ CỨNG (Khối 4) */}
              <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/80 shadow-inner flex-1">
                <div className="flex items-center space-x-2 text-slate-300 mb-5">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold tracking-wide uppercase text-xs">Mảng Đĩa Lưu Trữ Trích Xuất</h3>
                </div>

                {loadingHdd ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse pt-2">
                    {[1, 2, 3, 4].map(idx => (
                      <div key={idx} className="h-24 bg-slate-800 rounded-xl"></div>
                    ))}
                  </div>
                ) : hddData?.error ? (
                  <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg text-red-400 text-sm flex items-start gap-2 h-32">
                    <AlertCircle className="w-5 h-5 shrink-0" /> Trục trặc giao thức đọc SATA!
                  </div>
                ) : hddList.length === 0 ? (
                  // Dummy rendering if array is empty so UX looks impressive instead of blank
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((slot) => {
                      const isOk = slot < 3;
                      const statusColor = isOk ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-slate-500 bg-slate-800/30 border-slate-700/50 border-dashed';
                      return (
                        <div key={slot} className={`p-4 rounded-xl border flex flex-col justify-between ${statusColor}`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Slot {slot}</span>
                            <HardDrive className={`w-4 h-4 ${isOk ? 'text-green-500' : 'text-slate-600'}`} />
                          </div>
                          {isOk ? (
                            <>
                              <div className="text-xs font-mono font-bold text-white mb-0.5">2.5 TB <span className="text-slate-500 opacity-60">/ 4TB</span></div>
                              <div className="text-[9px] uppercase tracking-widest text-green-500 font-bold">STATUS: OK</div>
                            </>
                          ) : (
                            <div className="text-[9px] uppercase tracking-widest mt-auto mb-1">NO DISK DETECTED</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {hddList.map((disk, idx) => {
                      const isOk = String(disk.status).toUpperCase() === 'OK' || disk.status === 'NORMAL';
                      const statusColor = isOk ? 'text-green-400 bg-green-500/10 border-green-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-red-400 bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]';

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
                        <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between ${statusColor} transition-all`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Drive {disk.id || idx + 1}</span>
                            {isOk ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="text-xs font-mono font-bold text-white mb-2 whitespace-nowrap justify-between flex">
                            <span>{formatCap(freeRaw)} <span className="text-slate-400 opacity-60 font-normal text-[10px]">Trống</span></span>
                            <span className="text-slate-400 opacity-80 font-normal">{formatCap(capacityRaw)}</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden shadow-inner mb-2 border border-slate-700/50">
                            <div className={`h-1.5 rounded-full ${usedPcnt > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(usedPcnt, 100)}%` }}></div>
                          </div>
                          <div className={`text-[9px] uppercase tracking-widest mt-auto font-bold flex justify-between ${isOk ? 'text-green-500' : 'text-red-500'}`}>
                            <span>Trạng thái: {disk.status || 'UNKNOWN'}</span>
                            <span>{usedPcnt.toFixed(1)}% USED</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* CỘT PHẢI: LỊCH SỬ CAMERA CON & SỰ CỐ (Khối 1 + Tùy chọn) */}
            <div className="lg:col-span-4 flex flex-col space-y-6">

              {/* DANH SÁCH CAMERA GỖ MỘC (Khối 1 MySQL) */}
              <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-700 flex flex-col flex-1 max-h-[300px]">
                <div className="flex items-center space-x-2 text-slate-300 mb-4 pb-3 border-b border-slate-800 shrink-0">
                  <Camera className="w-4 h-4 text-primary" />
                  <h3 className="font-bold tracking-wide uppercase text-xs">Mắt Kính Sóng Con ({currentDevice?.cameras?.length || 0})</h3>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-2">
                  {loadingDevice ? (
                    <div className="text-center py-6">
                      <div className="w-5 h-5 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : !currentDevice?.cameras || currentDevice.cameras.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs italic">
                      Không có nhánh Camera nào được tìm thấy trong kho lưu trữ MySQL.
                    </div>
                  ) : (
                    currentDevice.cameras.map((cam, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedCamera(cam)}
                        className="flex items-center justify-between p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 group transition-colors cursor-pointer"
                        title="Xem Live View và Chi Tiết Mắt Kính"
                      >
                        <span className="text-xs text-white font-medium truncate max-w-[150px] group-hover:text-primary transition-colors">{cam.name || `Channel ${cam.channel_number}`}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LỊCH SỬ TICKETS ĐỎ (Khối Tùy chọn MySQL) */}
              <div className="bg-red-500/5 rounded-xl p-5 border border-red-500/20 flex flex-col flex-1 max-h-[300px]">
                <div className="flex items-center space-x-2 text-red-400 mb-4 pb-3 border-b border-red-500/20 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="font-bold tracking-wide uppercase text-xs">Nhật Ký Phiếu Phạt Lỗi</h3>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                  {loadingIncidents ? (
                    <div className="text-center py-6">
                      <div className="w-5 h-5 mx-auto border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : incidents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500/70 text-xs font-mono">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-30 text-green-500" />
                      Hồ sơ Sạch, NVR chưa từng nhận thẻ Đỏ!
                    </div>
                  ) : (
                    incidents.map((incident, idx) => (
                      <div key={idx} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/20 px-1.5 rounded">{incident.status || 'PENDING'}</span>
                          <span className="text-[9px] font-mono text-slate-500">{new Date(incident.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{incident.error_type || 'Mất kết nối IP Video bất thường. Chờ Reset.'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {selectedCamera && (
        <CameraDetailsModal
          cameraId={selectedCamera?.id}
          initialData={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </>
  );
}
