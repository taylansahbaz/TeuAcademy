import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { UserCircle, Briefcase, Palette, Camera, Plus, X, Loader2 } from "lucide-react";
import { compressImageToBase64 } from "../utils/imageUtils";
import { sendNotification } from "../utils/notifications";
import { useAlert } from "../contexts/AlertContext";

export default function CompleteProfile() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [name, setName] = useState(userProfile?.name || "");
  const [title, setTitle] = useState(userProfile?.title || "");

  // Custom Tag Inputs
  const [jobTagInput, setJobTagInput] = useState("");
  const [selectedJobTags, setSelectedJobTags] = useState(userProfile?.jobTags || []);

  const [hobbyTagInput, setHobbyTagInput] = useState("");
  const [selectedHobbyTags, setSelectedHobbyTags] = useState(userProfile?.hobbyTags || []);

  const [loading, setLoading] = useState(false);

  // Photo Upload State
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || null);

  const handlePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    try {
      const base64Image = await compressImageToBase64(file);
      setPhotoURL(base64Image);
    } catch (error) {
      console.error("Fotoğraf dönüştürülürken hata:", error);
    } finally {
      setPhotoLoading(false);
    }
  };

  function handleAddJobTag(e) {
    e.preventDefault();
    const tag = jobTagInput.trim();
    if (tag && !selectedJobTags.includes(tag)) {
      setSelectedJobTags(prev => [...prev, tag]);
      setJobTagInput("");
    }
  }

  function handleRemoveJobTag(tagToRemove) {
    setSelectedJobTags(prev => prev.filter(tag => tag !== tagToRemove));
  }

  function handleAddHobbyTag(e) {
    e.preventDefault();
    const tag = hobbyTagInput.trim();
    if (tag && !selectedHobbyTags.includes(tag)) {
      setSelectedHobbyTags(prev => [...prev, tag]);
      setHobbyTagInput("");
    }
  }

  function handleRemoveHobbyTag(tagToRemove) {
    setSelectedHobbyTags(prev => prev.filter(tag => tag !== tagToRemove));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !title) {
      showAlert("Uyarı", "Lütfen temel bilgilerinizi doldurun.", "error");
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        name,
        email: currentUser.email,
        title,
        role: userProfile?.role || "user",
        photoURL: photoURL,
        jobTags: selectedJobTags,
        hobbyTags: selectedHobbyTags,
      };

      await setDoc(doc(db, "users", currentUser.uid), profileData);
      setUserProfile(profileData);

      // Herkese yeni personel bildirimi gönder
      await sendNotification({
        userId: "global",
        title: "Ekibe Yeni Biri Katıldı",
        message: `${name}, ${title} olarak ekibe katıldı. Kendisine hoş geldin deyin!`,
        type: "new_staff",
        referenceId: currentUser.uid
      });

      navigate("/");
    } catch (error) {
      console.error("Profil güncellenirken hata oluştu:", error);
      showAlert("Hata", "Profil güncellenirken bir hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none fixed">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-400/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">

        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profilinizi Tamamlayın</h1>
          <p className="text-slate-500 mt-2 font-medium">TeuAcademy deneyiminizi kişiselleştirmek için birkaç bilgiye ihtiyacımız var.</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8 md:p-10 relative overflow-hidden">

          <form onSubmit={handleSubmit} className="space-y-12">

            {/* Fotoğraf Yükleme (Animated) */}
            <section className="animate-fade-in flex flex-col items-center" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-28 h-28 rounded-full bg-slate-50 border-4 border-white shadow-md overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                  {photoLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 text-indigo-600 font-bold text-3xl flex items-center justify-center">
                      <Camera className="w-8 h-8 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-slate-900/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-white border-4 border-white shadow-sm shadow-indigo-200">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-500 mt-4">Profil Fotoğrafı Yükle</p>
            </section>

            <div className="h-px bg-slate-100 w-full"></div>

            {/* Temel Bilgiler */}
            <section className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-2 mb-5">
                <UserCircle className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-900">Kişisel Bilgiler</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Ad Soyad</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unvan</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Örn: Yazılım Geliştirici"
                    value={title} onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* İş Odakları */}
            <section className="animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-2 mb-5">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-900">Uzmanlık Alanları</h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Örn: React, Veri Analizi..."
                    value={jobTagInput}
                    onChange={(e) => setJobTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddJobTag(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddJobTag}
                    disabled={!jobTagInput.trim()}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Ekle
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[36px]">
                  {selectedJobTags.length === 0 && <span className="text-sm text-slate-400 py-1.5 font-medium italic">Henüz uzmanlık eklenmedi.</span>}
                  {selectedJobTags.map((tag, i) => (
                    <div key={`${tag}-${i}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium shadow-sm transition-all animate-scale-in">
                      {tag}
                      <button type="button" onClick={() => handleRemoveJobTag(tag)} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Hobi */}
            <section className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-2 mb-5">
                <Palette className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-900">İlgi Alanı & Hobi</h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Hobilerinizi dilediğiniz kadar ekleyebilirsiniz..."
                    value={hobbyTagInput}
                    onChange={(e) => setHobbyTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHobbyTag(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHobbyTag}
                    disabled={!hobbyTagInput.trim()}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Ekle
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[36px]">
                  {selectedHobbyTags.length === 0 && <span className="text-sm text-slate-400 py-1.5 font-medium italic">Henüz hobi eklenmedi.</span>}
                  {selectedHobbyTags.map((tag, i) => (
                    <div key={`${tag}-${i}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-sm animate-scale-in">
                      {tag}
                      <button type="button" onClick={() => handleRemoveHobbyTag(tag)} className="text-indigo-400 hover:text-indigo-700 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="pt-8 border-t border-slate-100 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 flex items-center justify-center gap-2 text-base overflow-hidden relative group"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>

                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Kaydediliyor...
                  </>
                ) : (
                  "Profilimi Tamamla"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
