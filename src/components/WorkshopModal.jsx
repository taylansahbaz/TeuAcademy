import { useState } from "react";
import { X, Calendar as CalendarIcon, Clock, Users, ArrowRight, Loader2, Check, Trash2, Edit2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase/config";
import EditWorkshopModal from "./EditWorkshopModal";
import { sendNotification } from "../utils/notifications";

export default function WorkshopModal({ isOpen, onClose, workshop }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!isOpen || !workshop) return null;

  const category = workshop.category || "Genel";
  const capacity = parseInt(workshop.capacity || workshop.maxCapacity || "0");
  const attendeesCount = workshop.attendees?.length || 0;
  const progressPercent = capacity > 0 ? Math.min((attendeesCount / capacity) * 100, 100) : 0;
  const isCreator = currentUser?.uid === workshop.creatorId;
  const isRegistered = workshop.attendees?.includes(currentUser?.uid);
  const isFull = attendeesCount >= capacity;

  const handleDeleteWorkshop = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "workshops", workshop.id), {
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
      const workshopRef = doc(db, "workshops", workshop.id);
      if (isRegistered) {
        // Unregister
        await updateDoc(workshopRef, {
          attendees: arrayRemove(currentUser.uid)
        });
      } else {
        // Register (only if not full)
        if (!isFull) {
          await updateDoc(workshopRef, {
            attendees: arrayUnion(currentUser.uid)
          });

          // Send notification to creator
          if (workshop.creatorId !== currentUser.uid) {
            await sendNotification({
              userId: workshop.creatorId,
              title: "Eğitiminize Yeni Katılımcı",
              message: `Biri "${workshop.title}" eğitiminize kayıt oldu!`,
              type: "new_attendee"
            });
          }

          // Send notification to other attendees
          if (workshop.attendees && workshop.attendees.length > 0) {
            for (const attendeeId of workshop.attendees) {
              if (attendeeId !== currentUser.uid && attendeeId !== workshop.creatorId) {
                await sendNotification({
                  userId: attendeeId,
                  title: "Eğitime Yeni Biri Katıldı",
                  message: `Kayıtlı olduğunuz "${workshop.title}" eğitimine yeni biri katıldı.`,
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
              {workshop.title}
            </h2>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-4 sm:gap-8 mb-10 pb-10 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tarih</p>
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span>{format(parseISO(workshop.date), 'dd MMMM yyyy', { locale: tr })}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saat</p>
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{workshop.time}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-10">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Eğitim Hakkında</h3>
              <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                {workshop.description || "Bu atölye için henüz bir açıklama girilmemiş."}
              </p>
            </div>

            {/* Instructor & Capacity Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">

              {/* Instructor */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Eğitmen</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200 shadow-sm shrink-0 overflow-hidden">
                    {workshop.creatorName ? workshop.creatorName.charAt(0).toUpperCase() : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">
                      {workshop.creatorName || "Bilinmiyor"}
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
          </div>

          {/* Footer Actions */}
          <div className="p-6 md:px-10 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            {isCreator ? (
              <p className="text-sm font-bold text-slate-500">Bu eğitimi siz oluşturdunuz.</p>
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
                  disabled={loading || (!isRegistered && isFull)}
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
      </div>

      <EditWorkshopModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workshop={workshop}
      />
    </>
  );
}
