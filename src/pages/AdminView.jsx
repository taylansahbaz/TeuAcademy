import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Calendar, Wifi, Filter, MoreHorizontal, Download, ArrowLeft, ArrowRight, UserMinus, UserPlus, UserPlus2Icon, UserMinus2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminView() {
  const [dateFilter, setDateFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [personnelStream, setPersonnelStream] = useState([]);
  const [metrics, setMetrics] = useState({ present: 0, late: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAttendance = async () => {
      try {
        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];

        let q = query(collection(db, "attendance"));
        const snapshot = await getDocs(q);
        let records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filter based on dateFilter
        records = records.filter(r => {
          const entryDate = new Date(r.entryTime);
          if (dateFilter === 'daily') {
            return r.date === todayStr;
          } else if (dateFilter === 'weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(todayObj.getDate() - 7);
            return entryDate >= weekAgo;
          } else if (dateFilter === 'monthly') {
            const monthAgo = new Date();
            monthAgo.setMonth(todayObj.getMonth() - 1);
            return entryDate >= monthAgo;
          }
          return true;
        });

        records.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));

        let presentCount = 0;
        let lateCount = 0;

        const formattedStream = records.map(r => {
          const entryTime = new Date(r.entryTime);
          const isLate = entryTime.getHours() > 9 || (entryTime.getHours() === 9 && entryTime.getMinutes() > 15);

          if (r.date === todayStr) {
            presentCount++;
            if (isLate) lateCount++;
          }

          const hours = Math.floor((r.duration || 0) / 60);
          const mins = (r.duration || 0) % 60;

          let compliance = isLate ? 'GEÇ' : 'ZAMANINDA';
          if (r.duration > 540) compliance = 'FAZLA MESAİ'; // >9 hours

          return {
            id: r.id,
            initials: r.userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
            name: r.userName || 'Bilinmeyen Kullanıcı',
            dept: r.dept || 'Personel',
            entry: entryTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            exit: r.exitTime ? new Date(r.exitTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Devam Ediyor',
            duration: r.exitTime ? `${hours}s ${mins}dk` : '-',
            compliance: r.exitTime ? compliance : 'MESAİDE'
          };
        });

        setPersonnelStream(formattedStream);

        const usersSnapshot = await getDocs(collection(db, "users"));
        const totalUsers = usersSnapshot.docs.length;

        if (dateFilter === 'daily') {
          setMetrics({ present: presentCount, late: lateCount, totalUsers });
        } else {
          setMetrics({ present: presentCount, late: lateCount, totalUsers });
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAttendance();
  }, [dateFilter]);

  const handleDownloadExcel = () => {
    if (personnelStream.length === 0) return;

    const wsData = personnelStream.map(person => ({
      'Personel Adı': person.name,
      'Departman': person.dept,
      'Giriş Saati': person.entry,
      'Çıkış Saati': person.exit,
      'Çalışma Süresi': person.duration
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Personel Takibi");

    let fileName = "personel_takibi";
    if (dateFilter === 'daily') fileName += "_gunluk";
    else if (dateFilter === 'weekly') fileName += "_haftalik";
    else if (dateFilter === 'monthly') fileName += "_aylik";

    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6 font-sans pb-8 animate-fade-in">

      {/* Premium Header & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/60 pb-6">

        {/* Left: Metrics (Compact & Premium) */}
        <div className="flex items-center gap-5">
          <div className="flex flex-col justify-center px-5 py-3.5 rounded-2xl border border-indigo-100/60 bg-gradient-to-b from-indigo-50/50 to-white shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)] hover:border-indigo-200 transition-all duration-300 min-w-[180px] whitespace-nowrap">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <UserPlus2Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{dateFilter === 'daily' ? 'Bugün Gelenler' : 'Toplam Kayıt'}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{dateFilter === 'daily' ? metrics.present : personnelStream.length}</h3>
                  <span className="text-[10px] font-bold text-indigo-600">KİŞİ</span>
                </div>
              </div>
            </div>
          </div>

          {dateFilter === 'daily' && (
            <div className="flex flex-col justify-center px-5 py-3.5 rounded-2xl border border-amber-100/60 bg-gradient-to-b from-amber-50/50 to-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] hover:border-amber-200 transition-all duration-300 min-w-[180px] whitespace-nowrap">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                  <UserMinus2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Giriş Yapmayanlar</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{Math.max(0, metrics.totalUsers - metrics.present)}</h3>
                    <span className="text-[10px] font-bold text-amber-600">KİŞİ</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-center px-5 py-3.5 rounded-2xl border border-rose-100/60 bg-gradient-to-b from-rose-50/50 to-white shadow-[0_4px_20px_-4px_rgba(225,29,72,0.1)] relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(225,29,72,0.15)] hover:border-rose-200 transition-all duration-300 min-w-[180px] whitespace-nowrap">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Geç Kalanlar</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{dateFilter === 'daily' ? metrics.late : personnelStream.filter(p => p.compliance === 'GEÇ').length}</h3>
                  <span className="text-[10px] font-bold text-rose-600">KİŞİ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Filters & Excel */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-inner">
            {['daily', 'weekly', 'monthly'].map(filter => (
              <button
                key={filter}
                onClick={() => { setLoading(true); setDateFilter(filter); }}
                className={clsx(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                  dateFilter === filter
                    ? "bg-white text-slate-900 shadow-sm scale-100"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 hover:scale-100"
                )}
              >
                {filter === 'daily' ? 'Bugün' : filter === 'weekly' ? 'Bu Hafta' : 'Bu Ay'}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold text-xs transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 group border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* Stream Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden relative group/table transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">

        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/30">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            Personel Hareketleri
          </h2>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/50 border-b border-slate-100">
                <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personel</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giriş Saati</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Çıkış Saati</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Süre</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {personnelStream.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-500 text-sm">
                    Bu tarihte henüz kayıt bulunmuyor.
                  </td>
                </tr>
              ) : (
                personnelStream.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors duration-200 group/row relative">
                    <td className="py-3 px-6 relative">
                      {/* Subtly colored left border indicator based on status on hover */}
                      <div className={clsx(
                        "absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover/row:opacity-100 transition-opacity",
                        row.compliance === 'ZAMANINDA' && "bg-emerald-500",
                        row.compliance === 'GEÇ' && "bg-rose-500",
                        row.compliance === 'FAZLA MESAİ' && "bg-amber-500",
                        row.compliance === 'MESAİDE' && "bg-indigo-500"
                      )}></div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-50 to-white text-indigo-700 border border-indigo-100/80 font-bold flex items-center justify-center shrink-0 text-xs shadow-sm group-hover/row:scale-110 group-hover/row:-rotate-3 transition-transform duration-300">
                          {row.initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px] group-hover/row:text-indigo-600 transition-colors">{row.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{row.dept}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-[13px] font-bold text-slate-700">{row.entry}</td>
                    <td className="py-3 px-6 text-[13px] font-bold text-slate-700">{row.exit}</td>
                    <td className="py-3 px-6 text-[12px] font-semibold text-slate-500">{row.duration}</td>
                    <td className="py-3 px-6">
                      {row.compliance === 'ZAMANINDA' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold ring-1 ring-inset ring-emerald-600/20">
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          ZAMANINDA
                        </span>
                      )}
                      {row.compliance === 'GEÇ' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold ring-1 ring-inset ring-rose-600/20">
                          <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                          GEÇ
                        </span>
                      )}
                      {row.compliance === 'FAZLA MESAİ' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold ring-1 ring-inset ring-amber-600/20">
                          <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                          FAZLA MESAİ
                        </span>
                      )}
                      {row.compliance === 'MESAİDE' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold ring-1 ring-inset ring-indigo-600/20 animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                          ÇALIŞIYOR
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toplam {personnelStream.length} kayıt listeleniyor</p>
        </div>

      </div>
    </div>
  );
}
