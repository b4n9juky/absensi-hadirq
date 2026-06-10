import { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Check active session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('absen_admin_token');
    const savedUser = localStorage.getItem('absen_admin_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('absen_admin_token', newToken);
    localStorage.setItem('absen_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('absen_admin_token');
    localStorage.removeItem('absen_admin_user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-teal-400 font-bold text-sm tracking-widest">
        MEMUAT SISTEM...
      </div>
    );
  }

  return (
    <>
      {!token || !user ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardScreen token={token} user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
