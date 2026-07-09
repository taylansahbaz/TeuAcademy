import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, BookOpen, Calendar as CalendarIcon, User, HelpCircle, Search, Plus, X, Clock, Shield, BookOpenIcon, ClipboardList } from "lucide-react";
import clsx from "clsx";
import WorkshopsView from "./WorkshopsView";
import CalendarView from "./CalendarView";
import ProfileView from "./ProfileView";
import StaffDirectory from "./StaffDirectory";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import NotificationDropdown from "../components/NotificationDropdown";
import { sendNotification } from "../utils/notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlert } from '../contexts/AlertContext';

export default function Dashboard() {
  const { currentUser, userProfile, profileLoaded, logout } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  let activeMenu = "workshops";
  if (path === "/takvim") activeMenu = "calendar";
  else if (path === "/egitmenler") activeMenu = "staff";
  else if (path === "/profil") activeMenu = "profile";

  const handleMenuClick = (menu) => {
    if (menu === "workshops") navigate("/");
    else if (menu === "staff") navigate("/egitmenler");
    else if (menu === "calendar") navigate("/takvim");
    else if (menu === "profile") navigate("/profil");
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser && profileLoaded) {
      if (!userProfile || !userProfile.name || !userProfile.title) {
        navigate('/complete-profile');
      }
    }
  }, [currentUser, userProfile, profileLoaded, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    let isChecking = false;
    const checkUpcomingWorkshops = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const today = new Date().toISOString().split('T')[0];
        const q = query(collection(db, "workshops"), where("date", "==", today));
        const snapshot = await getDocs(q);
        const now = new Date();

        snapshot.forEach(docSnap => {
          const w = { id: docSnap.id, ...docSnap.data() };
          if (w.isDeleted) return;

          const isCreator = w.creatorId === currentUser.uid;
          const isAttendee = w.attendees?.includes(currentUser.uid);

          if (isCreator || isAttendee) {
            const [hours, minutes] = (w.time || "00:00").split(':').map(Number);
            const workshopTime = new Date();
            workshopTime.setHours(hours, minutes, 0, 0);

            const diffMs = workshopTime.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins > 0 && diffMins <= 60) {
              const notifiedKey = `notified_1hr_${w.id}_${currentUser.uid}`;
              if (!localStorage.getItem(notifiedKey)) {
                sendNotification({
                  userId: currentUser.uid,
                  title: "Eğitim Başlıyor!",
                  message: `${w.title} eğitiminin başlamasına 1 saatten az kaldı.`,
                  type: "workshop_reminder",
                  referenceId: w.id
                });
                localStorage.setItem(notifiedKey, "true");
              }
            }
          }
        });
      } catch (error) {
        console.error("Hatırlatıcı kontrol hatası:", error);
      } finally {
        isChecking = false;
      }
    };

    checkUpcomingWorkshops();
    const interval = setInterval(checkUpcomingWorkshops, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  async function handleCreateWorkshop(e) {
    e.preventDefault();
    if (!date || !time || !endTime) {
      showAlert("Uyarı", "Lütfen eğitim tarihi, başlangıç ve bitiş saatini seçiniz.", "error");
      return;
    }
    if (time >= endTime) {
      showAlert("Uyarı", "Bitiş saati, başlangıç saatinden sonra olmalıdır.", "error");
      return;
    }

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    
    if (date < todayStr) {
      showAlert("Uyarı", "Geçmiş bir tarihe eğitim planlanamaz.", "error");
      return;
    }
    if (date === todayStr) {
      const [h, m] = time.split(':').map(Number);
      if (h < todayObj.getHours() || (h === todayObj.getHours() && m < todayObj.getMinutes())) {
        showAlert("Uyarı", "Geçmiş bir saate eğitim planlanamaz.", "error");
        return;
      }
    }

    setLoading(true);
    try {
      // Overlap Check
      const q = query(collection(db, "workshops"), where("date", "==", date));
      const querySnapshot = await getDocs(q);
      const existingWorkshops = querySnapshot.docs.map(doc => doc.data()).filter(w => !w.isDeleted);
      
      const hasOverlap = existingWorkshops.some(w => {
        return (time < w.endTime && endTime > w.time);
      });

      if (hasOverlap) {
        showAlert("Uyarı", "Seçtiğiniz saat aralığında bu tarihte başka bir eğitim bulunmaktadır. Lütfen farklı bir saat seçiniz.", "error");
        setLoading(false);
        return;
      }

      const docRef = await addDoc(collection(db, "workshops"), {
        title,
        description,
        date,
        time,
        endTime,
        maxCapacity: parseInt(maxCapacity),
        creatorId: currentUser.uid,
        creatorName: userProfile.name,
        attendees: [],
        createdAt: new Date().toISOString(),
        category: "Genel"
      });

      // Herkese bildirim gönder
      await sendNotification({
        userId: "global",
        title: "Yeni Eğitim Planlandı",
        message: `${userProfile.name}, ${title} konulu yeni bir eğitim oluşturdu.`,
        type: "new_workshop",
        referenceId: docRef.id
      });

      setIsModalOpen(false);
      setTitle(""); setDescription(""); setDate(""); setTime(""); setEndTime(""); setMaxCapacity("");
    } catch (error) {
      console.error("Eğitim oluşturulurken hata:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shrink-0 shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <h1 className="text-xl font-extrabold text-indigo-600 tracking-tight">TeuAcademy</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => handleMenuClick("workshops")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "workshops" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <BookOpenIcon className="w-4 h-4" />
            Eğitimler
          </button>
          <button
            onClick={() => handleMenuClick("staff")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "staff" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4" />
            Eğitmenler
          </button>
          <button
            onClick={() => handleMenuClick("calendar")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "calendar" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            Takvim
          </button>
          <button
            onClick={() => handleMenuClick("profile")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "profile" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4" />
            Profilim
          </button>

          <div className="my-2 border-t border-slate-100"></div>
        </nav>

        <div className="p-4 space-y-1 mb-2 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            <HelpCircle className="w-4 h-4" />
            Yardım
          </button>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0 z-50 shadow-sm relative">
          <div className="md:hidden shrink-0 mr-4">
            <h1 className="text-xl font-extrabold text-indigo-600 tracking-tight">TeuAcademy</h1>
          </div>

          <div className="hidden md:flex flex-col flex-1">
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              {activeMenu === 'workshops' ? 'Eğitimler' :
                  activeMenu === 'staff' ? 'Eğitmenler' :
                    activeMenu === 'calendar' ? 'Takvim' :
                      activeMenu === 'profile' ? 'Profilim' : ''}
            </h2>
            <p className="text-[12px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              {activeMenu === 'workshops' ? 'Tüm eğitimleri ve etkinlikleri keşfedin' :
                  activeMenu === 'staff' ? 'Tüm eğitmenlerimizi ve uzmanlık alanlarını görün' :
                    activeMenu === 'calendar' ? 'Planlanmış tüm etkinliklerinizi yönetin' :
                    activeMenu === 'profile' ? 'Kişisel hesap ve sistem ayarlarınız' : ''}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <NotificationDropdown />
            </div>

            {activeMenu !== "profile" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm hover:shadow active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Eğitim Oluştur
              </button>
            )}

            <div className="w-px h-6 bg-slate-200"></div>

            <div
              onClick={() => handleMenuClick("profile")}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
                ) : (
                  userProfile?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden lg:block text-sm">
                <p className="font-bold text-slate-900 leading-tight">{userProfile?.name}</p>
                <p className="text-slate-500 text-xs font-medium">{userProfile?.title}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8">
          <div key={activeMenu} className={clsx("mx-auto min-h-full flex flex-col animate-scale-in", (activeMenu === "calendar" || activeMenu === "admin") ? "max-w-[1400px]" : "max-w-6xl")}>
            {activeMenu === "workshops" && <WorkshopsView />}
            {activeMenu === "staff" && <StaffDirectory />}
            {activeMenu === "calendar" && (
              <CalendarView
                onCreateWorkshopClick={(selectedDateStr) => {
                  if (selectedDateStr) setDate(selectedDateStr);
                  setIsModalOpen(true);
                }}
              />
            )}
            {activeMenu === "profile" && <ProfileView />}
          </div>
        </div>

        {/* Logout Modal */}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col relative p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Çıkış Yap</h3>
              <p className="text-slate-500 text-center text-sm font-medium mb-6">
                Hesabınızdan çıkış yapmak istediğinize emin misiniz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all text-sm"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    logout();
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-all shadow-md shadow-red-600/20 active:scale-95 text-sm"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Create Workshop Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 py-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-visible animate-scale-in flex flex-col my-auto relative">

              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(110deg,#4f46e5,#818cf8,#c7d2fe)] p-5 shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors z-10 backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-inner shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm leading-none mb-1">Yeni Eğitim Oluştur</h2>
                    <p className="text-indigo-50 text-xs font-medium">Katılımcılar için yeni bir Eğitim planlayın.</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-visible">
                <form onSubmit={handleCreateWorkshop} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Eğitim Başlığı</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all text-sm"
                      placeholder="Örn: İleri Seviye React Hooks"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Açıklama</label>
                    <textarea
                      required
                      rows="2"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all resize-none text-sm"
                      placeholder="Eğitimin içeriği ve hedefleri hakkında bilgi verin..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarih</label>
                      <DatePicker value={date} onChange={setDate} buttonClassName="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium text-sm bg-slate-50/50 hover:bg-white border-slate-200" hideIconBg={true} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Başlangıç</label>
                      <TimePicker selectedDate={date} value={time} onChange={setTime} buttonClassName="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all text-left font-medium text-sm bg-slate-50/50 hover:bg-white border-slate-200" hideIconBg={true} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Bitiş</label>
                      <TimePicker selectedDate={date} value={endTime} onChange={setEndTime} minTime={time} buttonClassName="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all text-left font-medium text-sm hover:bg-white" hideIconBg={true} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Kontenjan</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all text-sm"
                          placeholder="Örn: 20"
                          value={maxCapacity}
                          onChange={(e) => setMaxCapacity(e.target.value)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm text-sm"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-70 text-sm"
                    >
                      {loading ? "Oluşturuluyor..." : "Eğitimi Planla"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
