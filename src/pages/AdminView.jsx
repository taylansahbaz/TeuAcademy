import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Calendar, Wifi, Filter, MoreHorizontal, Download, ArrowLeft, ArrowRight, UserMinus, UserPlus, UserPlus2Icon, UserMinus2, Clock, X, Check, Hourglass, ClipboardList, Edit3, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { sendNotification } from '../utils/notifications';
import { db } from '../firebase/config';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAlert } from '../contexts/AlertContext';

export default function AdminView() {
  const { showAlert, showConfirm } = useAlert();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateFilter, setDateFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customMonth, setCustomMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [customWeek, setCustomWeek] = useState(() => {
    const d = new Date();
    const startDate = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - startDate) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((d.getDay() + 1 + days) / 7);
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  });

  const [personnelFilter, setPersonnelFilter] = useState('all');
  const [usersList, setUsersList] = useState([]);

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaveApprovals'
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [personnelStream, setPersonnelStream] = useState([]);
  const [metrics, setMetrics] = useState({ present: 0, late: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAttendance = async () => {
      try {
        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];

        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsersList(usersData);

        let q = query(collection(db, "attendance"));
        const snapshot = await getDocs(q);
        let records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        records = records.filter(r => {
          if (r.date > todayStr) return false; // Gelecek tarihler personel hareketlerinde gösterilmez

          const entryDate = new Date(r.entryTime);

          if (personnelFilter !== 'all' && r.userId !== personnelFilter) return false;

          if (dateFilter === 'daily') {
            return r.date === customDate;
          } else if (dateFilter === 'weekly') {
            if (!customWeek) return true;
            const [year, week] = customWeek.split('-W');
            const d = new Date(year, 0, 1 + (week - 1) * 7);
            const start = new Date(d.setDate(d.getDate() - d.getDay() + 1));
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return entryDate >= start && entryDate < end;
          } else if (dateFilter === 'monthly') {
            if (!customMonth) return true;
            const [year, month] = customMonth.split('-');
            return entryDate.getFullYear() === parseInt(year) && entryDate.getMonth() + 1 === parseInt(month);
          }
          return true;
        });

        records.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));

        let presentCount = 0;
        let lateCount = 0;

        const formattedStream = records.map(r => {
          const entryTime = new Date(r.entryTime);
          const dayOfWeek = entryTime.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // Lateness (TGK): After 08:30
          const entryMins = entryTime.getHours() * 60 + entryTime.getMinutes();
          let latenessMins = 0;
          if (!isWeekend && entryMins > 510) { // 08:30 = 510 mins, no lateness on weekends
            latenessMins = entryMins - 510;
          }
          const isLate = latenessMins > 0;

          if (dateFilter === 'daily') {
            presentCount++;
            if (isLate) lateCount++;
          } else {
            presentCount++;
            if (isLate) lateCount++;
          }

          let exitTime = r.exitTime ? new Date(r.exitTime) : null;
          let overtimeMins = 0;
          let isOvernight = false;

          if (exitTime) {
            const exitDateStr = exitTime.toLocaleDateString('tr-TR');
            const entryDateStr = entryTime.toLocaleDateString('tr-TR');
            if (exitDateStr !== entryDateStr) {
              isOvernight = true;
              if (!isWeekend) {
                // Overnight overtime: From 18:00 to midnight (360 mins) + exit day mins
                const exitDayMins = exitTime.getHours() * 60 + exitTime.getMinutes();
                overtimeMins = 360 + exitDayMins;
              }
            } else {
              if (!isWeekend) {
                const exitMins = exitTime.getHours() * 60 + exitTime.getMinutes();
                if (exitMins > 1080) { // 18:00 = 1080 mins
                  overtimeMins = exitMins - 1080;
                }
              }
            }
          }

          // Intra-day leave (TİK)
          let leaveDurationMins = r.totalLeaveMins || 0;
          if (leaveDurationMins === 0 && r.leaveStartTime && r.leaveEndTime) {
            // Fallback for older records
            const [lStartH, lStartM] = r.leaveStartTime.split(':').map(Number);
            const [lEndH, lEndM] = r.leaveEndTime.split(':').map(Number);
            leaveDurationMins = (lEndH * 60 + lEndM) - (lStartH * 60 + lStartM);
          }
          if (leaveDurationMins < 0) leaveDurationMins = 0;

          // Actual duration = original duration - leave
          let actualDurationMins = (r.duration || 0) - leaveDurationMins;
          if (actualDurationMins < 0) actualDurationMins = 0;

          // If weekend, all worked time is overtime
          if (isWeekend && exitTime) {
            overtimeMins = actualDurationMins;
          }

          const hours = Math.floor(actualDurationMins / 60);
          const mins = actualDurationMins % 60;

          let compliance = isLate ? 'GEÇ' : 'ZAMANINDA';
          if (isWeekend) compliance = 'HAFTA SONU';
          if (overtimeMins > 0 && !isWeekend) compliance = 'FAZLA MESAİ';

          const dayName = entryTime.toLocaleDateString('tr-TR', { weekday: 'long' });

          return {
            id: r.id,
            userId: r.userId,
            initials: r.userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
            name: r.userName || 'Bilinmeyen Kullanıcı',
            date: entryTime.toLocaleDateString('tr-TR'),
            dayName: dayName,
            rawDate: r.date,
            entry: entryTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            exit: exitTime ? exitTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Devam Ediyor',
            duration: exitTime ? `${hours}s ${mins}dk` : '-',
            compliance: exitTime ? compliance : 'MESAİDE',
            leaveStart: r.leaveStartTime || '-',
            leaveEnd: r.leaveEndTime || '-',
            rawLeaveDuration: leaveDurationMins,
            rawLateness: latenessMins,
            rawOvertime: overtimeMins,
            rawActualDuration: exitTime ? actualDurationMins : 0,
            isOvernight: isOvernight,
            rawDoc: r
          };
        });

        setPersonnelStream(formattedStream);

        const totalUsers = usersData.length;

        if (dateFilter === 'daily' && personnelFilter === 'all') {
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
  }, [dateFilter, customDate, customWeek, customMonth, personnelFilter, refreshTrigger]);

  useEffect(() => {
    const q = query(collection(db, 'leave_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeaveRequests(requests);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const leaveId = searchParams.get('leaveId');
    if (leaveId && leaveRequests.length > 0) {
      const found = leaveRequests.find(r => r.id === leaveId);
      if (found) {
        setSelectedLeaveForReview(found);
        setActiveTab('leaveApprovals');
      }
    }
  }, [searchParams, leaveRequests]);

  const updateAttendanceLeavesForDate = async (userId, userName, date) => {
    const leaveQuery = query(collection(db, 'leave_requests'), where('userId', '==', userId), where('date', '==', date), where('status', '==', 'approved'));
    const leaveSnapshot = await getDocs(leaveQuery);
    
    let earliestStart = null;
    let latestEnd = null;
    let totalLeaveMins = 0;

    leaveSnapshot.forEach(docSnap => {
      const leave = docSnap.data();
      const start = leave.startTime;
      const end = leave.endTime;
      
      if (!earliestStart || start < earliestStart) earliestStart = start;
      if (!latestEnd || end > latestEnd) latestEnd = end;

      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      totalLeaveMins += (endH * 60 + endM) - (startH * 60 + startM);
    });

    const attQuery = query(collection(db, 'attendance'), where('userId', '==', userId), where('date', '==', date));
    const attSnapshot = await getDocs(attQuery);

    if (!attSnapshot.empty) {
      const attDoc = attSnapshot.docs[0];
      const data = attDoc.data();
      
      // Eğer izin tamamen iptal edildiyse ve bu kayıt sadece sistem tarafından izin için açılmışsa (gerçek çıkış yoksa ve giriş saati tam 08:30:00 ise)
      if (totalLeaveMins === 0 && !data.exitTime && data.entryTime?.includes('T08:30:00')) {
        await deleteDoc(doc(db, 'attendance', attDoc.id));
      } else {
        await updateDoc(doc(db, 'attendance', attDoc.id), {
          leaveStartTime: earliestStart,
          leaveEndTime: latestEnd,
          totalLeaveMins: totalLeaveMins
        });
      }
    } else if (totalLeaveMins > 0) {
      await addDoc(collection(db, 'attendance'), {
        userId: userId,
        userName: userName,
        date: date,
        entryTime: new Date(`${date}T08:30:00`).toISOString(),
        leaveStartTime: earliestStart,
        leaveEndTime: latestEnd,
        totalLeaveMins: totalLeaveMins
      });
    }
  };

  const handleAction = async (requestId, action, userId, userName, date, startTime, endTime) => {
    try {
      const requestRef = doc(db, 'leave_requests', requestId);

      if (action === 'approve') {
        await updateDoc(requestRef, { status: 'approved', updatedAt: serverTimestamp() });
        await updateAttendanceLeavesForDate(userId, userName, date);

        await sendNotification({
          userId: userId,
          type: 'leave_approved',
          title: 'İzin Talebiniz Onaylandı',
          message: `${date} tarihindeki izniniz onaylanmış ve mesai kaydınıza işlenmiştir.`,
          referenceId: requestId
        });

      } else if (action === 'reject') {
        await updateDoc(requestRef, { status: 'rejected', updatedAt: serverTimestamp() });
        await updateAttendanceLeavesForDate(userId, userName, date);

        await sendNotification({
          userId: userId,
          type: 'leave_rejected',
          title: 'İzin Talebiniz Reddedildi',
          message: `${date} tarihindeki izniniz yönetici tarafından reddedildi.`,
          referenceId: requestId
        });
      }

      setRefreshTrigger(prev => prev + 1);

      // Close modal if open
      if (selectedLeaveForReview?.id === requestId) {
        setSelectedLeaveForReview(null);
        searchParams.delete('leaveId');
        setSearchParams(searchParams);
      }

    } catch (error) {
      console.error("Error processing leave action:", error);
      showAlert("Hata", "İşlem sırasında bir hata oluştu.", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><Check className="w-3 h-3" /> ONAYLANDI</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><X className="w-3 h-3" /> REDDEDİLDİ</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-pink-200 text-pink-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><X className="w-3 h-3" /> İPTAL EDİLDİ</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><Hourglass className="w-3 h-3 animate-pulse" /> BEKLİYOR</span>;
    }
  };

  const toDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const entryDateObj = new Date(editingAttendance.entryTime);
      const exitDateObj = editingAttendance.exitTime ? new Date(editingAttendance.exitTime) : null;
      let durationMins = 0;
      if (exitDateObj) {
        durationMins = Math.floor((exitDateObj - entryDateObj) / 60000);
        if (durationMins < 0) durationMins = 0;
      }

      let totalLeaveMins = 0;
      if (editingAttendance.leaveStartTime && editingAttendance.leaveEndTime) {
         const [lStartH, lStartM] = editingAttendance.leaveStartTime.split(':').map(Number);
         const [lEndH, lEndM] = editingAttendance.leaveEndTime.split(':').map(Number);
         totalLeaveMins = (lEndH * 60 + lEndM) - (lStartH * 60 + lStartM);
         if (totalLeaveMins < 0) totalLeaveMins = 0;
      }

      const docRef = doc(db, 'attendance', editingAttendance.id);
      await updateDoc(docRef, {
        entryTime: editingAttendance.entryTime,
        exitTime: editingAttendance.exitTime || null,
        leaveStartTime: editingAttendance.leaveStartTime || null,
        leaveEndTime: editingAttendance.leaveEndTime || null,
        totalLeaveMins: totalLeaveMins,
        duration: durationMins
      });
      setEditingAttendance(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert("Hata", "Güncelleme başarısız.", "error");
    }
    setIsSaving(false);
  };

  const handleSaveLeave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, 'leave_requests', editingLeave.id);
      await updateDoc(docRef, {
        date: editingLeave.date,
        startTime: editingLeave.startTime,
        endTime: editingLeave.endTime,
        reason: editingLeave.reason || ''
      });
      // Update attendance in case they changed the times of an approved leave
      if (editingLeave.status === 'approved') {
        // Note: if they changed the date, this only updates the NEW date. 
        // For perfect sync, they shouldn't change dates, but this is a good start.
        await updateAttendanceLeavesForDate(editingLeave.userId, editingLeave.userName, editingLeave.date);
      }
      setEditingLeave(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert("Hata", "Güncelleme başarısız.", "error");
    }
    setIsSaving(false);
  };

  const handleDeleteAttendance = async (id) => {
    const isConfirmed = await showConfirm(
      "Emin misiniz?",
      "Bu mesai kaydını tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
    );
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'attendance', id));
      setEditingAttendance(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert("Hata", "Silme işlemi başarısız oldu.", "error");
    }
  };

  const handleCancelLeave = async (id) => {
    const isConfirmed = await showConfirm(
      "İzni İptal Et",
      "Bu izin talebini iptal etmek istediğinize emin misiniz?"
    );
    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, 'leave_requests', id), { status: 'cancelled', updatedAt: serverTimestamp() });
      await updateAttendanceLeavesForDate(editingLeave.userId, editingLeave.userName, editingLeave.date);
      setEditingLeave(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert("Hata", "İptal işlemi başarısız oldu.", "error");
    }
  };

  const handleDownloadExcel = () => {
    if (personnelStream.length === 0) return;

    let totalLeave = 0;
    let totalLateness = 0;
    let totalWork = 0;
    let totalOvertime = 0;
    let overnightOvertimes = [];

    const wsData = personnelStream.map(person => {
      totalLeave += person.rawLeaveDuration;
      totalLateness += person.rawLateness;
      totalWork += person.rawActualDuration;
      totalOvertime += person.rawOvertime;

      if (person.isOvernight) {
        overnightOvertimes.push(`${person.name} (${person.date})`);
      }

      return {
        'Personel Adı': person.name,
        'Tarih': person.date,
        'Giriş Saati': person.entry,
        'Çıkış Saati': person.exit,
        'İzin Başlangıç': person.leaveStart !== '-' ? person.leaveStart : '',
        'İzin Bitiş': person.leaveEnd !== '-' ? person.leaveEnd : '',
        'Çalışma Süresi': person.duration
      };
    });

    const formatMins = (mins) => `${Math.floor(mins / 60)}s ${mins % 60}dk`;

    wsData.push({});
    wsData.push({});
    wsData.push({ 'Personel Adı': 'ÖZET VERİLER' });
    wsData.push({ 'Personel Adı': 'TİK (Toplam İzin Kullanımı)', 'Tarih': formatMins(totalLeave) });
    wsData.push({ 'Personel Adı': 'TGK (Toplam Geç Kalma)', 'Tarih': formatMins(totalLateness) });
    wsData.push({ 'Personel Adı': 'Toplam Çalışma Süresi', 'Tarih': formatMins(totalWork) });
    wsData.push({ 'Personel Adı': 'TM (Toplam Fazla Mesai Süresi)', 'Tarih': formatMins(totalOvertime) });
    wsData.push({});
    wsData.push({ 'Personel Adı': '(TGK + TİK) - TOPLAM MESAİ', 'Tarih': formatMins(Math.max(0, (totalLateness + totalLeave) - totalWork)) });
    wsData.push({ 'Personel Adı': 'TM - (TGK + TİK)', 'Tarih': formatMins(Math.max(0, totalOvertime - (totalLateness + totalLeave))) });
    wsData.push({ 'Personel Adı': 'TİK + TGK', 'Tarih': formatMins(totalLeave + totalLateness) });
    wsData.push({});
    wsData.push({ 'Personel Adı': 'GÜN AŞIRI MESAİLER', 'Tarih': overnightOvertimes.length > 0 ? overnightOvertimes.join(', ') : 'Yok' });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);

    const colWidths = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Personel Takibi");

    const selectedUser = personnelFilter === 'all' ? 'Tum_Personel' : usersList.find(u => u.id === personnelFilter)?.name?.replace(/\s+/g, '_') || 'Personel';
    let fileName = `${selectedUser}`;

    if (dateFilter === 'daily') fileName += `_${customDate}_Gunluk_Liste`;
    else if (dateFilter === 'weekly') fileName += `_${customWeek}_Haftalik_Liste`;
    else if (dateFilter === 'monthly') fileName += `_${customMonth}_Aylik_Liste`;

    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };


  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6 font-sans pb-8 animate-fade-in">

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200/60 px-2 mt-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={clsx(
            "pb-3 text-sm font-bold transition-all relative flex items-center gap-2",
            activeTab === 'attendance' ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Clock className="w-4 h-4" />
          Mesai Kayıtları
          {activeTab === 'attendance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-md"></div>}
        </button>
        <button
          onClick={() => setActiveTab('leaveApprovals')}
          className={clsx(
            "pb-3 text-sm font-bold transition-all relative flex items-center gap-2",
            activeTab === 'leaveApprovals' ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <div className="relative">
            <ClipboardList className="w-4 h-4" />
            {leaveRequests.some(r => r.status === 'pending') && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 shadow-sm border border-white"></span>
            )}
          </div>
          İzin Onayları
          {activeTab === 'leaveApprovals' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-md"></div>}
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">

              <select
                value={personnelFilter}
                onChange={(e) => { setLoading(true); setPersonnelFilter(e.target.value); }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">Tüm Personel</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-inner">
                {['daily', 'weekly', 'monthly'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => { setLoading(true); setDateFilter(filter); }}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                      dateFilter === filter
                        ? "bg-white text-slate-900 shadow-sm scale-100"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 hover:scale-100"
                    )}
                  >
                    {filter === 'daily' ? 'Günlük' : filter === 'weekly' ? 'Haftalık' : 'Aylık'}
                  </button>
                ))}
              </div>

              {dateFilter === 'daily' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => { setLoading(true); setCustomDate(e.target.value); }}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                />
              )}
              {dateFilter === 'weekly' && (
                <input
                  type="week"
                  value={customWeek}
                  onChange={(e) => { setLoading(true); setCustomWeek(e.target.value); }}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                />
              )}
              {dateFilter === 'monthly' && (
                <input
                  type="month"
                  value={customMonth}
                  onChange={(e) => { setLoading(true); setCustomMonth(e.target.value); }}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                />
              )}



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
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarih</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gün</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giriş Saati</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Çıkış Saati</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">İzin Baş.</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">İzin Bit.</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Süre</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Durum</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {personnelStream.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-16 text-center text-slate-500 text-sm">
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
                        <td className="py-3 px-6 text-[13px] font-semibold text-slate-600">{row.date}</td>
                        <td className="py-3 px-6 text-[13px] font-semibold text-slate-600">{row.dayName}</td>
                        <td className="py-3 px-6 text-[13px] font-bold text-slate-700">{row.entry}</td>
                        <td className="py-3 px-6 text-[13px] font-bold text-slate-700">{row.exit}</td>
                        <td className="py-3 px-6 text-[13px] font-bold text-amber-600">{row.leaveStart !== '-' ? row.leaveStart : '-'}</td>
                        <td className="py-3 px-6 text-[13px] font-bold text-amber-600">{row.leaveEnd !== '-' ? row.leaveEnd : '-'}</td>
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
                        <td className="py-3 px-6 text-right">
                          <button
                            onClick={() => {
                              setEditingAttendance({
                                id: row.id,
                                entryTime: row.rawDoc.entryTime,
                                exitTime: row.rawDoc.exitTime || '',
                                leaveStartTime: row.rawDoc.leaveStartTime || '',
                                leaveEndTime: row.rawDoc.leaveEndTime || ''
                              });
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
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
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full relative z-10 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Bekleyen ve Geçmiş İzin Talepleri</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Personellerin gün içi izin taleplerini buradan onaylayın veya reddedin.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">PERSONEL</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">İZİN TARİHİ</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">SAAT ARALIĞI</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">SEBEP</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">DURUM</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-right">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-sm font-medium">
                      Henüz izin talebi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => (
                    <tr key={req.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-[13px] font-bold text-slate-900">
                        {req.userName}
                      </td>
                      <td className="py-4 px-6 text-[13px] font-bold text-slate-700">
                        {req.date}
                      </td>
                      <td className="py-4 px-6 text-[13px] font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {req.startTime} - {req.endTime}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[13px] font-medium text-slate-600 max-w-[200px] truncate" title={req.reason}>
                        {req.reason || '-'}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'approve', req.userId, req.userName, req.date, req.startTime, req.endTime)}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'reject', req.userId, req.userName, req.date, req.startTime, req.endTime)}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Reddet
                            </button>
                            <button
                              onClick={() => setEditingLeave(req)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-bold text-slate-400">İŞLEM YAPILDI</span>
                            <button
                              onClick={() => setEditingLeave(req)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Edit Modal */}
      {editingAttendance && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative p-6 md:p-8">
            <button
              onClick={() => setEditingAttendance(null)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 mb-6">Mesai Kaydını Düzenle</h2>

            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">GİRİŞ SAATİ</label>
                <input
                  type="datetime-local"
                  required
                  value={toDatetimeLocal(editingAttendance.entryTime)}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, entryTime: new Date(e.target.value).toISOString() })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ÇIKIŞ SAATİ</label>
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(editingAttendance.exitTime)}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, exitTime: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">İZİN BAŞLANGIÇ</label>
                  <input
                    type="time"
                    value={editingAttendance.leaveStartTime}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, leaveStartTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">İZİN BİTİŞ</label>
                  <input
                    type="time"
                    value={editingAttendance.leaveEndTime}
                    onChange={(e) => setEditingAttendance({ ...editingAttendance, leaveEndTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleDeleteAttendance(editingAttendance.id)}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Leave Request Edit Modal */}
      {editingLeave && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative p-6 md:p-8">
            <button
              onClick={() => setEditingLeave(null)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 mb-6">İzin Talebini Düzenle</h2>

            <form onSubmit={handleSaveLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">İZİN TARİHİ</label>
                <input
                  type="date"
                  required
                  value={editingLeave.date}
                  onChange={(e) => setEditingLeave({ ...editingLeave, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">BAŞLANGIÇ</label>
                  <input
                    type="time"
                    required
                    value={editingLeave.startTime}
                    onChange={(e) => setEditingLeave({ ...editingLeave, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">BİTİŞ</label>
                  <input
                    type="time"
                    required
                    value={editingLeave.endTime}
                    onChange={(e) => setEditingLeave({ ...editingLeave, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">İZİN SEBEBİ</label>
                <textarea
                  rows="2"
                  value={editingLeave.reason || ''}
                  onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleCancelLeave(editingLeave.id)}
                  className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl flex items-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  İzni İptal Et
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Leave Request Review Modal */}
      {selectedLeaveForReview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col relative p-6">
            <button
              onClick={() => {
                setSelectedLeaveForReview(null);
                searchParams.delete('leaveId');
                setSearchParams(searchParams);
              }}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                <Hourglass className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">İzin Onayı</h3>
                <p className="text-xs font-medium text-slate-500">{selectedLeaveForReview.userName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">İZİN TARİHİ</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLeaveForReview.date}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">SAAT ARALIĞI</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLeaveForReview.startTime} - {selectedLeaveForReview.endTime}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">DURUM</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedLeaveForReview.status === 'approved' ? 'Onaylandı' :
                    selectedLeaveForReview.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">İZİN SEBEBİ</p>
                <p className="text-sm font-semibold text-slate-700 break-words">{selectedLeaveForReview.reason || 'Belirtilmedi'}</p>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex flex-col gap-3">
              {selectedLeaveForReview.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleAction(selectedLeaveForReview.id, 'approve', selectedLeaveForReview.userId, selectedLeaveForReview.userName, selectedLeaveForReview.date, selectedLeaveForReview.startTime, selectedLeaveForReview.endTime);
                    }}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors text-center"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => {
                      handleAction(selectedLeaveForReview.id, 'reject', selectedLeaveForReview.userId, selectedLeaveForReview.userName, selectedLeaveForReview.date, selectedLeaveForReview.startTime, selectedLeaveForReview.endTime);
                    }}
                    className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors text-center"
                  >
                    Reddet
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedLeaveForReview(null);
                  searchParams.delete('leaveId');
                  setSearchParams(searchParams);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
