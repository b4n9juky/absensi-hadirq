import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from './components/LoginScreen';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardSection } from './components/sections/DashboardSection';
import { UsersSection } from './components/sections/UsersSection';
import { ClassesSection } from './components/sections/ClassesSection';
import { StudentsSection } from './components/sections/StudentsSection';
import { AcademicSection } from './components/sections/AcademicSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { TeachingScheduleSection } from './components/sections/TeachingScheduleSection';
import { KioskAttendance } from './components/sections/KioskAttendance';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
    <BrowserRouter>
      <Routes>
        <Route path="/kiosk-absensi" element={<KioskAttendance />} />
        <Route
          path="/login"
          element={
            !token || !user ? (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            ) : (
              <Navigate to="/dashboard/ringkasan" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            token && user ? (
              <DashboardLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="ringkasan" replace />} />
          <Route path="ringkasan" element={<DashboardSection token={token!} user={user!} />} />
          <Route path="pengguna" element={<UsersSection token={token!} />} />
          <Route path="kelas" element={<ClassesSection token={token!} />} />
          <Route path="siswa" element={<StudentsSection token={token!} />} />
          <Route path="akademik" element={<AcademicSection token={token!} />} />
          <Route path="pengaturan" element={<SettingsSection token={token!} />} />
          <Route path="jadwal-mengajar" element={<TeachingScheduleSection token={token!} />} />
        </Route>
        <Route path="*" element={<Navigate to={token && user ? '/dashboard/ringkasan' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
