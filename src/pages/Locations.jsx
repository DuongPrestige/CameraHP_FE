import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách vị trí');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locations', formData);
      toast.success('Thêm vị trí thành công');
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchLocations();
    } catch (error) {
      toast.error('Lỗi khi thêm vị trí');
    }
  };

  return (
    <div className="text-white animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Building Locations</h1>
          <p className="text-slate-400 text-sm">Quản lý khu nhà xưởng & các toà nhà</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm Vị trí</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="col-span-full glass p-12 rounded-2xl flex flex-col items-center justify-center text-slate-400">
            <Building2 className="w-12 h-12 mb-4 opacity-50" />
            <p>Chưa có Toà nhà/Vị trí nào được khai báo.</p>
          </div>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="glass p-6 rounded-xl hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-900 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{loc.name}</h3>
              <p className="text-slate-400 text-sm line-clamp-2">{loc.description || 'Không có mô tả chi tiết.'}</p>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up px-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Khai báo Tòa nhà</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tên Hiển Thị</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  placeholder="VD: Kho chính Block A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Ghi chú (Tùy chọn)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary h-24 resize-none"
                  placeholder="Mô tả khu vực..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-slate-900 font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
