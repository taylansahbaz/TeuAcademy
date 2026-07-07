import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, BookOpen, Calendar as CalendarIcon, User, HelpCircle, Search, Plus, X } from "lucide-react";
import clsx from "clsx";
import WorkshopsView from "./WorkshopsView";
import CalendarView from "./CalendarView";
import ProfileView from "./ProfileView";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import NotificationDropdown from "../components/NotificationDropdown";
import { sendNotification } from "../utils/notifications";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { currentUser, userProfile, profileLoaded, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState("workshops"); // "workshops" | "calendar" | "profile"
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser && profileLoaded) {
      if (!userProfile || !userProfile.name) {
        navigate('/complete-profile');
      } else {
        const hasJobTags = userProfile.jobTags && userProfile.jobTags.length > 0;
        const hasHobbyTags = userProfile.hobbyTags && userProfile.hobbyTags.length > 0;
        if (!hasJobTags && !hasHobbyTags) {
          navigate('/complete-profile');
        }
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
                  message: `"${w.title}" eğitiminin başlamasına 1 saatten az kaldı.`,
                  type: "workshop_reminder"
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
    setLoading(true);
    try {
      await addDoc(collection(db, "workshops"), {
        title,
        description,
        date,
        time,
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
        message: `${userProfile.name}, "${title}" konulu yeni bir atölye oluşturdu.`,
        type: "new_workshop"
      });

      setIsModalOpen(false);
      setTitle(""); setDescription(""); setDate(""); setTime(""); setMaxCapacity("");
    } catch (error) {
      console.error("Eğitim oluşturulurken hata:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0 shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <h1 className="text-xl font-extrabold text-indigo-600 tracking-tight">TeuAcademy</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => setActiveMenu("workshops")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "workshops" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Atölyeler
          </button>
          <button
            onClick={() => setActiveMenu("calendar")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "calendar" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            Takvim
          </button>
          <button
            onClick={() => setActiveMenu("profile")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeMenu === "profile" ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4" />
            Profilim
          </button>
        </nav>

        <div className="p-4 space-y-1 mb-2 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            <HelpCircle className="w-4 h-4" />
            Yardım
          </button>
          <button 
            onClick={() => logout()}
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
          <div className="md:hidden">
            <h1 className="text-xl font-extrabold text-indigo-600 tracking-tight">TeuAcademy</h1>
          </div>
          <div className="flex-1"></div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <NotificationDropdown />
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm hover:shadow active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Eğitim Oluştur
            </button>
            
            <div className="w-px h-6 bg-slate-200"></div>
            
            <div 
  onClick={() => setActiveMenu("profile")}
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
    <p className="text-slate-500 text-xs font-medium">{userProfile?.role}</p>
  </div>
</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8">
          <div className={clsx("mx-auto h-full flex flex-col", activeMenu === "calendar" ? "max-w-[1400px]" : "max-w-6xl")}>
            {activeMenu === "workshops" && <WorkshopsView />}
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

        {/* Global Create Workshop Modal */}
        {isModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-visible animate-scale-in flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(110deg,#4f46e5,#818cf8,#c7d2fe)] p-6 md:p-8 shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-10 backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">Yeni Eğitim Oluştur</h2>
                    <p className="text-indigo-50 text-sm font-medium mt-1">Katılımcılar için yeni bir atölye planlayın.</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-visible">
                <form onSubmit={handleCreateWorkshop} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Eğitim Başlığı</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all" 
                      placeholder="Örn: İleri Seviye React Hooks"
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Açıklama</label>
                    <textarea 
                      required 
                      rows="3" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all resize-none" 
                      placeholder="Eğitimin içeriği ve hedefleri hakkında bilgi verin..."
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Tarih</label>
                      <DatePicker value={date} onChange={setDate} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Saat</label>
                      <TimePicker value={time} onChange={setTime} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Kontenjan (Kişi)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        required 
                        min="1" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all" 
                        placeholder="Örn: 20"
                        value={maxCapacity} 
                        onChange={(e) => setMaxCapacity(e.target.value)} 
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 mt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                      İptal
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-70"
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
