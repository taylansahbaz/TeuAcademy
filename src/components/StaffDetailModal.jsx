import { useState } from "react";
import { X, Mail, Loader2, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import clsx from "clsx";

export default function StaffDetailModal({ isOpen, onClose, person }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !person) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", person.id), {
        isDeleted: true
      });
      onClose();
    } catch (error) {
      console.error("Personel silinirken hata:", error);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity animate-fade-in flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header (Minimalist) */}
          <div className="px-8 pt-12 pb-8 border-b border-slate-100 flex flex-col items-center text-center shrink-0">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-3xl text-indigo-600 font-bold overflow-hidden mb-4">
              {person.photoURL ? (
                <img src={person.photoURL} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                person.name?.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{person.name}</h2>
            <p className="text-slate-500 font-medium mt-1">{person.role}</p>
            {person.email && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                <Mail className="w-3.5 h-3.5" />
                <span>{person.email}</span>
              </div>
            )}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-8 space-y-8 bg-slate-50/30">
            
            {/* Uzmanlık Alanları */}
            {(person.jobTags?.length > 0 || person.hobbyTag) && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Uzmanlık & İlgi Alanları</h3>
                <div className="flex flex-wrap gap-2">
                  {person.jobTags?.map(tag => (
                    <span key={tag} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                      {tag}
                    </span>
                  ))}
                  {person.hobbyTag && (
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-100/50">
                      {person.hobbyTag}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Uygun Günler */}
            {person.availableDays?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Uygun Olduğu Günler</h3>
                <div className="flex flex-wrap gap-2">
                  {person.availableDays.map(day => (
                    <span key={day} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                      <CalendarIcon className="w-3 h-3" />
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Biyografi (Optional) */}
            {person.bio && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hakkında</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  {person.bio}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 md:px-8 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            {showConfirm ? (
              <div className="w-full flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100 animate-fade-in">
                <span className="text-sm font-bold text-red-700 ml-2">Emin misiniz?</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Evet, Kaldır"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-400">Bu personeli sistemden geçici olarak kaldırabilirsiniz.</p>
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Sistemden Kaldır
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
