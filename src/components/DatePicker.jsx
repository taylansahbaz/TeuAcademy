import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function DatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Track currently viewed month/year in the calendar
  const [currentMonth, setCurrentMonth] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  
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

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday(0) to 6, Monday(1) to 0
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const totalDays = daysInMonth(year, month);
  const startingDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleSelectDate = (day) => {
    // Format as YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
  
  // Create an array of days to render (including blanks for offset)
  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  // Format displayed value
  const displayValue = value ? new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : "";

  // Month Names
  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium",
          isOpen ? "bg-white border-indigo-500 ring-4 ring-indigo-500/10" : "bg-slate-50/50 hover:bg-white border-slate-200 hover:border-slate-300",
          value ? "text-slate-900" : "text-slate-400"
        )}
      >
        <span>{displayValue || "Tarih Seçin"}</span>
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center pointer-events-none">
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-[320px] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-5 animate-scale-in origin-top">
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-bold text-slate-800 text-lg">
              {monthNames[month]} {year}
            </div>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }
              
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              
              // Normalize today's date to local timezone YYYY-MM-DD
              const todayObj = new Date();
              const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={clsx(
                    "h-10 w-full flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200",
                    isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105" : 
                    isToday ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                    "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
