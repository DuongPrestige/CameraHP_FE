import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import useAuthStore from '../stores/authStore';
import { 
  AlertTriangle, CheckCircle, Search, Filter, Plus, 
  User, Clock, Play, Check, X, Server, Camera, ShieldAlert,
  ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function Incidents() {
  const user = useAuthStore(state => state.user);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(''); // Rỗng = All
  
  // Trạng thái nhập Note cho từng vé
  const [resolveNotes, setResolveNotes] = useState({});

  // Form Modal Tạo Lỗi Thủ Công
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [devices, setDevices] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [formData, setFormData] = useState({ device_id: '', camera_id: '', error_type: '' });

  // 1. GÕ CỬA BACKEND LẤY DANH SÁCH VÉ LỖI
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      let query = `/incidents?page=${page}&limit=12`;
      if (statusFilter) query += `&status=${statusFilter}`;
      
      const res = await api.get(query);
      const dataArray = res.data?.data || res.data || [];
      setIncidents(dataArray);
      
      // Lấy thẻ phân trang (Có thể meta, pagination, hoặc total_pages)
      const meta = res.data?.meta || res.data?.pagination || {};
      setTotalPages(meta.last_page || meta.total_pages || 1);
      
    } catch (e) {
      toast.error('Gãy kết nối khi tải Bảng Vé Lỗi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, statusFilter]);

  // Lấy danh sách NVR để nhét vào Modal
  const loadDevicesForModal = async () => {
      try {
          const res = await api.get('/devices');
          setDevices(res.data?.data || res.data || []);
      } catch (e) {}
  };

  // Lắng nghe WebSockets Y hệt Dashboard
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
       auth: { token: localStorage.getItem('token') || '' },
       transports: ['websocket', 'polling'] 
    });

    socket.on('incident_updated', (payload) => {
       fetchIncidents();
    });

    socket.on('new_incident', (payload) => {
       toast.custom((t) => (
         <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full glass bg-red-500/10 border border-red-500/50 shadow-lg rounded-xl flex ring-1 ring-black ring-opacity-5 p-4`}>
           <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse mr-3" />
           <div>
             <p className="text-sm font-black text-red-400 font-mono tracking-widest uppercase">⚠️ LỖI BÁO NÓNG (NEW)</p>
             <p className="mt-1 text-xs text-slate-300">Cáp sóng trạm nào đó vừa bị đứt. Bắn yêu cầu tải lại Trạm Ticketing.</p>
           </div>
         </div>
       ), { duration: 6000, position: 'top-left' });
       
       // Play Beep
       try{ new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqq/9JWAAACf/2Q==').play().catch(()=>{}); }catch(e){}
       
       setPage(1); // Về trang 1 để xem vé mới nhất
       fetchIncidents();
    });

    return () => socket.disconnect();
  }, []);

  // 2. NGHIỆP VỤ JIRA: GẮP CHUYỂN TRẠNG THÁI VÉ
  const handleTicketingWorkflow = async (id, newStatus) => {
    try {
      const body = { status: newStatus };
      if (newStatus === 'resolved') {
          body.resolve_note = resolveNotes[id] || 'Đã sửa lụi hoàn tất không lưu lại vết tích.';
      }
      
      await api.put(`/incidents/${id}`, body);
      toast.success(`Vé #${id} chuyển sang ${newStatus.toUpperCase()}!`, { icon: newStatus === 'resolved' ? '✅' : '🛠️' });
      
      // Xóa Note tạm nếu có
      if (newStatus === 'resolved') {
          setResolveNotes(prev => ({ ...prev, [id]: '' }));
      }
      fetchIncidents();
    } catch (e) {
      toast.error(`Kẹt Lệnh: ${e.response?.data?.message || 'Lỗi Phân Quyền/Máy Chủ'}`);
    }
  };

  // 3. XỬ LÝ NỘP VÉ LỖI THỦ CÔNG POST API
  const handleCreateIncident = async (e) => {
      e.preventDefault();
      if (!formData.device_id || !formData.error_type) {
         return toast.error("Vui lòng Bốc 1 Tòa Đầu Ghi và Ghi Rõ Tên Lỗi", { icon: "⚠️" });
      }
      setCreating(true);
      try {
         const payload = { ...formData };
         if (!payload.camera_id) payload.camera_id = null; // Backend required null
         
         await api.post('/incidents', payload);
         toast.success("Khảm Thẻ Phạt Thành Công! Còi Báo Động Hệ Thống Sẽ Rú Toàn Trạm!");
         setIsModalOpen(false);
         setFormData({ device_id: '', camera_id: '', error_type: '' });
         setPage(1); // Trở về Page 1
         fetchIncidents();
      } catch (error) {
         toast.error(error.response?.data?.message || 'Báo lỗi thất bại');
      } finally {
         setCreating(false);
      }
  };

  const statusColors = {
      'pending': 'bg-red-500/20 text-red-400 border-red-500/30',
      'processing': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'resolved': 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div className="text-white space-y-6 pb-10">
      
      {/* KHỐI 1: HEADER & BỘ LỌC JIRA */}
      <div className="glass p-6 rounded-2xl border border-slate-700/50 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-xl">
         <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center font-mono">
               <ShieldAlert className="w-8 h-8 mr-3 text-red-500" />
               TRẠM GIẢI QUYẾT SỰ CỐ (Lệnh Bài KTV)
            </h1>
            <p className="text-slate-400 text-sm mt-1 ml-11">Nơi phơi bày toàn bộ Vé Rớt Mạng, Đứt Cáp toàn Lưới Điện.</p>
         </div>

         <div className="flex flex-col sm:flex-row gap-3">
            {/* Bộ Lọc (Jira Filters) */}
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-1">
               <Filter className="w-4 h-4 text-slate-400 ml-3" />
               <select 
                  className="bg-transparent text-sm text-slate-200 outline-none pl-2 pr-6 py-2.5 appearance-none cursor-pointer font-bold tracking-wider"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
               >
                  <option className="bg-slate-900" value="">🌍 LƯỚI TỔNG (ALL TICKETS)</option>
                  <option className="bg-slate-900 text-red-400" value="pending">🔥 CẤP BÁCH (PENDING)</option>
                  <option className="bg-slate-900 text-amber-400" value="processing">🛠 ĐANG SỬA (PROCESSING)</option>
                  <option className="bg-slate-900 text-green-400" value="resolved">✅ ĐÃ XONG (RESOLVED)</option>
               </select>
            </div>
            
            {/* Nút Tạo Lỗi Menu */}
            <button 
               onClick={() => { setIsModalOpen(true); loadDevicesForModal(); }}
               className="flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-red-500/20"
            >
               <Plus className="w-4 h-4 mr-2" /> VÉ PHẠT THỦ CÔNG
            </button>
         </div>
      </div>

      {/* KHỐI 2: DÀN THẺ BÀI SỰ CỐ (CARDS GRID) */}
      {loading ? (
        <div className="flex items-center justify-center p-20 text-slate-500">
           <div className="w-10 h-10 border-4 border-slate-700 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : incidents.length === 0 ? (
        <div className="glass p-20 rounded-2xl flex flex-col justify-center items-center opacity-80 border-dashed border-2 border-slate-700/50">
           <CheckCircle className="w-20 h-20 text-green-500/20 mb-4" />
           <p className="text-lg font-mono tracking-[0.2em] font-bold text-slate-500">MẠNG LƯỚI SẠCH TINH TƯƠM</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {incidents.map((ticket) => {
              const sts = ticket.status?.toLowerCase() || 'pending';
              const cardBorder = sts === 'pending' ? 'border-red-500/30 shadow-[0_4px_30px_rgba(239,68,68,0.1)]' : (sts === 'processing' ? 'border-amber-500/30' : 'border-slate-700/50 opacity-60');
              const isMyJob = ticket.technician_id === user?.id || user?.role === 'admin';

              return (
                 <div key={ticket.id} className={`glass bg-slate-900/40 rounded-2xl border ${cardBorder} flex flex-col relative overflow-hidden transition-all group hover:border-slate-500`}>
                    
                    {/* Header Thẻ: ID + Trạng Thái + Ngày Giờ */}
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                       <span className="font-mono text-xs font-bold text-slate-400">
                          VÉ LỖI #{String(ticket.id).padStart(4, '0')}
                       </span>
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] flex items-center font-mono text-slate-500">
                             <Clock className="w-3 h-3 mr-1" />
                             {new Date(ticket.created_at).toLocaleString('vi-VN')}
                          </span>
                          <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded border ${statusColors[sts] || statusColors['pending']}`}>
                             {sts}
                          </span>
                       </div>
                    </div>

                    {/* Nội dung Máu Thịt */}
                    <div className="p-5 flex-1">
                       <h3 className="text-lg font-bold text-white mb-4 line-clamp-2 leading-snug drop-shadow-md">
                          {ticket.error_type || 'Mất Tín Hiệu Video Lõi'}
                       </h3>
                       
                       <div className="space-y-3 bg-slate-950/30 p-4 rounded-xl border border-slate-800/80">
                          <div className="flex items-start">
                             <Server className="w-4 h-4 text-slate-500 mr-3 mt-0.5" />
                             <div className="text-sm text-slate-300">
                               <p className="text-[11px] font-bold text-slate-500 uppercase">Trạm Tòa Nhà Điều Phối</p>
                               <p className="font-mono font-black mt-0.5">{ticket.device?.ip_address || `Thiết bị IP Bí Ẩn (ID: ${ticket.device_id})`}</p>
                               <p className="text-xs text-slate-400">{ticket.device?.location?.name || ''}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-start pt-3 border-t border-slate-800">
                             <User className="w-4 h-4 text-slate-500 mr-3 mt-0.5" />
                             <div className="text-sm text-slate-300">
                               <p className="text-[11px] font-bold text-slate-500 uppercase">Kỹ Thuật Viên Chấp Hành</p>
                               <p className="font-medium mt-0.5 text-blue-400">
                                  {ticket.technician?.full_name ? ticket.technician.full_name : '⚠️ CHƯA CÓ AI NHẬN!'}
                               </p>
                             </div>
                          </div>
                          
                          {ticket.resolve_note && (
                             <div className="flex items-start pt-3 border-t border-slate-800 text-green-400/80">
                               <MessageSquare className="w-4 h-4 mr-3 mt-0.5 opacity-70" />
                               <p className="text-xs font-mono">{ticket.resolve_note}</p>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* Footer JIRA: Khối Nút Workflow Thần Thánh */}
                    {sts === 'pending' && (
                       <div className="p-4 bg-red-500/5 border-t border-red-500/10 flex justify-end">
                          <button 
                             onClick={() => handleTicketingWorkflow(ticket.id, 'processing')}
                             className="flex items-center text-xs font-black tracking-widest uppercase bg-red-600/20 hover:bg-red-500 text-red-400 hover:text-white px-5 py-2.5 rounded-lg border border-red-500/40 transition-colors shadow-lg"
                          >
                             <Play className="w-4 h-4 mr-2" /> NHẬN TRÁCH NHIỆM CHỮA
                          </button>
                       </div>
                    )}

                    {sts === 'processing' && isMyJob && (
                       <div className="p-4 bg-amber-500/5 border-t border-amber-500/10 flex flex-col sm:flex-row gap-3">
                          <input 
                             type="text"
                             placeholder="Nhập Log Nhật ký ghi chú khắc phục (Eg: Nối dây điện chuột cắn)..."
                             className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg outline-none px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-amber-500/50"
                             value={resolveNotes[ticket.id] || ''}
                             onChange={(e) => setResolveNotes({...resolveNotes, [ticket.id]: e.target.value})}
                          />
                          <button 
                             onClick={() => handleTicketingWorkflow(ticket.id, 'resolved')}
                             className="flex items-center justify-center shrink-0 text-xs font-black tracking-widest uppercase bg-amber-500/20 hover:bg-green-500 text-amber-500 hover:text-white px-5 py-2.5 rounded-lg border border-amber-500/40 hover:border-green-500 transition-colors shadow-lg group/btn"
                          >
                             <Check className="w-4 h-4 mr-2 group-hover/btn:text-white" /> SỬA CHỮA XONG
                          </button>
                       </div>
                    )}
                 </div>
              );
           })}
        </div>
      )}

      {/* KHỐI 3: DẢI PHÂN TRANG PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6">
           <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="p-2 glass rounded-lg hover:bg-slate-700 disabled:opacity-50 border border-slate-700 transition"
           >
              <ChevronLeft className="w-5 h-5" />
           </button>
           <div className="px-4 py-2 glass rounded-lg font-mono font-bold text-sm border border-slate-700 bg-slate-900">
              TRANG {page} / {totalPages}
           </div>
           <button 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
              className="p-2 glass rounded-lg hover:bg-slate-700 disabled:opacity-50 border border-slate-700 transition"
           >
              <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      )}

      {/* COMPONENT LỒNG TRUY CẬP 4: FORM TẠO VÉ PHẠT MODAL */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
            <div className="glass border border-slate-700/50 rounded-2xl p-6 w-full max-w-lg z-10 shadow-2xl relative animate-enter">
               
               <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
               </button>

               <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mr-4">
                     <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black font-mono tracking-tight text-white">PHÁT ĐỘNG LỖI MỚI</h2>
                     <p className="text-xs text-slate-400">Thiết lập thẻ Ticket buộc Đội KTV Giải Quyết.</p>
                  </div>
               </div>

               <form onSubmit={handleCreateIncident} className="space-y-4">
                  {/* Select NVR */}
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">MÁY NVR GẶP BIẾN</label>
                     <select 
                        required
                        className="w-full bg-slate-900 border border-slate-700 md:border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50"
                        value={formData.device_id}
                        onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                     >
                        <option value="">-- Click Trỏ Máy Trạm Đầu Ghi Bị Lỗi --</option>
                        {devices.map(d => (
                           <option key={d.id} value={d.id}>Trạm NVR: {d.ip_address} ({d.location?.name || 'Vô Danh'})</option>
                        ))}
                     </select>
                  </div>

                  {/* Select Camera (Optional) */}
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                        MẮT CAMERA ĐIẾC
                        <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">TÙY CHỌN (KHÔNG BẮT BUỘC)</span>
                     </label>
                     <p className="text-[10px] text-slate-500 mb-1.5 italic">Nếu chết đứt hẳn Đầu ghi, thì không cần chọn chi tiết Mắt Cam.</p>
                     <input 
                        type="text" 
                        placeholder="ID Mắt Camera (Hiện đang là Text Input do chưa ráp API liên kết Đa Luồng, gõ ID nếu có)" 
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-slate-500"
                        value={formData.camera_id}
                        onChange={(e) => setFormData({...formData, camera_id: e.target.value})}
                     />
                  </div>

                  {/* Lỗi Gây Họa */}
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">BẢN CHẤT CĂN BỆNH</label>
                     <textarea 
                        required
                        placeholder="Mô tả Khách sạn rút ổ cắm, Chuột nhai bung bét... (Bắt Buộc)" 
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none"
                        value={formData.error_type}
                        onChange={(e) => setFormData({...formData, error_type: e.target.value})}
                     />
                  </div>

                  <div className="pt-4 border-t border-slate-700/50 flex justify-end">
                     <button 
                        type="button" 
                        className="px-5 py-2 text-slate-400 font-bold text-xs hover:text-white transition"
                        onClick={() => setIsModalOpen(false)}
                     >
                        HỦY BỎ
                     </button>
                     <button 
                        type="submit" 
                        disabled={creating}
                        className="ml-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-widest uppercase px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 flex items-center"
                     >
                        {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> : null}
                        CHỐT PHÓNG VÉ
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
