import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, Users, ArrowRight, Loader2, Check, Trash2, Edit2, User, InfoIcon, Info, BadgeInfo } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import EditWorkshopModal from "./EditWorkshopModal";
import { sendNotification } from "../utils/notifications";

export default function WorkshopModal({ isOpen, onClose, workshop }) {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localWorkshop, setLocalWorkshop] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [attendeeProfiles, setAttendeeProfiles] = useState([]);

  useEffect(() => {
    if (workshop?.id && isOpen) {
      const unsub = onSnapshot(doc(db, "workshops", workshop.id), (docSnap) => {
        if (docSnap.exists()) {
          setLocalWorkshop({ id: docSnap.id, ...docSnap.data() });
        }
      });
      return () => unsub();
    } else if (workshop) {
      setLocalWorkshop(workshop);
    }
  }, [workshop, isOpen]);

  useEffect(() => {
    async function fetchAttendees() {
      if (localWorkshop?.attendees?.length > 0) {
        const profiles = [];
        for (const uid of localWorkshop.attendees) {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              profiles.push({ uid, ...userDoc.data() });
            }
          } catch (error) {
            console.error("Katılımcı bilgisi çekilemedi:", error);
          }
        }
        setAttendeeProfiles(profiles);
      } else {
        setAttendeeProfiles([]);
      }
    }
    fetchAttendees();
  }, [localWorkshop?.attendees]);

  if (!isOpen || !localWorkshop) return null;

  const category = localWorkshop.category || "Genel";
  const capacity = parseInt(localWorkshop.capacity || localWorkshop.maxCapacity || "0");
  const attendeesCount = localWorkshop.attendees?.length || 0;
  const progressPercent = capacity > 0 ? Math.min((attendeesCount / capacity) * 100, 100) : 0;
  const isCreator = currentUser?.uid === localWorkshop.creatorId;
  const isRegistered = localWorkshop.attendees?.includes(currentUser?.uid);
  const isFull = attendeesCount >= capacity;

  let isPastWorkshop = false;
  if (localWorkshop.date) {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    if (localWorkshop.date < todayStr) {
      isPastWorkshop = true;
    } else if (localWorkshop.date === todayStr && localWorkshop.time) {
      const [h, m] = localWorkshop.time.split(':').map(Number);
      if (h < todayObj.getHours() || (h === todayObj.getHours() && m < todayObj.getMinutes())) {
        isPastWorkshop = true;
      }
    }
  }

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleDeleteWorkshop = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "workshops", localWorkshop.id), {
        isDeleted: true
      });
      onClose();
    } catch (error) {
      console.error("Eğitim silinirken hata:", error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRegisterToggle = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const workshopRef = doc(db, "workshops", localWorkshop.id);
      if (isRegistered) {
        // Unregister
        await updateDoc(workshopRef, {
          attendees: arrayRemove(currentUser.uid)
        });
        setLocalWorkshop(prev => ({
          ...prev,
          attendees: (prev.attendees || []).filter(id => id !== currentUser.uid)
        }));
        showToast("Kayıttan başarıyla çıkıldı.");
      } else {
        // Register (only if not full)
        if (!isFull) {
          await updateDoc(workshopRef, {
            attendees: arrayUnion(currentUser.uid)
          });
          setLocalWorkshop(prev => ({
            ...prev,
            attendees: [...(prev.attendees || []), currentUser.uid]
          }));
          showToast("Başarıyla kayıt olundu!");

          const userName = userProfile?.name || currentUser?.displayName || "Biri";

          // Send notification to creator
          if (localWorkshop.creatorId !== currentUser.uid) {
            await sendNotification({
              userId: localWorkshop.creatorId,
              title: "Eğitiminize Yeni Katılımcı",
              message: `${userName}, ${localWorkshop.title} eğitiminize kayıt oldu!`,
              type: "new_attendee"
            });
          }

          // Send notification to other attendees
          if (localWorkshop.attendees && localWorkshop.attendees.length > 0) {
            for (const attendeeId of localWorkshop.attendees) {
              if (attendeeId !== currentUser.uid && attendeeId !== localWorkshop.creatorId) {
                await sendNotification({
                  userId: attendeeId,
                  title: "Eğitime Yeni Katılımcı",
                  message: `Kayıtlı olduğunuz ${localWorkshop.title} eğitimine ${userName} katıldı.`,
                  type: "new_attendee"
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Kayıt işlemi sırasında hata oluştu:", error);
    } finally {
      setLoading(false);
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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-8 md:p-10">


            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-8 tracking-tight">
              {localWorkshop.title}
            </h2>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-3 sm:flex sm:flex-row items-center gap-4 sm:gap-8 mb-10 pb-10 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tarih</p>
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span>{localWorkshop.date ? format(parseISO(localWorkshop.date), 'dd MMMM yyyy', { locale: tr }) : "Belirtilmemiş"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saat</p>
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{localWorkshop.time}{localWorkshop.endTime ? ` - ${localWorkshop.endTime}` : ''}</span>
                </div>
              </div>
              <div className="sm:max-w-xs flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Eğitim Hakkında</p>
                <div className="text-slate-900 leading-relaxed font-semibold whitespace-pre-wrap text-sm max-h-32 overflow-y-auto pr-2 hide-scrollbar">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <BadgeInfo className="w-4 h-4 text-slate-400" />
                    {localWorkshop.description || "Bu Eğitim için henüz bir açıklama girilmemiş."}
                  </div>
                </div>
              </div>
            </div>



            {/* Instructor & Capacity Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

              {/* Instructor */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Eğitmen</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200 shadow-sm shrink-0 overflow-hidden">
                    {localWorkshop.creatorName ? localWorkshop.creatorName.charAt(0).toUpperCase() : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">
                      {localWorkshop.creatorName || "Bilinmiyor"}
                    </h4>

                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kontenjan Durumu</h3>
                  <div className="text-right leading-none">
                    <span className="text-lg font-bold text-slate-900">{attendeesCount}</span>
                    <span className="text-sm font-medium text-slate-500"> / {capacity}</span>
                  </div>
                </div>

                {/* Minimal Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000",
                      progressPercent >= 100 ? "bg-slate-900" : "bg-indigo-600"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-500">
                  {progressPercent >= 100 ? "Kontenjan Dolu" : `${capacity - attendeesCount} kişilik yer kaldı`}
                </p>
              </div>

            </div>

            {/* Katılımcı Listesi */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Katılımcı Listesi ({attendeesCount})</h3>
              {attendeeProfiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attendeeProfiles.map(profile => (
                    <div key={profile.uid} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl transition-colors hover:bg-slate-100">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shrink-0">
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{profile.name}</p>
                        <p className="text-xs text-slate-500 truncate">{profile.role || "Öğrenci"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">Henüz katılımcı bulunmamaktadır.</p>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 md:px-10 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            {isCreator ? (
              <p className="text-sm font-bold text-slate-500">Bu eğitimi siz oluşturdunuz.</p>
            ) : isPastWorkshop ? (
              <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Bu eğitim geçmişte kaldı.
              </p>
            ) : isRegistered ? (
              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Bu eğitime kayıtlısınız.
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-500 hidden sm:block">
                {isFull ? "Bu eğitim için kontenjan dolmuştur." : "Kayıt olmak için hemen yerinizi ayırtın."}
              </p>
            )}

            <div className="flex gap-3 w-full sm:w-auto">

              {isCreator ? (
                showDeleteConfirm ? (
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3 bg-red-50 p-2 sm:px-4 sm:py-2 rounded-xl border border-red-100 animate-fade-in">
                    <span className="text-sm font-bold text-red-700 w-full text-center sm:text-left sm:w-auto">Emin misiniz?</span>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleDeleteWorkshop}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sil"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Eğitimi Sil</span>
                    </button>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
                    >
                      <Edit2 className="w-4 h-4" />
                      Düzenle
                    </button>
                  </>
                )
              ) : (
                <button
                  onClick={handleRegisterToggle}
                  disabled={loading || isPastWorkshop || (!isRegistered && isFull)}
                  className={clsx(
                    "flex-1 sm:flex-none flex justify-center items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed",
                    isRegistered
                      ? "bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {!loading && (
                    <>
                      <span>{isRegistered ? "Kayıttan Çık" : "Kayıt Ol"}</span>
                      {!isRegistered && <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div >

      {/* Toast Message */}
      {
        toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 text-sm border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              {toastMessage}
            </div>
          </div>
        )
      }

      <EditWorkshopModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workshop={localWorkshop}
        onSuccess={() => showToast("Eğitim başarıyla güncellendi!")}
      />
    </>
  );
}
