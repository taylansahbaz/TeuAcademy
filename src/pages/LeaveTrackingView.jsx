import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Calendar, Clock, Check, X, Hourglass, Plus, AlertCircle, FileText, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { sendNotification } from '../utils/notifications';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAlert } from '../contexts/AlertContext';

export default function LeaveTrackingView() {
  const { currentUser, userProfile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for normal users
  const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', reason: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'leave_requests'), where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort on client side to avoid Firebase composite index requirement
      requests.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setLeaveRequests(requests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const leaveId = searchParams.get('leaveId');
    if (leaveId && leaveRequests.length > 0) {
      const found = leaveRequests.find(r => r.id === leaveId);
      if (found) setSelectedLeave(found);
    }
  }, [searchParams, leaveRequests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.reason) {
      showAlert("Uyarı", "Lütfen tüm alanları doldurun.", "error");
      return;
    }

    if (!isAdmin) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.date < todayStr) {
        showAlert("Uyarı", "Geçmiş tarihler için izin talebi oluşturulamaz.", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'leave_requests'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Notify admins
      await sendNotification({
        userId: 'admin_global',
        type: 'new_leave_request',
        title: 'Yeni İzin Talebi',
        message: `${userProfile?.name || 'Bir personel'} ${formData.date} tarihi için izin talep etti.`,
        referenceId: docRef.id
      });

      setFormData({ date: '', startTime: '', endTime: '', reason: '' });
      setShowForm(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showAlert("Hata", "Talep gönderilirken hata oluştu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    const isConfirmed = await showConfirm(
      "Emin misiniz?",
      "Bu izin talebini iptal etmek istediğinize emin misiniz?"
    );
    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, 'leave_requests', id), { status: 'cancelled', updatedAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
      showAlert("Hata", "Talebi iptal ederken hata oluştu.", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><Check className="w-3 h-3" /> ONAYLANDI</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><X className="w-3 h-3" /> REDDEDİLDİ</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><X className="w-3 h-3" /> İPTAL EDİLDİ</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 w-fit"><Hourglass className="w-3 h-3 animate-pulse" /> BEKLİYOR</span>;
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6 font-sans animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            Gün içi izin taleplerinizi oluşturun ve geçmiş taleplerinizi takip edin.
          </h1>

        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2 w-fit"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "İptal" : "Yeni İzin Talep Et"}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative p-6 md:p-8">
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">Yeni İzin Talebi</h2>
            <p className="text-sm font-medium text-slate-500 mb-6">
              İzin talebiniz onaylandıktan sonra mesai sürenizden otomatik olarak düşülecektir.
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">İzin Tarihi</label>
                <input
                  type="date"
                  required
                  min={!isAdmin ? new Date().toISOString().split('T')[0] : undefined}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Başlangıç</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Bitiş</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">İzin Sebebi</label>
                <textarea
                  required
                  rows="2"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="İzin isteme sebebinizi kısaca açıklayınız..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Gönderiliyor...
                    </>
                  ) : (
                    'Talebi Gönder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col items-center text-center relative p-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Talep Oluşturuldu!</h2>
            <p className="text-sm font-medium text-slate-500 mb-8">
              İzin talebiniz başarıyla yönetici onayına sunuldu. Onaylandığında mesai sürenizden otomatik düşülecektir.
            </p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Leave Details Modal */}
      {selectedLeave && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col relative p-6">
            <button 
              onClick={() => {
                setSelectedLeave(null);
                searchParams.delete('leaveId');
                setSearchParams(searchParams);
              }}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                selectedLeave.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                selectedLeave.status === 'rejected' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
              )}>
                {selectedLeave.status === 'approved' ? <Check className="w-5 h-5" /> : 
                 selectedLeave.status === 'rejected' ? <X className="w-5 h-5" /> : <Hourglass className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">İzin Detayı</h3>
                <p className="text-xs font-medium text-slate-500">{selectedLeave.date}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">SAAT ARALIĞI</p>
                <p className="text-sm font-semibold text-slate-700">{selectedLeave.startTime} - {selectedLeave.endTime}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">DURUM</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedLeave.status === 'approved' ? 'Onaylandı' : 
                   selectedLeave.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">İZİN SEBEBİ</p>
                <p className="text-sm font-semibold text-slate-700 break-words">{selectedLeave.reason || 'Belirtilmedi'}</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setSelectedLeave(null);
                searchParams.delete('leaveId');
                setSearchParams(searchParams);
              }}
              className="w-full mt-6 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full relative z-10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/50">
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
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-sm font-medium">
                    Henüz izin talebi bulunmuyor.
                  </td>
                </tr>
              ) : (
                leaveRequests.map((req) => (
                  <tr key={req.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
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
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors inline-flex"
                          title="Talebi İptal Et"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
