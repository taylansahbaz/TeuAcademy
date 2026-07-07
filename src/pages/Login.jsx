import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Giriş başarısız. Lütfen e-posta veya şifrenizi kontrol edin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-900 px-4 relative overflow-hidden animate-fade-in">

      {/* Professional SaaS Background (Grid + Subtle Animated Glow) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Logo Area */}
        <div className="mb-8 text-center animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">TeuAcademy</h1>
          <p className="text-slate-500 mt-2 font-medium">Kurumsal Eğitim Platformu</p>
        </div>

        {/* Main Login Card */}
        <div className="w-full max-w-[420px] bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8 animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>

          <h2 className="text-xl font-bold text-slate-900 mb-6">Hesabınıza giriş yapın</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 mb-6 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Şifre</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Bekleyin...
                  </>
                ) : "Giriş Yap"}
              </button>
              <button
                type="button"
                onClick={() => alert("Şifre sıfırlama henüz aktif değil.")}
                className="px-4 py-2.5 bg-white border border-slate-700 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-colors shadow-sm text-[13px] whitespace-nowrap"
              >
                Şifremi Unuttum
              </button>
            </div>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-slate-400 text-sm mt-8 text-center">
          Bir hesaba ihtiyacınız varsa yöneticiniz ile iletişime geçin.
        </p>
      </div>
    </div>
  );
}
