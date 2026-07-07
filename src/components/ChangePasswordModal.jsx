import { useState } from "react";
import { X, Lock, Key, CheckCircle, Loader2 } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      // 1. Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Update to new password
      await updatePassword(currentUser, newPassword);

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Mevcut şifreniz yanlış.");
      } else {
        setError("Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-scale-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Şifre Değiştir</h2>
        <p className="text-slate-500 font-medium text-sm mb-6">
          Hesap güvenliğiniz için lütfen mevcut şifrenizi doğrulayın.
        </p>

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-6 h-6 shrink-0" />
            <p className="font-bold text-sm">Şifreniz başarıyla güncellendi!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mevcut ŞİFRE</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="Şu anki şifreniz"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">YENİ ŞİFRE</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="Yeni şifrenizi girin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">YENİ ŞİFRE (Tekrar)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CheckCircle className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="Yeni şifrenizi doğrulayın"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                "Şifreyi Güncelle"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
