import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { WifiOff, AlertTriangle } from "lucide-react";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";

// Protected Route wrapper
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function NetworkGuard({ children }) {
  const [isAllowed, setIsAllowed] = useState(null);

  useEffect(() => {
    // Yalnızca localhost veya belirtilen şirket WiFi IP'sine (192.168.1.103) izin ver
    const checkIP = () => {
      const host = window.location.hostname;
      // Geliştirme aşamasında localhost'a izin veriyoruz, canlıda sadece 192.168.1.103
      if (host === 'localhost' || host === '127.0.0.1' || host === '192.168.1.103') {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
    };
    checkIP();
  }, []);

  if (isAllowed === null) return null;
  
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center selection:bg-red-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-200/50 max-w-md w-full border border-red-50 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500"></div>
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <WifiOff className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Erişim Engellendi</h1>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            Bu sisteme güvenlik gereği sadece <strong className="text-slate-700">Şirket Ağı (WiFi)</strong> üzerinden erişebilirsiniz.
          </p>
          <div className="p-4 bg-slate-50/80 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-400 border border-slate-100">
            <AlertTriangle className="w-4 h-4" />
            İzin Verilen Ağ: 192.168.1.103
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <Router>
      <NetworkGuard>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/complete-profile" 
              element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </NetworkGuard>
    </Router>
  );
}

export default App;
