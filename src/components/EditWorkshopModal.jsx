import { useState, useEffect } from "react";
import { X, BookOpen, User } from "lucide-react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function EditWorkshopModal({ isOpen, onClose, workshop }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workshop && isOpen) {
      setTitle(workshop.title || "");
      setDescription(workshop.description || "");
      setDate(workshop.date || "");
      setTime(workshop.time || "");
      setMaxCapacity(workshop.capacity || workshop.maxCapacity || "");
    }
  }, [workshop, isOpen]);

  if (!isOpen || !workshop) return null;

  async function handleEditWorkshop(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const workshopRef = doc(db, "workshops", workshop.id);
      await updateDoc(workshopRef, {
        title,
        description,
        date,
        time,
        maxCapacity: parseInt(maxCapacity),
        capacity: parseInt(maxCapacity) // keep both for backwards compatibility if needed
      });
      onClose();
    } catch (error) {
      console.error("Eğitim güncellenirken hata:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-visible animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(110deg,#4f46e5,#818cf8,#c7d2fe)] p-6 md:p-8 shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-10 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">Eğitimi Düzenle</h2>
              <p className="text-indigo-50 text-sm font-medium mt-1">Eğitim detaylarını güncelleyin.</p>
            </div>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto hide-scrollbar">
          <form onSubmit={handleEditWorkshop} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Eğitim Başlığı</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Açıklama</label>
              <textarea 
                required 
                rows="3" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all resize-none" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tarih</label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Saat</label>
                <TimePicker value={time} onChange={setTime} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kontenjan (Kişi)</label>
              <div className="relative">
                <input 
                  type="number" 
                  required 
                  min={workshop.attendees?.length || 1} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all" 
                  value={maxCapacity} 
                  onChange={(e) => setMaxCapacity(e.target.value)} 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 ml-1">Kayıtlı kişi sayısından ({workshop.attendees?.length || 0}) daha az yapılamaz.</p>
            </div>

            <div className="pt-8 mt-4 flex justify-end gap-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
