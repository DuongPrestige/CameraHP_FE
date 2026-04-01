import React, { useState, useEffect, useMemo } from 'react';
import { Camera, MapPin, Edit3, Save, X, Server, Search, Filter, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import CameraDetailsModal from '../components/CameraDetailsModal';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for editing camera
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', location_id: '' });
  
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ONLINE, OFFLINE
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Giảm xuống 9 giống Lưới NVR để đảm bảo Phân trang luôn được render

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [camRes, locRes] = await Promise.all([
        api.get('/cameras').catch(() => ({ data: { data: [] } })),
        api.get('/locations').catch(() => ({ data: { data: [] } }))
      ]);
      const camerasData = camRes.data?.data || camRes.data || [];
      console.log('[DEBUG API] Camera lưới lấy về từ Backend:', camerasData);
      setCameras(camerasData);
      setLocations(locRes.data?.data || locRes.data || []);
    } catch (error) {
      toast.error('Lỗi tải danh sách Camera');
    } finally {
      setLoading(false);
    }
  };

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

  // --- LOGIC LỌC DỮ LIỆU & PHÂN TRANG (CLIENT-SIDE) ---
  const filteredCameras = useMemo(() => {
    return cameras.filter(cam => {
      // Chuẩn hóa status
      const statusRaw = cam.status || cam.state || cam.is_online || 'UNKNOWN';
      const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';
      const statusEnum = isOnline ? 'ONLINE' : 'OFFLINE';

      // Điều kiện 1: Tên chứa từ khóa
      const matchSearch = cam.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cam.device?.ip_address?.includes(searchTerm);
      
      // Điều kiện 2: Trạng thái
      const matchStatus = filterStatus === 'ALL' || statusEnum === filterStatus;

      // Điều kiện 3: Vị trí
      const matchLocation = filterLocation === 'ALL' || String(cam.location_id) === String(filterLocation);

      return matchSearch && matchStatus && matchLocation;
    });
  }, [cameras, searchTerm, filterStatus, filterLocation]);

  const totalPages = Math.ceil(filteredCameras.length / itemsPerPage) || 1;
  
  // Đảm bảo không bị kẹt ở trang vô lý khi data bị lọc rút gọn lại
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCameras.slice(start, start + itemsPerPage);
  }, [filteredCameras, currentPage]);

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

      {/* KẾT QUẢ THỐNG KÊ LỌC */}
      <div className="mb-4 text-sm text-slate-400 font-medium flex items-center">
        <span>Hiển thị <strong className="text-white">{currentItems.length}</strong> trên dải <strong className="text-primary">{filteredCameras.length}</strong> kết quả kìm thấy.</span>
      </div>

      {/* KHỐI GRID HIỂN THỊ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 flex-1 content-start">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : filteredCameras.length === 0 ? (
          <div className="col-span-full glass p-12 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-dashed border-2 border-slate-700/50">
            <Camera className="w-12 h-12 mb-4 opacity-30 text-slate-500" />
            <p>Không có mắt kính nào đáp ứng từ khóa Lọc của bạn.</p>
          </div>
        ) : (
          currentItems.map(cam => {
            const isEditing = editingId === cam.id;
            
            // Xử lý đọc trạng thái an toàn
            const statusRaw = cam.status || cam.state || cam.is_online || 'UNKNOWN';
            const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';
            const displayStatus = typeof statusRaw === 'string' ? statusRaw.toUpperCase() : (isOnline ? 'ONLINE' : 'OFFLINE');

            return (
              <div key={cam.id} className="glass rounded-xl overflow-hidden shadow-2xl hover:border-primary/40 transition flex flex-col group border border-slate-700/80 hover:-translate-y-1">
                {/* Camera Video Placeholder */}
                <div className="h-32 bg-black relative group-hover:bg-slate-900 transition-colors flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                  <div className="absolute top-2 left-2 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded z-20 border border-slate-800/50">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse ring-[2px] ring-green-500/30' : 'bg-red-500'}`}></span>
                    <span className={`text-[9px] font-bold tracking-wider ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  {isOnline ? (
                     <Camera className="w-10 h-10 text-slate-700 group-hover:text-primary/30 transition-colors z-0" />
                  ) : (
                     <div className="text-center font-mono text-red-500/50 text-[10px] z-0 tracking-widest border border-red-500/20 px-2 py-0.5 bg-red-500/5">CONNECTION LOST</div>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col bg-surface/80">
                  {isEditing ? (
                    <div className="space-y-2 mb-3 flex-1">
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition"
                        placeholder="Tên Camera..."
                      />
                      <select 
                        value={editForm.location_id}
                        onChange={e => setEditForm({...editForm, location_id: e.target.value})}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-primary appearance-none transition"
                      >
                        <option value="">-- Cắm Vị Trí --</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="mb-2 flex-1">
                      <h3 className="font-semibold text-sm text-white mb-2 truncate border-b border-slate-700/50 pb-1" title={cam.name}>{cam.name || `Camera ${cam.id}`}</h3>
                      <div className="flex items-center text-[11px] text-slate-400 mb-1.5">
                        <MapPin className="w-3 h-3 mr-1.5 text-primary" />
                        <span className="truncate">{cam.location?.name || 'Vô Định'}</span>
                      </div>
                      <div className="flex items-center text-[11px] text-slate-400">
                        <Server className="w-3 h-3 mr-1.5 text-slate-500" />
                        <span className="font-mono truncate bg-slate-900 px-1 py-0.5 rounded border border-slate-800">{cam.device?.ip_address || '---'}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-700/50 flex justify-end space-x-1.5 mt-auto">
                    {isEditing ? (
                      <>
                        <button onClick={handleCancelEdit} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Huỷ">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleSave(cam.id)} className="p-1.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 rounded transition-colors" title="Lưu lại">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setSelectedCamera(cam)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors border border-slate-700" title="Khám Nghiệm Mắt Thần">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEditClick(cam)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors border border-slate-700" title="Chỉnh sửa Alias">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BỘ ĐIỀU KHIỂN PHÂN TRANG (PAGINATION) QUÁ ĐẸP */}
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

      {/* MODAL ISAPI ASYNC: View Tech Details */}
      <CameraDetailsModal 
         cameraId={selectedCamera?.id} 
         initialData={selectedCamera}
         onClose={() => setSelectedCamera(null)} 
      />
    </div>
  );
}
