import { X, Calendar as CalendarIcon, Clock, Users, ArrowRight, Plus } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";

export default function DayDetailModal({ isOpen, onClose, day, workshops = [], onWorkshopClick, onCreateWorkshopClick }) {
  if (!isOpen || !day) return null;

  const isToday = isSameDay(day, new Date());

  const handleCreateNew = () => {
    onClose();
    if (onCreateWorkshopClick) {
      onCreateWorkshopClick(format(day, 'yyyy-MM-dd'));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity animate-fade-in flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-scale-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-slate-100 shrink-0">
            <div>
              {isToday && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-100 inline-block mb-4">
                  Bugün
                </span>
              )}
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {format(day, 'd MMMM yyyy', { locale: tr })}
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                {format(day, 'EEEE', { locale: tr })}
              </p>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-8 bg-slate-50/50 flex flex-col">
            {workshops.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 flex-1">
                <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mb-5">
                  <CalendarIcon className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg text-slate-900 font-bold mb-2">Planlanmış Eğitim Yok</h3>
                <p className="text-sm font-medium text-slate-500 mb-8 max-w-[250px]">
                  Bu tarih için henüz bir Eğitim veya oturum planlanmamış.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Eğitim Planla
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {workshops.map((w) => {
                  const category = w.category || "Genel";
                  const capacity = parseInt(w.capacity || w.maxCapacity || "0");
                  const attendeesCount = w.attendees?.length || 0;

                  return (
                    <div
                      key={w.id}
                      onClick={() => onWorkshopClick(w)}
                      className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug flex-1">
                          {w.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-md shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{w.time}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{attendeesCount} / {capacity}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Detay <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Create New button at the bottom of the list */}
                <button
                  onClick={handleCreateNew}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl font-bold hover:border-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Bu Güne Yeni Eğitim Ekle
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
