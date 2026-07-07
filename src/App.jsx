import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
