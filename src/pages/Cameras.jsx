import React, { useState, useEffect, useMemo } from 'react';
import { Camera, MapPin, Edit3, Save, X, Server, Search, Filter, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import CameraDetailsModal from '../components/CameraDetailsModal';
import { useNavigate } from 'react-router-dom';

export default function Cameras() {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for editing camera
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', location_id: '' });
  
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Filter & Pagination States (Server-side)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ONLINE, OFFLINE
  const [filterLocation, setFilterLocation] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 24;

  // Debounce ngăn chập DB khi gõ chữ
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (debouncedSearchTerm) queryParams.append('search', debouncedSearchTerm);
      if (filterStatus !== 'ALL') queryParams.append('status', filterStatus);
      if (filterLocation !== 'ALL') queryParams.append('location_id', filterLocation);

      const [camRes, locRes] = await Promise.all([
        api.get(`/cameras?${queryParams.toString()}`).catch(() => ({ data: { data: [], pagination: {} } })),
        api.get('/locations').catch(() => ({ data: [] }))
      ]);
      
      const payload = camRes.data;
      const camerasData = payload?.data || payload || [];
      setCameras(Array.isArray(camerasData) ? camerasData : []);

      const pg = payload?.pagination || {};
      setTotalPages(pg.total_pages || 1);
      setTotalItems(pg.total_items || camerasData.length || 0);

      const locPayload = locRes.data;
      setLocations(locPayload?.data || locPayload || []);
    } catch (error) {
      toast.error('Lỗi Lấy Dữ liệu Phân Trang Camera Mạng Lưới');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, debouncedSearchTerm, filterStatus, filterLocation]);

  // Reset về page 1 khi bộ lọc chuyển hướng (Sức khỏe, Tìm kiếm, v.v)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, filterLocation]);

  const handleEditClick = (cam) => {
    setEditingId(cam.id);
    setEditForm({ name: cam.name || '', location_id: cam.location_id || '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', location_id: '' });
  };

  const handleSave = async (id) => {
    try {
      await api.put(`/cameras/${id}`, editForm);
      toast.success('Đã cập nhật cấu hình Camera!');
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="text-white flex flex-col h-full animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mạng Lưới Camera</h1>
        <p className="text-slate-400 text-sm">Quản lý và điều phối hàng ngàn mắt thần tập trung (Rendering Siêu Tốc)</p>
      </div>

      {/* TOOLBAR BỘ LỌC (FILTER TOOLBAR) */}
      <div className="glass p-4 rounded-xl mb-6 border border-slate-700/50 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm theo Tên hoặc IP thiết bị..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="relative w-full md:w-auto flex items-center">
             <Filter className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
             <select 
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-primary appearance-none transition-all hover:bg-slate-800"
             >
               <option value="ALL">Mọi trạng thái sóng</option>
               <option value="ONLINE">🟢 Đang Hoạt Động</option>
               <option value="OFFLINE">🔴 Mất Kết Nối</option>
             </select>
          </div>

          <div className="relative w-full md:w-auto flex items-center">
             <MapPin className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
             <select 
               value={filterLocation}
               onChange={(e) => setFilterLocation(e.target.value)}
               className="bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-primary appearance-none transition-all hover:bg-slate-800"
             >
               <option value="ALL">Mọi Vị Trí/Tòa Nhà</option>
               {locations.map(loc => (
                 <option key={loc.id} value={loc.id}>{loc.name}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      {/* KẾT QUẢ THỐNG KÊ LỌC (SERVER-SIDE) */}
      <div className="mb-4 text-sm text-slate-400 font-medium flex items-center justify-between">
        <span>Đang xem <strong className="text-white">{cameras.length}</strong> trên Mạng Lưới Tổng <strong className="text-primary">{totalItems}</strong> Mắt Kính NVR.</span>
        <span>Thuật toán BE Đã Bật: Ưu Tiên Mắt Kính Nháy Đỏ 🚀</span>
      </div>

      {/* KHỐI GRID HIỂN THỊ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 flex-1 content-start">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : cameras.length === 0 ? (
          <div className="col-span-full glass p-12 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-dashed border-2 border-slate-700/50">
            <Camera className="w-12 h-12 mb-4 opacity-30 text-slate-500" />
            <p>Backend đã quét Trống Rỗng, Không tìm thấy Thiết Bị Mắt Cam nào theo Tham số hiện tại.</p>
          </div>
        ) : (
          cameras.map((cam, idx) => {
            const isEditing = editingId === cam.id;
            const statusRaw = cam.status || cam.state || cam.is_online || 'UNKNOWN';
            const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';
            const displayStatus = typeof statusRaw === 'string' ? statusRaw.toUpperCase() : (isOnline ? 'ONLINE' : 'OFFLINE');

            return (
              <div 
                key={cam.id} 
                className={`glass flex flex-col rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border ${isOnline ? 'border-slate-700/50 hover:border-primary/50' : 'border-red-500/40 hover:border-red-500 bg-red-500/5'} group hover:-translate-y-1 relative cursor-pointer`}
                onClick={() => {
                   if (!isEditing && cam.device_id) {
                      navigate(`/devices/${cam.device_id}`);
                   } else if (!cam.device_id && !isEditing) {
                      toast.error('Camera này thuộc về trạm nổi, không nằm trên máy chủ NVR nào!');
                   }
                }}
              >
                {/* Overlay Background Faded */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50 pointer-events-none" />

                <div className="p-4 flex-1 flex flex-col relative z-10 w-full h-full">
                  
                  {/* HEADER CARD: Trạng thái & Tool Menu (Sửa) */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center space-x-2 px-2.5 py-1 rounded shadow text-[9px] font-black tracking-widest uppercase border ${isOnline ? 'bg-slate-900 border-slate-700 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-[ping_1.5s_infinite]' : 'bg-red-500'}`}></span>
                      <span className="pt-[1px]">{displayStatus}</span>
                    </div>

                    <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                       {isEditing ? (
                         <>
                           <button onClick={handleCancelEdit} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors border border-transparent" title="Huỷ">
                             <X className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => handleSave(cam.id)} className="p-1.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 rounded-md transition-colors" title="Lưu lại">
                             <Save className="w-3.5 h-3.5" />
                           </button>
                         </>
                       ) : (
                         <button onClick={() => handleEditClick(cam)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 hover:text-primary transition-colors border border-slate-700/50" title="Chỉnh sửa Tên & Vị Trí">
                           <Edit3 className="w-3.5 h-3.5" />
                         </button>
                       )}
                    </div>
                  </div>

                  {/* BODY CARD: Nội dung Tín Hiệu */}
                  <div className="flex-1" onClick={e => isEditing && e.stopPropagation()}>
                    {isEditing ? (
                       <div className="space-y-3 mt-1">
                          <input 
                            type="text" 
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition font-mono border-l-2 border-l-primary"
                            placeholder="Mã Hiệu Cam..."
                          />
                          <select 
                            value={editForm.location_id}
                            onChange={e => setEditForm({...editForm, location_id: e.target.value})}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-primary appearance-none transition"
                          >
                            <option value="">[Chọn Vị Trí Setup]</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                       </div>
                    ) : (
                       <>
                          <div className="flex items-center space-x-3 mb-2">
                             <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border ${isOnline ? 'bg-slate-800/80 border-slate-700 text-slate-400 group-hover:text-primary transition-colors shadow-inner' : 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
                                <Camera className="w-4 h-4" />
                             </div>
                             <h3 className="font-bold text-sm text-white line-clamp-2 max-w-[150px] group-hover:text-primary transition-colors leading-snug" title={cam.name}>
                               {cam.name || `Camera Cục Bộ Vô Danh ${cam.id}`}
                             </h3>
                          </div>
                          
                          <div className="space-y-2 mt-4 text-[11px] text-slate-400 font-mono w-full">
                             <div className="flex items-center bg-slate-900/40 px-2 py-1.5 rounded-md border border-slate-800/60 shadow-inner w-full">
                               <MapPin className={`w-3.5 h-3.5 shrink-0 mr-2 ${isOnline ? 'text-slate-500' : 'text-red-400/50'}`} />
                               <span className="truncate">{cam.location?.name || 'Vị Trí Vô Định (No Data)'}</span>
                             </div>
                             
                             <div className="flex items-center bg-slate-900/40 px-2 py-1.5 rounded-md border border-slate-800/60 shadow-inner w-full">
                               <Server className={`w-3.5 h-3.5 shrink-0 mr-2 ${isOnline ? 'text-primary' : 'text-red-400'}`} />
                               <span className="truncate">NVR IP: <span className="text-white font-bold ml-1">{cam.device?.ip_address || '---'}</span></span>
                             </div>
                          </div>
                       </>
                    )}
                  </div>

                  {/* BỘ PHẬN ĐIỀU CHUYỂN LOGIC (CHÂN CARD) Lọc Event Click Để Không Kích Rung Nav */}
                  {!isEditing && (
                    <div className="pt-3 border-t border-slate-700/30 mt-4 flex justify-between items-center px-1">
                       <span className={`text-[9px] font-bold font-mono px-2 py-1 rounded ${isOnline ? 'bg-slate-800 text-slate-400 border border-slate-700/50' : 'bg-red-500/20 text-red-300 border border-red-500/20'}`}>
                          CH_{String(cam.channel_number || idx + 1).padStart(2, '0')}
                       </span>
                       <span className={`text-[10px] font-black uppercase tracking-widest flex items-center transition-colors ${isOnline ? 'text-slate-500 group-hover:text-primary' : 'text-red-400 group-hover:text-red-300'}`}>
                          Tới NVR <ChevronRight className="w-3 h-3 ml-0.5" />
                       </span>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BỘ ĐIỀU KHIỂN PHÂN TRANG (PAGINATION) QUÁ ĐẸP */}
      {totalPages > 1 && (
         <div className="mt-8 flex items-center justify-between glass p-3 rounded-xl border border-slate-700/50">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 flex items-center text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Trang Trước
            </button>
            <div className="flex space-x-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                    currentPage === i + 1 
                      ? 'bg-primary text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                      : 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 flex items-center text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trang Kế <ChevronRight className="w-4 h-4 ml-1" />
            </button>
         </div>
      )}

      {/* MODAL ISAPI ASYNC: View Tech Details */}
      <CameraDetailsModal 
         cameraId={selectedCamera?.id} 
         initialData={selectedCamera}
         onClose={() => setSelectedCamera(null)} 
      />
    </div>
  );
}
