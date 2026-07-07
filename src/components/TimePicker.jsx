import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

export default function TimePicker({ value, onChange, buttonClassName, hideIconBg, selectedDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(value ? value.split(':')[0] : '09');
  const [minute, setMinute] = useState(value ? value.split(':')[1] : '00');
  
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  useEffect(() => {
    if (hour && minute) {
      onChange(`${hour}:${minute}`);
    }
  }, [hour, minute, onChange]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || clsx(
          "w-full flex items-center justify-between px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium",
          isOpen ? "bg-white border-indigo-500 ring-4 ring-indigo-500/10" : "bg-slate-50/50 hover:bg-white border-slate-200 hover:border-slate-300",
          value ? "text-slate-900" : "text-slate-400"
        )}
      >
        <span className="truncate">{value || "Saat Seçin"}</span>
        {!hideIconBg ? (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 pointer-events-none">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
        ) : (
          <Clock className="w-3.5 h-3.5 text-indigo-500 opacity-80 shrink-0 ml-1.5 pointer-events-none" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-[100] bottom-full mb-2 w-full bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-4 animate-scale-in origin-bottom">
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saat Seçimi</span>
          </div>
          <div className="flex items-center justify-center gap-2 h-48 relative overflow-hidden bg-slate-50/50 rounded-xl border border-slate-100">
            {/* Selection highlight */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-12 bg-white rounded-xl shadow-sm border border-indigo-100 pointer-events-none"></div>
            
            {/* Hours Column */}
            <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col items-center pt-[72px] pb-[72px]">
              {hours.map(h => {
                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                const isToday = selectedDate === todayStr;
                const isPastHour = isToday && parseInt(h) < todayObj.getHours();

                return (
                  <div 
                    key={h} 
                    className={clsx(
                      "h-12 shrink-0 flex items-center justify-center snap-center text-xl font-bold cursor-pointer w-full transition-all duration-200",
                      hour === h ? "text-indigo-600 scale-110" : "text-slate-400 hover:text-slate-600 scale-90",
                      isPastHour && "opacity-30 pointer-events-none"
                    )}
                    onClick={() => !isPastHour && setHour(h)}
                  >
                    {h}
                  </div>
                );
              })}
            </div>

            <div className="text-2xl font-bold text-slate-300 pb-1 z-10">:</div>

            {/* Minutes Column */}
            <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col items-center pt-[72px] pb-[72px]">
              {minutes.map(m => {
                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                const isToday = selectedDate === todayStr;
                const isPastMinute = isToday && parseInt(hour) === todayObj.getHours() && parseInt(m) <= todayObj.getMinutes();

                return (
                  <div 
                    key={m} 
                    className={clsx(
                      "h-12 shrink-0 flex items-center justify-center snap-center text-xl font-bold cursor-pointer w-full transition-all duration-200",
                      minute === m ? "text-indigo-600 scale-110" : "text-slate-400 hover:text-slate-600 scale-90",
                      isPastMinute && "opacity-30 pointer-events-none"
                    )}
                    onClick={() => !isPastMinute && setMinute(m)}
                  >
                    {m}
                  </div>
                );
              })}
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="w-full mt-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/20 active:scale-95"
          >
            Seçimi Onayla
          </button>
        </div>
      )}
    </div>
  );
}
