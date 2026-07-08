import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, Clock, Calendar as CalendarIcon, LogOut, ArrowRight, BarChart as BarChartIcon, Filter, Watch } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import DatePicker from '../components/DatePicker';

export default function AttendanceView() {
  const { currentUser, userProfile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [activeDocId, setActiveDocId] = useState(null);
  const [workingSeconds, setWorkingSeconds] = useState(0);

  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('week'); // 'today', 'week', 'all', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [isAnimatingHistory, setIsAnimatingHistory] = useState(false);

  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);

  const [lastExit, setLastExit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update working duration (seconds)
  useEffect(() => {
    if (isClockedIn && clockInTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diffInMs = now.getTime() - new Date(clockInTime).getTime();
        setWorkingSeconds(Math.floor(diffInMs / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, clockInTime]);

  // Fetch Attendance Data with Real-time listener
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "attendance"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort descending
      records.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));

      setHistory(records);

      // Active session check
      const todaysSession = records.find(r => r.date === todayStr);
      if (todaysSession) {
        setActiveDocId(todaysSession.id);
        setClockInTime(new Date(todaysSession.entryTime));

        if (!todaysSession.exitTime) {
          setIsClockedIn(true);
          const diffInMs = new Date().getTime() - new Date(todaysSession.entryTime).getTime();
          setWorkingSeconds(Math.floor(diffInMs / 1000));
        } else {
          setIsClockedIn(false);
          const diffInMs = new Date(todaysSession.exitTime).getTime() - new Date(todaysSession.entryTime).getTime();
          setWorkingSeconds(Math.floor(diffInMs / 1000));
        }
      } else {
        setIsClockedIn(false);
        setClockInTime(null);
        setActiveDocId(null);
        setWorkingSeconds(0);
      }

      // Last exit
      const completedSessions = records.filter(r => r.exitTime);
      if (completedSessions.length > 0) {
        setLastExit(new Date(completedSessions[0].exitTime));
      }

      // Chart data
      const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
      const chartData = [];
      let totalWeekMins = 0;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const dayOfWeek = d.getDay();
        // Cmt(6) ve Paz(0) günlerini grafikten çıkar
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = d.toISOString().split('T')[0];

        const dayRecords = records.filter(r => r.date === dateStr);
        const dayMins = dayRecords.reduce((acc, curr) => acc + (curr.duration || 0), 0);

        totalWeekMins += dayMins;
        chartData.push({
          day: days[dayOfWeek === 0 ? 6 : dayOfWeek - 1],
          hours: Number((dayMins / 60).toFixed(1)),
          fullDate: dateStr
        });
      }

      setWeeklyData(chartData);
      setWeeklyTotal(Number((totalWeekMins / 60).toFixed(1)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attendance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleClockIn = async () => {
    try {
      const now = new Date();
      await addDoc(collection(db, "attendance"), {
        userId: currentUser.uid,
        userName: userProfile?.name || 'Personel',
        dept: userProfile?.role || 'Genel',
        entryTime: now.toISOString(),
        exitTime: null,
        duration: 0,
        date: now.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error("Clock in error:", error);
    }
  };

  const handleClockOut = async () => {
    try {
      if (!activeDocId || !clockInTime) return;

      const exitTime = new Date();
      const diffInMs = exitTime.getTime() - new Date(clockInTime).getTime();
      const durationMins = Math.floor(diffInMs / 60000);

      await updateDoc(doc(db, "attendance", activeDocId), {
        exitTime: exitTime.toISOString(),
        duration: durationMins
      });
    } catch (error) {
      console.error("Clock out error:", error);
    }
  };

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}s ${minutes}dk ${paddedSeconds}sn`;
    }
    return `${minutes}dk ${paddedSeconds}sn`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl font-medium">
          {label}: {payload[0].value} Saat
        </div>
      );
    }
    return null;
  };

  const handleFilterChange = (filter) => {
    setIsAnimatingHistory(true);
    setTimeout(() => {
      setHistoryFilter(filter);
      if (filter !== 'custom') {
        setCustomDate('');
      }
      setIsAnimatingHistory(false);
    }, 250);
  };

  const getFilteredHistory = () => {
    const now = new Date();
    return history.filter(item => {
      const entryDate = new Date(item.entryTime);
      if (historyFilter === 'today') {
        return entryDate.toDateString() === now.toDateString();
      } else if (historyFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return entryDate >= weekAgo;
      } else if (historyFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return entryDate >= monthAgo;
      } else if (historyFilter === 'custom' && customDate) {
        const entryStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
        return entryStr === customDate;
      }
      return true;
    }).slice(0, 15);
  };

  const filteredHistory = getFilteredHistory();

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in font-sans">

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3 pt-2">

        {/* Clock In/Out Action Card */}
        <div className="bg-indigo-600 p-4 md:p-5 rounded-3xl border border-indigo-500 shadow-lg shadow-indigo-600/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-white/20 text-white rounded-xl shrink-0 backdrop-blur-sm w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-0.5">Canlı Saat</p>
              <h3 className="text-xl font-black text-white tabular-nums tracking-tight leading-none">
                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h3>
            </div>

          </div>

          <div className="relative z-10 mt-4 pt-4 border-t border-indigo-500/50 w-full">
            {!activeDocId ? (
              <button
                onClick={handleClockIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                GİRİŞ YAP
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-sm transition-all shadow-sm active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                {isClockedIn ? "ÇIKIŞ YAP" : "ÇIKIŞI GÜNCELLE"}
              </button>
            )}
          </div>
        </div>

        {/* Today's Work */}
        <div className={clsx(
          "p-4 md:p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between",
          isClockedIn ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx("p-2.5 rounded-xl shrink-0", isClockedIn ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-500")}>
                <Watch className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Bugünkü Çalışma</p>
                <h3 className="text-xl font-black text-slate-900 tabular-nums tracking-tight leading-none whitespace-nowrap">
                  {isClockedIn || workingSeconds > 0 ? formatDuration(workingSeconds) : "0dk 00sn"}
                </h3>
              </div>
            </div>
            {isClockedIn && (
              <span className="px-2 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg uppercase tracking-wider animate-pulse flex items-center gap-1 shrink-0 shadow-sm ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span className="hidden xl:inline">MESAİDE</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50">
            <span className="text-[11px] font-bold text-slate-500">Giriş:</span>
            {clockInTime ? (
              <span className="text-[13px] font-black text-indigo-700 tracking-tight">
                {new Date(clockInTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">-</span>
            )}
          </div>
        </div>

        {/* Weekly Total */}
        <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Haftalık Toplam</p>
              <h3 className="text-xl font-black text-slate-900 tabular-nums tracking-tight leading-none whitespace-nowrap">
                {Math.floor(weeklyTotal)} Saat {Math.round((weeklyTotal % 1) * 60) > 0 ? `${Math.round((weeklyTotal % 1) * 60)} Dakika` : ''}
              </h3>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/60 w-full flex flex-col gap-1.5">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <span>İlerleme</span>
              <span>Hedef: 47 Saat 30 Dakika</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((weeklyTotal / 47) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Last Exit */}
        <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Son Çıkış</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                {lastExit ? lastExit.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : "Yok"}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100/60">
            <span className="text-[11px] font-bold text-slate-500">Tarih:</span>
            <span className="text-[12px] font-bold text-slate-700">
              {lastExit ? lastExit.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8 items-start">

        {/* Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full lg:col-span-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChartIcon className="w-5 h-5 text-indigo-600" />
              Son 7 Gün
            </h2>
          </div>

          <div className="w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(value) => `${value} s`}
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<CustomTooltip />} />
                <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={40}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === weeklyData.length - 1 ? '#0f172a' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full relative z-10 lg:col-span-8">
          <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 gap-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap shrink-0">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="hidden xl:inline">Geçmiş Kayıtlar</span>
              <span className="xl:hidden">Geçmiş</span>
            </h2>

            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 items-center">
              <div className="w-[105px] shrink-0">
                <DatePicker
                  value={customDate}
                  onChange={(val) => {
                    if (!val) return;
                    setCustomDate(val);
                    handleFilterChange('custom');
                  }}
                  buttonClassName={clsx("w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all focus:outline-none", historyFilter === 'custom' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}
                  hideIconBg={true}
                />
              </div>

              <button
                onClick={() => handleFilterChange('week')}
                className={clsx("px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all shrink-0", historyFilter === 'week' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Bu Hafta
              </button>
              <button
                onClick={() => handleFilterChange('month')}
                className={clsx("px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all shrink-0", historyFilter === 'month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Bu Ay
              </button>
            </div>
          </div>
          <div className={clsx("overflow-x-auto transition-opacity duration-250", isAnimatingHistory ? "opacity-0" : "opacity-100")}>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">TARİH</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">GİRİŞ SAATİ</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-right">İZİN BAŞ.</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-right">İZİN BİT.</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">ÇIKIŞ SAATİ</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">SÜRE</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">DURUM</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 text-sm font-medium">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Filter className="w-6 h-6 opacity-50" />
                        <p>Kayıt bulunamadı.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, i) => {
                    const entryTime = new Date(item.entryTime);
                    const isWeekend = entryTime.getDay() === 0 || entryTime.getDay() === 6;
                    const exitTime = item.exitTime ? new Date(item.exitTime) : null;
                    const isLate = entryTime.getHours() > 9 || (entryTime.getHours() === 9 && entryTime.getMinutes() > 15);

                    let durationMins = item.duration || 0;
                    let leaveMins = 0;
                    if (item.leaveStartTime && item.leaveEndTime) {
                      const [lStartH, lStartM] = item.leaveStartTime.split(':').map(Number);
                      const [lEndH, lEndM] = item.leaveEndTime.split(':').map(Number);
                      leaveMins = (lEndH * 60 + lEndM) - (lStartH * 60 + lStartM);
                      if (leaveMins > 0) {
                        durationMins -= leaveMins;
                        if (durationMins < 0) durationMins = 0;
                      }
                    }

                    const hours = Math.floor(durationMins / 60);
                    const mins = durationMins % 60;
                    const durationStr = exitTime ? `${hours}s ${mins}dk` : '-';

                    return (
                      <tr key={item.id || i} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-[12px] font-bold text-slate-900">
                          {entryTime.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-[12px] font-bold text-slate-700">
                          <span className={clsx(isLate && "text-emerald-500")}>
                            {entryTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[12px] font-bold text-amber-600 text-right">
                          {item.leaveStartTime || '-'}
                        </td>
                        <td className="py-3 px-4 text-[12px] font-bold text-amber-600 text-right">
                          {item.leaveEndTime || '-'}
                        </td>
                        <td className="py-3 px-4 text-[12px] font-bold text-slate-700">
                          <span className={clsx(isLate && "text-sky-900")}>
                            {exitTime ? exitTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Devam Ediyor'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[12px] font-semibold text-slate-600">
                          {durationStr}
                        </td>
                        <td className="py-3 px-4">
                          {!exitTime ? (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm animate-pulse flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                              AKTİF
                            </span>
                          ) : isWeekend ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              H. SONU
                            </span>
                          ) : isLate ? (
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              GEÇ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
