import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, MapPin, Server, Activity, AlertCircle, Clock, CheckCircle, AlertTriangle, ChevronRight, Hash } from 'lucide-react';
import { api } from '../services/api';

export default function CameraDetailsModal({ cameraId, initialData, onClose }) {
  const [camera, setCamera] = useState(initialData);
  const [incidents, setIncidents] = useState([]);

  const [loadingCam, setLoadingCam] = useState(!initialData);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  // Core Live View States
  const [streamName, setStreamName] = useState(null);
  const [streamUrls, setStreamUrls] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamMode, setStreamMode] = useState('main'); // main or sub

  // Focus Fetch
  useEffect(() => {
    if (!cameraId) return;

    // 1. Core MySQL Data
    api.get(`/cameras/${cameraId}`)
      .then(res => setCamera(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoadingCam(false));

    // 2. Incident Log
    api.get(`/incidents?camera_id=${cameraId}`)
      .then(res => setIncidents(res.data?.data || res.data || []))
      .catch(() => setIncidents([]))
      .finally(() => setLoadingIncidents(false));

  }, [cameraId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const currentCam = camera || initialData;
  const statusRaw = currentCam?.status || currentCam?.state || 'UNKNOWN';
  const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';

  useEffect(() => {
    let isMounted = true;
    let activeStream = null;

    // Chỉ kết nối khi có ID và Modal đang được mở hiển thị (mounted)
    if (mounted && cameraId && isOnline && currentCam?.device_id && currentCam?.channel_number) {
       setStreamLoading(true);
       api.post('/live/play', { 
         deviceId: currentCam.device_id, 
         channelId: currentCam.channel_number,
         streamType: streamMode 
       }).then(res => {
          if (res.data?.streamName && isMounted) {
             setStreamName(res.data.streamName);
             if (res.data.urls) setStreamUrls(res.data.urls);
             activeStream = res.data.streamName;
          } else if (res.data?.streamName) {
             api.delete('/live/stop?streamName=' + res.data.streamName).catch(()=>{});
          }
       }).catch(err => {
          console.error("Lỗi triệu hồi Luồng Modal:", err);
       }).finally(() => {
         if (isMounted) setStreamLoading(false);
       });
    }

    return () => {
      isMounted = false;
      if (activeStream) {
        api.delete('/live/stop?streamName=' + activeStream).catch(() => {});
      }
    };
  }, [currentCam?.device_id, currentCam?.channel_number, isOnline, streamMode, mounted, cameraId]);

  if (!cameraId || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-up px-4">
      <div className="glass w-full max-w-2xl max-h-[90vh] overflow-hidden p-0 rounded-2xl border border-slate-700 shadow-2xl relative flex flex-col">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors border border-white/10 z-20 backdrop-blur-md shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TOP COVER: MÔ PHỎNG CAMERA LENS Hoặc LIVE STREAM */}
        <div className="relative aspect-video bg-[#050510] border-b border-primary/20 flex flex-col items-center justify-center overflow-hidden shrink-0 group/vid">
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none"></div>
          
          <div className={`absolute top-4 left-4 z-20 flex items-center px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg
            ${isOnline ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
             <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <span className={`text-[11px] font-black uppercase tracking-widest ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
               {isOnline ? 'LIVE FEED ACTIVE' : 'NO VIDEO SIGNAL'}
             </span>
          </div>

          {streamName ? (
            <>
              <iframe
                src={streamMode === 'sub' && streamUrls?.mse ? streamUrls.mse : `http://localhost:1984/stream.html?src=${streamName}&mode=webrtc,mse,mp4`}
                className="w-full h-full border-0 absolute top-0 left-0 z-0 animate-in fade-in duration-500"
                allow="autoplay; fullscreen"
                muted={true}
              />
              <div className="absolute top-4 right-14 z-20 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setStreamMode(prev => prev === 'main' ? 'sub' : 'main'); 
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider transition-all shadow-xl backdrop-blur-md ${streamMode === 'sub' ? 'bg-orange-600/90 text-white border-orange-400' : 'bg-blue-600/80 text-white border-blue-400 hover:bg-blue-500'}`}
                  title="Bấm để Đổi Giao Lõi Đầu Thu Từ Main Stream sang Sub Stream"
                >
                  {streamMode === 'sub' ? 'SUB STREAM (MƯỢT)' : 'MAIN STREAM (HD)'}
                </button>
              </div>
            </>
          ) : streamLoading ? (
            <div className="flex flex-col items-center opacity-80 z-10">
              <div className="w-12 h-12 mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.6)]"></div>
              <span className="text-[11px] text-primary tracking-[0.3em] font-mono font-black uppercase shadow-black drop-shadow-md bg-black/60 px-5 py-2 border border-primary/20 rounded-full backdrop-blur-md animate-pulse">
                 Connecting...
              </span>
            </div>
          ) : (
            <>
              <Camera className="w-24 h-24 text-slate-800 opacity-60 z-0 drop-shadow-2xl" />
              {!isOnline && (
                <div className="absolute flex flex-col items-center mt-10">
                  <span className="text-[11px] text-red-500 tracking-[0.3em] font-mono font-black uppercase bg-black/50 px-4 py-2 rounded-full border border-red-500/20">Camera Offline</span>
                </div>
              )}
            </>
          )}

          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center pointer-events-none">
             <span className="bg-black/80 px-4 py-1.5 rounded-full border border-slate-800 text-[10px] font-mono font-black text-slate-400 tracking-widest shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
               CHANNEL ID: <span className="text-primary ml-1">{currentCam?.channel_number || '00'}</span>
             </span>
          </div>
        </div>

        {/* BOTTOM SECTION: THÔNG SỐ VÀ LỖI */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/40">
           
           <h2 className="text-2xl font-bold text-white mb-2">{currentCam?.name || `Phiến Quân Mắt Thẩn ${cameraId}`}</h2>
           
           <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center space-x-3 group">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-900 transition-colors shrink-0">
                    <MapPin className="w-5 h-5" />
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cơ Sở Lưu Trú</p>
                    <p className="text-sm font-medium text-slate-200 truncate" title={currentCam?.location?.name}>{currentCam?.location?.name || 'Trôi Dạt Vành Đai'}</p>
                 </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center space-x-3 group">
                 <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-900 transition-colors shrink-0">
                    <Server className="w-5 h-5" />
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">NVR Tổng Trạm</p>
                    <p className="text-sm font-medium font-mono text-slate-200 truncate">{currentCam?.device?.ip_address || '---.---.---.---'}</p>
                 </div>
              </div>
           </div>

           {/* LỊCH SỬ NHẬT KÝ ĐỎ */}
           <div>
              <div className="flex items-center space-x-2 text-red-400 mb-4 pb-2 border-b border-red-500/20">
                 <AlertTriangle className="w-5 h-5" />
                 <h3 className="font-bold tracking-wide uppercase text-sm">Nhật Ký Phiếu Phạt Lỗi Ống Kính</h3>
              </div>
              
              <div className="space-y-3">
                 {loadingIncidents ? (
                   <div className="flex justify-center py-8">
                     <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                 ) : incidents.length === 0 ? (
                   <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-6 text-center shadow-inner">
                     <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-500/50" />
                     <p className="text-sm text-green-400/80 font-medium">Hồ sơ Sạch Bóng. Camera hoạt động hoàn hảo từ lúc chào đời!</p>
                   </div>
                 ) : (
                   incidents.map((incident, idx) => (
                     <div key={idx} className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 transition-colors flex items-start space-x-4">
                        <div className="w-10 h-10 shrink-0 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center font-bold font-mono text-xs border border-red-500/30">
                           #{idx+1}
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase text-red-300 bg-red-500/20 px-2 flex items-center rounded h-5">
                                 {incident.status || 'PENDING'}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 flex items-center">
                                 <Clock className="w-3 h-3 mr-1 opacity-70" />
                                 {new Date(incident.created_at || Date.now()).toLocaleString()}
                              </span>
                           </div>
                           <p className="text-sm text-slate-300 leading-relaxed font-medium">
                              {incident.error_type || 'Bất ngờ sập tín hiệu hình ảnh báo động Webhook.'}
                           </p>
                           {incident.resolve_note && (
                              <div className="mt-3 p-2 bg-slate-900/60 rounded border border-slate-700/50 text-xs text-slate-400 italic">
                                 <span className="text-primary font-bold mr-1">NOTE:</span> {incident.resolve_note}
                              </div>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
