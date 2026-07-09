import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Camera, Save, Loader2, Plus, X, Briefcase, Palette, Trash2, Check } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { compressImageToBase64 } from "../utils/imageUtils";
import ChangePasswordModal from "../components/ChangePasswordModal";

export default function ProfileView() {
  const { userProfile, currentUser, setUserProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Directly Editable Form State
  const [formData, setFormData] = useState({
    name: userProfile?.name || "",
    title: userProfile?.title || ""
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Tag States
  const [jobTagInput, setJobTagInput] = useState("");
  const [selectedJobTags, setSelectedJobTags] = useState(userProfile?.jobTags || []);
  const [addingJobTag, setAddingJobTag] = useState(false);

  const [hobbyTagInput, setHobbyTagInput] = useState("");
  const [selectedHobbyTags, setSelectedHobbyTags] = useState(userProfile?.hobbyTags || []);
  const [addingHobbyTag, setAddingHobbyTag] = useState(false);

  // Delete Confirmation State
  const [tagToDelete, setTagToDelete] = useState(null);

  useEffect(() => {
    const isNameChanged = formData.name !== (userProfile?.name || "");
    const isTitleChanged = formData.title !== (userProfile?.title || "");
    const isJobTagsChanged = JSON.stringify(selectedJobTags) !== JSON.stringify(userProfile?.jobTags || []);
    const isHobbyTagsChanged = JSON.stringify(selectedHobbyTags) !== JSON.stringify(userProfile?.hobbyTags || []);
    
    setHasChanges(isNameChanged || isTitleChanged || isJobTagsChanged || isHobbyTagsChanged);
  }, [formData, selectedJobTags, selectedHobbyTags, userProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const updatedData = {
        name: formData.name,
        title: formData.title,
        jobTags: selectedJobTags,
        hobbyTags: selectedHobbyTags,
        hobbyTag: selectedHobbyTags.join(", ")
      };
      await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });
      setUserProfile((prev) => ({ ...prev, ...updatedData }));
      setHasChanges(false);
    } catch (error) {
      console.error("Profil güncellenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;

    setPhotoLoading(true);
    try {
      const base64Image = await compressImageToBase64(file);
      await setDoc(doc(db, "users", currentUser.uid), {
        photoURL: base64Image
      }, { merge: true });
      setUserProfile((prev) => ({ ...prev, photoURL: base64Image }));
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
      setAddingJobTag(false);
    }
  }

  function handleAddHobbyTag(e) {
    e.preventDefault();
    const tag = hobbyTagInput.trim();
    if (tag && !selectedHobbyTags.includes(tag)) {
      setSelectedHobbyTags(prev => [...prev, tag]);
      setHobbyTagInput("");
      setAddingHobbyTag(false);
    }
  }

  function executeDeleteTag() {
    if (!tagToDelete) return;
    if (tagToDelete.type === 'job') {
      setSelectedJobTags(prev => prev.filter(tag => tag !== tagToDelete.value));
    } else {
      setSelectedHobbyTags(prev => prev.filter(tag => tag !== tagToDelete.value));
    }
    setTagToDelete(null);
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto h-[calc(100vh-120px)] flex flex-col animate-fade-in relative z-10 pb-20 lg:pb-0">
      
      {/* Delete Tag Confirmation Modal */}
      {tagToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Etiketi Sil</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">
              <span className="text-slate-800 font-bold">"{tagToDelete.value}"</span> etiketini kaldırmak istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setTagToDelete(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors">İptal</button>
              <button onClick={executeDeleteTag} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner - Compacted */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-4 shrink-0 overflow-hidden relative">
        <div className="h-20 w-full bg-[linear-gradient(110deg,#4f46e5,#818cf8,#c7d2fe)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="px-6 pb-4 flex flex-col sm:flex-row gap-4 relative items-center sm:items-end">
          <div className="relative -mt-10 shrink-0 group cursor-pointer" onClick={handlePhotoClick}>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 duration-300 relative z-10">
              {photoLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-50 text-indigo-600 font-bold text-3xl flex items-center justify-center">
                  {userProfile?.name?.charAt(0).toUpperCase() || "K"}
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm z-20 group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {userProfile?.name || "İsimsiz Kullanıcı"}
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">
              {userProfile?.title || "Unvan belirtilmedi"}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout for Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        
        {/* Left Column */}
        <div className="space-y-4 flex flex-col h-full">
          {/* Personal Info */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-6">Kişisel Bilgiler</h3>
            
            <div className="grid grid-cols-1 gap-x-6 gap-y-8">
              <div className="relative">
                <input 
                  type="text" 
                  name="name"
                  className="peer w-full border-b-2 border-slate-200 bg-transparent px-0 py-1.5 text-slate-900 font-bold text-base placeholder-transparent focus:border-indigo-600 focus:outline-none transition-colors" 
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="Ad Soyad"
                />
                <label className="absolute left-0 -top-3.5 text-[11px] font-bold text-indigo-600 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-focus:-top-3.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-indigo-600 peer-focus:uppercase peer-focus:tracking-wider cursor-text">
                  Ad Soyad
                </label>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  name="title"
                  className="peer w-full border-b-2 border-slate-200 bg-transparent px-0 py-1.5 text-slate-900 font-bold text-base placeholder-transparent focus:border-indigo-600 focus:outline-none transition-colors" 
                  value={formData.title} 
                  onChange={handleChange}
                  placeholder="Unvan"
                />
                <label className="absolute left-0 -top-3.5 text-[11px] font-bold text-indigo-600 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-focus:-top-3.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-indigo-600 peer-focus:uppercase peer-focus:tracking-wider cursor-text">
                  Unvan
                </label>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  className="peer w-full border-b-2 border-slate-100 bg-transparent px-0 py-1.5 text-slate-400 font-bold text-base placeholder-transparent focus:outline-none cursor-not-allowed" 
                  value={currentUser?.email || ""} 
                  disabled
                  placeholder="E-posta"
                />
                <label className="absolute left-0 -top-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  E-posta Adresi
                </label>
              </div>
            </div>
          </div>

          {/* Security / Misc */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Güvenlik ve Şifre</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Düzenli şifre değiştirin.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
            >
              Şifreyi Değiştir
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 flex flex-col h-full">
          {/* Expertise Tags */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Uzmanlık Alanları</h3>
              </div>
              <button 
                onClick={() => setAddingJobTag(!addingJobTag)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>

            <div>
              {addingJobTag && (
                <div className="flex gap-2 mb-4 animate-slide-up">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Örn: React..."
                    value={jobTagInput}
                    autoFocus
                    onChange={(e) => setJobTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddJobTag(e); }}
                  />
                  <button
                    type="button"
                    onClick={handleAddJobTag}
                    disabled={!jobTagInput.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedJobTags.length === 0 && !addingJobTag && (
                  <span className="text-xs text-slate-400 font-medium italic">Henüz uzmanlık eklenmedi.</span>
                )}
                {selectedJobTags.map((tag, i) => (
                  <div key={`${tag}-${i}`} className="relative group animate-scale-in">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold shadow-sm">
                      {tag}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setTagToDelete({ type: 'job', value: tag })} 
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hobby Tags */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Palette className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">İlgi Alanları & Hobiler</h3>
              </div>
              <button 
                onClick={() => setAddingHobbyTag(!addingHobbyTag)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>

            <div className="flex-1">
              {addingHobbyTag && (
                <div className="flex gap-2 mb-4 animate-slide-up">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Hobilerinizi ekleyin..."
                    value={hobbyTagInput}
                    autoFocus
                    onChange={(e) => setHobbyTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddHobbyTag(e); }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHobbyTag}
                    disabled={!hobbyTagInput.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedHobbyTags.length === 0 && !addingHobbyTag && (
                  <span className="text-xs text-slate-400 font-medium italic">Henüz hobi eklenmedi.</span>
                )}
                {selectedHobbyTags.map((tag, i) => (
                  <div key={`${tag}-${i}`} className="relative group animate-scale-in">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-sm">
                      {tag}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setTagToDelete({ type: 'hobby', value: tag })} 
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className={`absolute bottom-4 left-0 right-0 px-4 flex justify-center pointer-events-none transition-all duration-300 z-50 ${hasChanges ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 pointer-events-auto w-auto shrink-0">
          <div>
            <p className="font-bold text-sm">Kaydedilmemiş değişiklikler var</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-5 py-2 bg-white text-slate-900 hover:bg-indigo-50 font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
