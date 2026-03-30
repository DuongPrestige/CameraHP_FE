import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Server, Trash2, RefreshCw, AlertCircle, Wifi, Search, Filter, ChevronLeft, ChevronRight, MapPin, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ip_address: '', username: '', password: '', location_id: '' });

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devRes, locRes] = await Promise.all([
        api.get('/devices').catch(() => ({ data: [] })),
        api.get('/locations').catch(() => ({ data: [] }))
      ]);
      const devicesData = devRes.data?.data || devRes.data || [];
      console.log('[DEBUG API] Thiết bị NVR lấy về từ Backend:', devicesData);
      setDevices(devicesData);
      setLocations(locRes.data?.data || locRes.data || []);
    } catch (error) {
      toast.error('Lỗi lấy dữ liệu NVR');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/devices', formData);
      toast.success('Thêm NVR thành công');
      setIsModalOpen(false);
      setFormData({ ip_address: '', username: '', password: '', location_id: '' });
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi thêm NVR. Hãy thử lại.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('CẢNH BÁO: Phá hủy NVR này sẽ xóa tàn dư mọi Camera gắn với nó!')) return;
    try {
      await api.delete(`/devices/${id}`);
      toast.success('Đã phá hủy thẻ NVR!');
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa NVR');
    }
  };

  const handleSync = async (id) => {
    const toastId = toast.loading('Đang kích hoạt lệnh bắt sóng ISAPI tải Camera...');
    try {
      await api.post(`/devices/${id}/sync-cameras`);
      toast.success('Đồng bộ mạng lưới Camera thành công!', { id: toastId });
      // Tải lại dữ liệu (update số lượng camera mới tải về)
      fetchData();
    } catch (error) {
      toast.error('Đồng bộ Camera thất bại', { id: toastId });
    }
  };

  // --- LOGIC LỌC DỮ LIỆU & PHÂN TRANG (CLIENT-SIDE) ---
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const matchSearch = dev.ip_address?.includes(searchTerm);
      const matchLocation = filterLocation === 'ALL' || String(dev.location_id) === String(filterLocation);
      return matchSearch && matchLocation;
    });
  }, [devices, searchTerm, filterLocation]);

  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage) || 1;
  
  // Tránh hiển thị trắng trang khi đang ở trang xa mà đổi Filter
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDevices.slice(start, start + itemsPerPage);
  }, [filteredDevices, currentPage]);

  return (
    <div className="text-white flex flex-col h-full animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Trung Tâm NVR</h1>
          <p className="text-slate-400 text-sm">Điều hướng bộ lưu trữ và liên kết mạng Camera</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-slate-900 px-5 py-2.5 rounded-lg font-bold flex items-center space-x-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <Plus className="w-5 h-5" />
          <span>Lắp Đặt NVR</span>
        </button>
      </div>

      {/* THANH ĐIỀU HƯỚNG BỘ LỌC (TOOLBAR) */}
      <div className="glass p-4 rounded-xl mb-6 border border-slate-700/50 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Tra cứu theo dải IP Thiết Bị..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono"
          />
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="relative w-full md:w-auto flex items-center">
             <Filter className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
             <select 
               value={filterLocation}
               onChange={(e) => setFilterLocation(e.target.value)}
               className="bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-primary appearance-none transition-all hover:bg-slate-800"
             >
               <option value="ALL">Toàn Bộ Hệ Sinh Thái Vị Trí</option>
               {locations.map(loc => (
                 <option key={loc.id} value={loc.id}>{loc.name}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden border border-slate-700/50 flex-1 flex flex-col shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-xs border-b border-slate-700/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-5 w-[15%]">Sóng Truyền</th>
                <th className="px-6 py-5 w-[25%]">Địa Chỉ IP MAC</th>
                <th className="px-6 py-5 w-[25%]">Xưởng Nội Khu</th>
                <th className="px-6 py-5 text-center w-[15%]">Cổng Cam</th>
                <th className="px-6 py-5 text-right w-[20%]">Lệnh KTV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                      <span className="text-slate-500 font-mono tracking-widest text-xs">V-SEC FETCHING...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                    <Server className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    Bảng quét radar trống, không có Thiết bị NVR trong vùng mục tiêu.
                  </td>
                </tr>
              ) : (
                currentItems.map(device => {
                  // Cố gắng bắt mọi loại naming convention backend có thể trả về
                  const statusRaw = device.status || device.state || device.is_online || 'UNKNOWN';
                  const isOnline = String(statusRaw).toUpperCase() === 'ONLINE' || statusRaw === true || statusRaw === 1 || String(statusRaw).toUpperCase() === 'TRUE';
                  const displayStatus = typeof statusRaw === 'string' ? statusRaw.toUpperCase() : (isOnline ? 'ONLINE' : 'OFFLINE');

                  return (
                  <tr key={device.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2 bg-slate-900 w-max px-3 py-1.5 rounded-full border border-slate-800 group-hover:border-slate-700 transition-colors">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse ring-2 ring-green-500/20' : 'bg-red-500 ring-2 ring-red-500/20'}`}></span>
                        <span className={`font-bold text-[10px] tracking-widest ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                          {displayStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Link to={`/devices/${device.id}`} className="font-mono text-primary font-bold tracking-wide hover:underline hover:text-cyan-300 transition-colors cursor-pointer drop-shadow-md decoration-primary/50 underline-offset-4">
                         {device.ip_address}
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                         <MapPin className="w-3.5 h-3.5 mr-2 text-slate-500 group-hover:text-primary/70 transition-colors" />
                         <span className="truncate max-w-[200px]">{device.location?.name || 'Vô định / Chưa xác định'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-900 px-4 py-1.5 text-[11px] rounded-lg border border-slate-700 font-bold tracking-wider text-white shadow-inner">
                        <Camera className="w-3.5 h-3.5 mr-2 text-primary/70" /> {device.cameras?.length || 0} PORT
                      </span>
                    </td>
                    <td className="px-6 py-5 space-x-2 text-right">
                      <button 
                        onClick={() => handleSync(device.id)}
                        className="text-primary hover:text-white bg-primary/10 hover:bg-primary/80 p-2.5 rounded-lg transition-all shadow-[0_4px_10px_rgba(6,182,212,0.1)] hover:shadow-[0_4px_15px_rgba(6,182,212,0.4)] inline-flex"
                        title="Đồng bộ lại Camera lưới từ NVR"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(device.id)}
                        className="text-danger hover:text-white bg-danger/10 hover:bg-danger/80 p-2.5 rounded-lg transition-all shadow-[0_4px_10px_rgba(239,68,68,0.1)] hover:shadow-[0_4px_15px_rgba(239,68,68,0.4)] inline-flex"
                        title="Phá hủy / Gỡ cài đặt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG BANEL CHO MOBILE/DESKTOP Ở ĐÁY TABLE */}
        {totalPages > 1 && (
          <div className="mt-auto px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 flex flex-col md:flex-row items-center justify-between">
            <span className="text-xs text-slate-400 font-medium mb-4 md:mb-0">
               NVR System Monitor - Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
               <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex bg-slate-800 rounded px-2 h-9 items-center font-mono text-sm text-white border border-slate-700">
                   <span className="text-primary font-bold px-2">{currentPage}</span> / <span className="px-2 text-slate-400">{totalPages}</span>
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up px-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" /> Khai báo NVR
            </h2>

            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger/90 leading-relaxed">
                Mật mã thiết bị (ISAPI) sẽ được truyền đi qua Protocol 2 chiều và <strong>Tuyệt đối bảo mật tuyệt đỉnh</strong>.
              </p>
            </div>
            
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Địa chỉ IP Máy Bắt Hình (NVR)</label>
                <input
                  type="text"
                  required
                  value={formData.ip_address}
                  onChange={e => setFormData({...formData, ip_address: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary font-mono shadow-inner"
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 ... (Bỏ qua đoạn code lặp lại để giữ performance) 
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tên TK Đại Ca (ISAPI)</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary shadow-inner"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu Thiết bị</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary shadow-inner"
                    placeholder="••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nơi Cấm Chân Yêu Nữ (Vị Trí)</label>
                <select
                  required
                  value={formData.location_id}
                  onChange={e => setFormData({...formData, location_id: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary appearance-none shadow-inner"
                >
                  <option value="" disabled>-- Vui lòng Cắm Cột (Chọn) --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors bg-slate-900"
                >
                  Huỷ Thiết Quân Luật
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-slate-900 font-bold tracking-wide rounded-xl hover:bg-primary/90 transition-transform active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                >
                  <Wifi className="w-5 h-5" /> Liên Lạc Vệ Tinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
