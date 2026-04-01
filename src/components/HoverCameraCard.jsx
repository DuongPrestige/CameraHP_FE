import React, { useState, useEffect, useRef } from 'react';
import { EthernetPort, Loader2, Play, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function HoverCameraCard({ cam, deviceId, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [snapshotObjUrl, setSnapshotObjUrl] = useState(null);
  // --- EFFECT 0: DEBOUNCE HOVER CHỐNG SPAM API (LỖI 429) ---
  useEffect(() => {
    let timer;
    if (isHovered) {
      // Đợi 500ms người dùng thật sự muốn xem thì mới nổ API Mở Luồng
      timer = setTimeout(() => {
        setShouldPlay(true);
      }, 500);
    } else {
      setShouldPlay(false);
    }
    return () => clearTimeout(timer);
  }, [isHovered]);
  const [streamData, setStreamData] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [streamMode, setStreamMode] = useState('sub');

  const streamNameRef = useRef(null);

  const camStatus = cam.status || cam.state || cam.is_online || 'UNKNOWN';
  const isCamOnline = String(camStatus).toUpperCase() === 'ONLINE' || camStatus === true || camStatus === 1 || String(camStatus).toUpperCase() === 'TRUE';

  // --- EFFECT 1: STANDBY SNAPSHOT DÙNG BLOB ĐỂ VƯỢT JWT CHỐNG LỖI 403 ---
  useEffect(() => {
    // Khựng lại ảnh nếu đang xem Video hoặc khi Cam chết
    if (isHovered || !isCamOnline) return;

    let isSubscribed = true;

    const fetchSnapshot = () => {
      // Đổi thành streamType=main (NVR Hikvision đa phần cấm Get Picture từ luồng phụ Sub-stream => Lỗi lõi 403)
      api.get(`/live/snapshot?deviceId=${deviceId || cam.device_id}&channelId=${cam.channel_number}&streamType=main`, { 
        responseType: 'blob' 
      })
      .then(res => {
        if (!isSubscribed) return;
        const objectUrl = URL.createObjectURL(res.data);
        setSnapshotObjUrl(prev => {
          if (prev) URL.revokeObjectURL(prev); // Thu hồi link ảo cũ dọn RAM browser
          return objectUrl;
        });
      })
      .catch(err => {
        if (!isSubscribed) return;
        console.warn('Lỗi Background Snapshot:', err.message);
      });
    };

    fetchSnapshot(); // 1 Cú Lấy Ảnh Ngay Mount
    const timer = setInterval(fetchSnapshot, 5000); // Kéo lại 5 Giây / Cú (Auto-Cached Backend)

    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, [isHovered, isCamOnline, deviceId, cam]);

  // Giải phóng triệt để RAM của Blob URL nếu Card Camera bị hủy mảng hoàn toàn
  useEffect(() => {
    return () => {
      if (snapshotObjUrl) URL.revokeObjectURL(snapshotObjUrl);
    };
  }, [snapshotObjUrl]);

  // --- EFFECT 2: HOVER TO PLAY LUỒNG VIDEO & AUTO-FALLBACK ---
  useEffect(() => {
    let isCancelled = false;

    if (shouldPlay && isCamOnline) {
      setIsLoadingVideo(true);
      setErrorInfo(null);
      
      // Thêm giới hạn timeout 5s để phát hiện kẹt luồng (Cáp bị đứt do Backend FIFO)
      api.post('/live/play', { 
         deviceId: deviceId || cam.device_id, 
         channelId: cam.channel_number, 
         streamType: streamMode 
      }, { timeout: 5000 })
      .then(res => {
         if (isCancelled) {
             // Phát hiện rê chuột đi quá nhanh, Video mới gọi xong thì Huỷ Ngay Lập Tức!
             if (res.data?.streamName) {
                 api.delete('/live/stop?streamName=' + res.data.streamName).catch(console.error);
             }
         } else {
             if (res.data?.success && res.data?.urls) {
                 streamNameRef.current = res.data.streamName;
                 setStreamData(res.data.urls);
             } else {
                 setErrorInfo('NVR Từ chối cung cấp API!');
             }
         }
      })
      .catch(err => {
         if (!isCancelled) {
             console.error("Lỗi Video Hover:", err);
             // Bắt Timeout 5s hoặc Lỗi Đứt Kết Nối (Auto-Fallback về Ảnh)
             if (err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err?.response?.status === 429) {
                 setShouldPlay(false); // Cất Iframe giật lác, tự trồi Ảnh Snapshot lên
                 setErrorInfo(null);   // Ẩn lỗi đỏ theo yêu cầu dọn dẹp log Backend
             } else {
                 setErrorInfo('Lỗi mạng nội bộ');
             }
         }
      })
      .finally(() => {
         if (!isCancelled) setIsLoadingVideo(false);
      });
    } else {
      // Khi Không Còn Hover: Đóng Video, Thu Hồi RAM, Trả Lại Ảnh Screenshot
      setIsLoadingVideo(false);
      if (streamNameRef.current) {
         api.delete('/live/stop?streamName=' + streamNameRef.current).catch(console.error);
         streamNameRef.current = null;
      }
      setStreamData(null);
    }

    // Unmount Cleanup: QUAN TRỌNG TỐI ĐA CHO CHỐNG CHÁY NVR
    return () => {
      isCancelled = true;
      if (streamNameRef.current) {
         api.delete('/live/stop?streamName=' + streamNameRef.current).catch(console.error);
         streamNameRef.current = null;
      }
    };
  }, [shouldPlay, isCamOnline, deviceId, cam, streamMode]);

  // Xóa thủ thuật url src string cũ, đã chuyển qua dùng Object Urls ở trên bảo mật Auth Header.
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-primary/50 flex flex-col overflow-hidden cursor-pointer rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)] group relative" 
    >
      {/* KHỐI TRÊN: KHUNG VIDEO / ỐNG KÍNH (Cân bằng tỷ lệ 16:9 bằng aspect-video) */}
      <div className="relative w-full aspect-video bg-black/90 z-0 shrink-0 border-b border-slate-700/50 group-hover:border-primary/50 transition-colors overflow-hidden">
        {isCamOnline ? (
          <>
            {/* Ảnh Nền (Snapshot) Chờ mờ dưới Video */}
            {snapshotObjUrl && (
              <img 
                src={snapshotObjUrl} 
                alt={cam.name} 
                className={`w-full h-full object-cover transition-opacity duration-500 ${shouldPlay && streamData ? 'opacity-0' : 'opacity-70 group-hover:opacity-40'}`} 
                onError={(e) => {
                   e.target.style.display = 'none'; // Giấu ảnh rách
                }}
              />
            )}
            
            {/* Nếu đang Loading Video Giữa Khung Hình */}
            {isLoadingVideo && shouldPlay && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 animate-fade-in">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  <span className="text-[10px] font-mono tracking-widest text-primary font-bold">KHỞI ĐỘNG LUỒNG MƯỢT...</span>
               </div>
            )}

            {/* Video Hoạt Động Khi API Trả URLs Thành Cáo */}
            {streamData && streamData.mse && shouldPlay && !isLoadingVideo && (
               <iframe 
                 src={streamData.mse} 
                 className="absolute inset-x-0 top-0 w-full h-full border-0 z-10 bg-black animate-in fade-in zoom-in-95 duration-500 pointer-events-none" 
                 allow="autoplay; fullscreen"
                 title="Live Stream Gắn Kèm Hover"
               ></iframe>
            )}

            {/* Hiển Thị Lỗi API */}
            {errorInfo && shouldPlay && !isLoadingVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-red-500 p-4 text-center">
                    <AlertCircle className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{errorInfo}</span>
                </div>
            )}

            {/* Icon Play Overlay */}
            {!isHovered && (
              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary backdrop-blur-md border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.4)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                   <Play className="w-5 h-5 translate-x-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex w-full h-full items-center justify-center bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_10px,#0f172a_10px,#0f172a_20px)] opacity-30">
             <span className="text-slate-500 font-mono text-xs font-bold tracking-widest rotate-[-15deg] uppercase">Chết Tín Hiệu</span>
          </div>
        )}
      </div>

      {/* KHỐI DƯỚI: GIAO DIỆN THÔNG TIN CHI TIẾT CAMERA */}
      <div className="p-4 bg-slate-900/60 flex flex-col flex-1 relative isolate">
          {/* Lớp highlight ảo hất sáng từ trên */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none -z-10"></div>
          
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col pr-2">
              <span className="font-bold text-white group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug" title={cam.name || 'Góc Khuất Chưa Tên'}>
                {cam.name || 'Góc Khuất Chưa Tên'}
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-400 mt-1">
                KÊNH_{String(cam.channel_number || 'X').padStart(2, '0')}
              </span>
            </div>
            
            {/* Status Badge */}
            <div className={`px-2 py-0.5 rounded border flex items-center shadow-sm shrink-0 mt-0.5 ${isCamOnline ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCamOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${isCamOnline ? 'text-green-500' : 'text-red-500'}`}>
                {isCamOnline ? 'LIVE' : 'NO SGN'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-700/50">
             <div className="flex items-center space-x-2">
                 <div className="font-mono text-[11px] text-slate-500 flex items-center bg-slate-900 px-2 py-1 rounded-md border border-slate-700/50">
                    <EthernetPort className="w-3 h-3 mr-1.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[90px]">{cam.ip_address || "192.168.1.xxx"}</span>
                 </div>
                 
                 <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       setStreamMode(prev => prev === 'sub' ? 'main' : 'sub');
                    }}
                    title="Chuyển đổi chất lượng Luồng Video (HD/SD)"
                    className={`font-mono text-[9px] font-black px-2 py-1.5 rounded border tracking-widest transition-all ${streamMode === 'main' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-white'}`}
                 >
                    {streamMode === 'main' ? 'MAIN' : 'SUB'}
                 </button>
             </div>
             
             <button className="text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest flex items-center transition-all border border-primary/20 hover:border-primary/40 group-hover:bg-primary group-hover:text-white shrink-0 ml-2">
                VÀO SOÁP
             </button>
          </div>
      </div>
    </div>
  );
}
