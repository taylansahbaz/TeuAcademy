import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import clsx from "clsx";
import DayDetailModal from "../components/DayDetailModal";
import WorkshopModal from "../components/WorkshopModal";

export default function CalendarView({ onCreateWorkshopClick }) {
  const [workshops, setWorkshops] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [selectedDay, setSelectedDay] = useState(null); // Full day view
  const [selectedWorkshop, setSelectedWorkshop] = useState(null); // Specific workshop detail view

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "workshops"), (snapshot) => {
      const workshopsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(w => !w.isDeleted);
      setWorkshops(workshopsData);
    });
    return () => unsubscribe();
  }, []);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Handle opening workshop detail directly from a calendar block or from within the day modal
  const handleWorkshopClick = (e, workshop) => {
    e.stopPropagation(); // Don't trigger day click
    setSelectedWorkshop(workshop);
  };

  return (
    <div className="animate-fade-in min-h-full min-h-[700px] flex flex-col relative pb-20">

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
        workshops={workshops.filter(w => selectedDay && w.date && isSameDay(parseISO(w.date), selectedDay))}
        onWorkshopClick={(w) => setSelectedWorkshop(w)}
        onCreateWorkshopClick={onCreateWorkshopClick}
      />

      {/* Workshop Detail Modal (Higher z-index overlays Day modal if open) */}
      <WorkshopModal
        isOpen={!!selectedWorkshop}
        onClose={() => setSelectedWorkshop(null)}
        workshop={selectedWorkshop}
      />

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full flex-1">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-extrabold text-slate-900 capitalize flex items-center gap-2">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="min-w-[800px] h-full flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                <div key={day} className="py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 bg-white flex-1 auto-rows-fr">
              {/* Padding for first day */}
              {Array.from({ length: startOfMonth(currentDate).getDay() === 0 ? 6 : startOfMonth(currentDate).getDay() - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 border-b border-r border-slate-100/50 bg-indigo-50"></div>
              ))}

              {daysInMonth.map(day => {
                const dayWorkshops = workshops.filter(w => w.date && isSameDay(parseISO(w.date), day)).sort((a, b) => a.time.localeCompare(b.time));
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={clsx(
                      "p-1.5 sm:p-2 border-b border-r border-slate-100/60 transition-all duration-300 hover:bg-slate-50 hover:shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] flex flex-col cursor-pointer group relative min-h-0 overflow-hidden",
                      isToday ? "bg-slate-50/30" : "bg-white",
                      isPast && !isToday ? "opacity-60 hover:opacity-100 bg-slate-50/40" : "opacity-100"
                    )}
                  >
                    {isToday && <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
                    
                    <div className="flex justify-between items-start mb-1.5 shrink-0 px-1">
                      {isToday ? (
                        <span className="text-[9px] font-bold text-indigo-600 tracking-wider mt-1">Bugün</span>
                      ) : <div></div>}
                      <span className={clsx(
                        "w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
                        isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 overflow-y-auto hide-scrollbar min-h-0 px-0.5 pb-1">
                      {dayWorkshops.map((w, index) => (
                        <div
                          key={w.id}
                          onClick={(e) => handleWorkshopClick(e, w)}
                          className="bg-indigo-50 hover:bg-indigo-100/80 px-2 py-1.5 rounded-md border border-indigo-100/50 hover:border-indigo-300 transition-all duration-200 text-left flex items-center gap-1.5 w-full cursor-pointer group/item"
                          title={w.title}
                        >
                          <span className="text-[9px] font-extrabold text-indigo-600 shrink-0">{w.time}{w.endTime ? `-${w.endTime}` : ''}</span>
                          <span className="text-[10px] font-bold text-slate-700 truncate">{w.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
