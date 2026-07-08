import { useState, useEffect } from "react";
import { X, BookOpen, User } from "lucide-react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAlert } from "../contexts/AlertContext";

export default function EditWorkshopModal({ isOpen, onClose, workshop, onSuccess }) {
  const { showAlert } = useAlert();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workshop && isOpen) {
      setTitle(workshop.title || "");
      setDescription(workshop.description || "");
      setDate(workshop.date || "");
      setTime(workshop.time || "");
      setEndTime(workshop.endTime || "");
      setMaxCapacity(workshop.capacity || workshop.maxCapacity || "");
    }
  }, [workshop, isOpen]);

  if (!isOpen || !workshop) return null;

  async function handleEditWorkshop(e) {
    e.preventDefault();
    if (!date || !time || !endTime) {
      showAlert("Uyarı", "Lütfen eğitim tarihi, başlangıç ve bitiş saatini seçiniz.", "error");
      return;
    }
    if (time >= endTime) {
      showAlert("Uyarı", "Bitiş saati, başlangıç saatinden sonra olmalıdır.", "error");
      return;
    }

    setLoading(true);
    try {
      // Overlap Check
      const q = query(collection(db, "workshops"), where("date", "==", date));
      const querySnapshot = await getDocs(q);
      const existingWorkshops = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(w => !w.isDeleted && w.id !== workshop.id);
      
      const newStart = time;
      const newEnd = endTime;

      const hasOverlap = existingWorkshops.some(w => {
        const existingStart = w.time;
        const existingEnd = w.endTime || w.time;
        // Overlap condition: newStart < existingEnd AND newEnd > existingStart
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasOverlap) {
        showAlert("Uyarı", "Seçtiğiniz saat aralığında bu tarihte başka bir eğitim bulunmaktadır. Lütfen farklı bir saat seçiniz.", "error");
        setLoading(false);
        return;
      }

      const workshopRef = doc(db, "workshops", workshop.id);
      await updateDoc(workshopRef, {
        title,
        description,
        date,
        time,
        endTime,
        maxCapacity: parseInt(maxCapacity),
        capacity: parseInt(maxCapacity) // keep both for backwards compatibility if needed
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Eğitim güncellenirken hata:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 sm:p-6 py-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-visible animate-scale-in flex flex-col my-auto relative">
        {/* Modal Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(110deg,#4f46e5,#818cf8,#c7d2fe)] p-5 shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-10 backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm leading-none mb-1">Eğitimi Düzenle</h2>
              <p className="text-indigo-50 text-xs font-medium">Eğitim detaylarını güncelleyin.</p>
            </div>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="p-5 overflow-visible">
          <form onSubmit={handleEditWorkshop} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Eğitim Başlığı</label>
              <input 
                type="text" 
                required 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all text-sm" 
                placeholder="Örn: İleri Seviye React Hooks"
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Açıklama</label>
              <textarea 
                required 
                rows="2" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all resize-none text-sm" 
                placeholder="Eğitimin içeriği ve hedefleri hakkında bilgi verin..."
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarih</label>
                <DatePicker value={date} onChange={setDate} buttonClassName="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium text-sm bg-slate-50/50 hover:bg-white border-slate-200" hideIconBg={true} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Başlangıç</label>
                <TimePicker value={time} onChange={setTime} buttonClassName="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium text-sm bg-slate-50/50 hover:bg-white border-slate-200" hideIconBg={true} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bitiş</label>
                <TimePicker value={endTime} onChange={setEndTime} minTime={time} buttonClassName="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium text-sm bg-slate-50/50 hover:bg-white border-slate-200" hideIconBg={true} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kontenjan</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required 
                    min={workshop.attendees?.length || 1}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all text-sm" 
                    placeholder="Örn: 20"
                    value={maxCapacity} 
                    onChange={(e) => setMaxCapacity(e.target.value)} 
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 ml-1">Kayıtlı kişi sayısından ({workshop.attendees?.length || 0}) daha az yapılamaz.</p>
            </div>

            <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm text-sm"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-70 text-sm"
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
