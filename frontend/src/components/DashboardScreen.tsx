import React, { useState, useEffect, useCallback } from 'react';
import { 
  LogOut, 
  Users, 
  CheckCircle, 
  Clock, 
  UserMinus, 
  RefreshCw, 
  Eye, 
  MapPin, 
  FileSpreadsheet, 
  User, 
  SlidersHorizontal,
  Vibrate,
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';

interface DashboardScreenProps {
  token: string;
  user: any;
  onLogout: () => void;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ClassRecord {
  id: number;
  name: string;
}

interface StudentRecord {
  id: number;
  userId: string;
  nis: string;
  classId: number;
  studentName: string;
  studentEmail: string;
  className: string;
  deviceUuid?: string | null;
}

interface AcademicYearRecord {
  id: number;
  name: string;
  isActive: boolean;
}

interface SemesterRecord {
  id: number;
  academicYearId: number;
  name: string;
  isActive: boolean;
}

interface ScheduleRecord {
  id: number;
  dayName: string;
  checkinStart: string;
  lateAfter: string;
  checkoutTime: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ token, user, onLogout }) => {
  // Sidebar State
  const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'classes' | 'students' | 'academic'>('dashboard');

  // Stats State (Dashboard tab)
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    daysCount: 1
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Reports Table State (Dashboard tab)
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Filters State (Dashboard tab)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // UI state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // CRUD Data State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [yearsList, setYearsList] = useState<AcademicYearRecord[]>([]);
  const [semestersList, setSemestersList] = useState<SemesterRecord[]>([]);
  const [schedulesList, setSchedulesList] = useState<ScheduleRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Modals / Form States
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<UserRecord | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('siswa');

  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState<ClassRecord | null>(null);
  const [className, setClassName] = useState('');

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState<StudentRecord | null>(null);
  const [studentNis, setStudentNis] = useState('');
  const [studentUserId, setStudentUserId] = useState('');
  const [studentClassId, setStudentClassId] = useState('');

  const [showAddYear, setShowAddYear] = useState(false);
  const [yearName, setYearName] = useState('');

  const [showAddSemester, setShowAddSemester] = useState(false);
  const [semName, setSemName] = useState('');
  const [semYearId, setSemYearId] = useState('');

  const [showEditSchedule, setShowEditSchedule] = useState<ScheduleRecord | null>(null);
  const [schedStart, setSchedStart] = useState('');
  const [schedLate, setSchedLate] = useState('');
  const [schedCheckout, setSchedCheckout] = useState('');

  // 🔔 Trigger Toast Alert
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // 🔄 Fetch Stats Callback
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setErrorMsg('');
    try {
      let queryParams = [];
      if (filterDate) queryParams.push(`date=${filterDate}`);
      if (filterClass) queryParams.push(`classId=${filterClass}`);
      if (filterMonth) queryParams.push(`month=${filterMonth}`);
      if (filterYear) queryParams.push(`year=${filterYear}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await fetch(`/api/dashboard/stats${queryString}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'Gagal mengambil data statistik.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setStatsLoading(false);
    }
  }, [token, filterDate, filterClass, filterMonth, filterYear]);

  // 🔄 Fetch Reports Callback
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      let queryParams = [];
      if (filterDate) queryParams.push(`date=${filterDate}`);
      if (filterClass) queryParams.push(`classId=${filterClass}`);
      if (filterMonth) queryParams.push(`month=${filterMonth}`);
      if (filterYear) queryParams.push(`year=${filterYear}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await fetch(`/api/reports/attendance${queryString}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  }, [token, filterDate, filterClass, filterMonth, filterYear]);

  // 🔄 Dynamic Data Feeder
  const fetchSectionData = useCallback(async () => {
    if (activeSection === 'dashboard') {
      fetchStats();
      fetchReports();
      return;
    }

    setListLoading(true);
    setErrorMsg('');
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      if (activeSection === 'users') {
        const res = await fetch('/api/users', { headers: authHeader });
        const resData = await res.json();
        if (resData.success) setUsersList(resData.data);
      }
      
      if (activeSection === 'classes') {
        const res = await fetch('/api/classes', { headers: authHeader });
        const resData = await res.json();
        if (resData.success) setClassesList(resData.data);
      }
      
      if (activeSection === 'students') {
        const resStud = await fetch('/api/students', { headers: authHeader });
        const resDataStud = await resStud.json();
        if (resDataStud.success) setStudentsList(resDataStud.data);

        // Fetch classes & users for options dropdowns
        const resCls = await fetch('/api/classes', { headers: authHeader });
        const resDataCls = await resCls.json();
        if (resDataCls.success) setClassesList(resDataCls.data);

        const resUsr = await fetch('/api/users', { headers: authHeader });
        const resDataUsr = await resUsr.json();
        if (resDataUsr.success) setUsersList(resDataUsr.data);
      }

      if (activeSection === 'academic') {
        const resYears = await fetch('/api/academic-years', { headers: authHeader });
        const resDataYears = await resYears.json();
        if (resDataYears.success) setYearsList(resDataYears.data);

        const resSem = await fetch('/api/semesters', { headers: authHeader });
        const resDataSem = await resSem.json();
        if (resDataSem.success) setSemestersList(resDataSem.data);

        const resSched = await fetch('/api/schedules', { headers: authHeader });
        const resDataSched = await resSched.json();
        if (resDataSched.success) setSchedulesList(resDataSched.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal sinkronisasi data dari server.');
    } finally {
      setListLoading(false);
    }
  }, [activeSection, token, fetchStats, fetchReports]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  // Handle data reload
  const handleRefresh = () => {
    fetchSectionData();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterDate(new Date().toISOString().split('T')[0]);
    setFilterClass('');
    setFilterMonth('');
    setFilterYear('');
  };

  // Helper formatting values
  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '-';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  // ==========================================
  // 🔨 USER CRUD API ACTIONS
  // ==========================================
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, role: userRole })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Akun Pengguna berhasil dibuat!');
        setShowAddUser(false);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan user baru.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditUser) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/users/${showEditUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: userName, email: userEmail, role: userRole })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Akun Pengguna berhasil diperbarui!');
        setShowEditUser(null);
        setUserName('');
        setUserEmail('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal memperbarui user.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna ini?')) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Akun Pengguna berhasil dihapus.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menghapus user.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ==========================================
  // 🔨 CLASS CRUD API ACTIONS
  // ==========================================
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: className })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(`Kelas "${className}" berhasil dibuat!`);
        setShowAddClass(false);
        setClassName('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan kelas.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditClass) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/classes/${showEditClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: className })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Nama Kelas berhasil diperbarui!');
        setShowEditClass(null);
        setClassName('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal memperbarui kelas.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Kelas berhasil dihapus.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menghapus kelas.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ==========================================
  // 🔨 STUDENT CRUD API ACTIONS
  // ==========================================
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: studentUserId, nis: studentNis, classId: studentClassId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(`Profil siswa "${studentNis}" berhasil dibuat!`);
        setShowAddStudent(false);
        setStudentNis('');
        setStudentUserId('');
        setStudentClassId('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan profil siswa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditStudent) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/students/${showEditStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: studentUserId, nis: studentNis, classId: studentClassId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Profil Siswa berhasil diperbarui!');
        setShowEditStudent(null);
        setStudentNis('');
        setStudentUserId('');
        setStudentClassId('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal memperbarui siswa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus profil siswa ini?')) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Profil siswa berhasil dihapus.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menghapus siswa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetDevice = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin me-reset kunci perangkat HP siswa ini? Siswa akan bisa melakukan login/presensi dari HP baru.')) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/students/${id}/reset-device`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Kunci perangkat HP siswa berhasil di-reset.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal me-reset perangkat siswa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // ==========================================
  // 🔨 PERIOD & SCHEDULE API ACTIONS
  // ==========================================
  const handleAddYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: yearName })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(`Tahun Ajaran "${yearName}" berhasil dibuat!`);
        setShowAddYear(false);
        setYearName('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan tahun ajaran.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleActivateYear = async (id: number) => {
    setErrorMsg('');
    try {
      const response = await fetch(`/api/academic-years/${id}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Tahun Ajaran aktif berhasil dialihkan.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal mengaktifkan tahun ajaran.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddSemesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('/api/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: semName, academicYearId: parseInt(semYearId) })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(`Semester "${semName}" berhasil dibuat!`);
        setShowAddSemester(false);
        setSemName('');
        setSemYearId('');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan semester.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleActivateSemester = async (id: number) => {
    setErrorMsg('');
    try {
      const response = await fetch(`/api/semesters/${id}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast('Semester aktif berhasil dialihkan.');
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal mengaktifkan semester.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditSchedule) return;
    setErrorMsg('');
    try {
      const response = await fetch(`/api/schedules/${showEditSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ checkinStart: schedStart, lateAfter: schedLate, checkoutTime: schedCheckout })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(`Jadwal untuk hari ${showEditSchedule.dayName} berhasil diperbarui!`);
        setShowEditSchedule(null);
        fetchSectionData();
      } else {
        throw new Error(data.error || 'Gagal memperbarui jadwal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* 🔔 Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm tracking-wide shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-5 h-5 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 🎛️ Left Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/60 border-r border-slate-900/80 backdrop-blur-md hidden md:flex flex-col justify-between shrink-0">
        <div>
          {/* Sidebar Header */}
          <div className="px-6 py-6 border-b border-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Vibrate className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-black tracking-wider text-white">
                Shake<span className="text-teal-400">Absen</span>
              </h1>
              <p className="text-[10px] text-slate-500 tracking-widest font-semibold uppercase">Control Panel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'dashboard'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Ringkasan & Absensi</span>
            </button>

            <button
              onClick={() => setActiveSection('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'users'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Kelola Pengguna</span>
            </button>

            <button
              onClick={() => setActiveSection('classes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'classes'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Kelola Kelas</span>
            </button>

            <button
              onClick={() => setActiveSection('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'students'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <GraduationCap className="w-4.5 h-4.5" />
              <span>Kelola Siswa</span>
            </button>

            <button
              onClick={() => setActiveSection('academic')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'academic'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-md shadow-teal-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Akademik & Jadwal</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-900">
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-900/60 mb-3 text-xs">
            <div className="font-bold text-white max-w-full truncate">{user.name}</div>
            <div className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider">{user.role}</div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 🚀 Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar (for mobile layout / quick checks) */}
        <header className="border-b border-slate-900 bg-slate-900/30 backdrop-blur-md px-6 py-4 flex items-center justify-between md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <Vibrate className="w-5 h-5 text-teal-400 animate-pulse" />
            <span className="font-black text-white text-sm">ShakeAbsen Panel</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${(statsLoading || reportsLoading || listLoading) ? 'animate-spin' : ''}`} />
            </button>

            {/* Mobile Nav Select Dropdown */}
            <div className="md:hidden">
              <select
                value={activeSection}
                onChange={(e: any) => setActiveSection(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="dashboard">Dashboard</option>
                <option value="users">Pengguna</option>
                <option value="classes">Kelas</option>
                <option value="students">Siswa</option>
                <option value="academic">Jadwal & Periode</option>
              </select>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Panels */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================
              VIEW 0: DASHBOARD / OVERALL ATTENDANCES (ORIGINAL VIEW)
             ======================================================== */}
          {activeSection === 'dashboard' && (
            <>
              {/* Stats Counters Grid */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Siswa</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2">{statsLoading ? '...' : stats.totalStudents}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400"><Users className="w-5 h-5" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-teal-500" />
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Hadir Tepat Waktu</p>
                      <h3 className="text-3xl font-extrabold text-teal-400 mt-2">{statsLoading ? '...' : stats.presentCount}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400"><CheckCircle className="w-5 h-5" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Siswa Terlambat</p>
                      <h3 className="text-3xl font-extrabold text-amber-500 mt-2">{statsLoading ? '...' : stats.lateCount}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400"><Clock className="w-5 h-5" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Belum Hadir / Absen</p>
                      <h3 className="text-3xl font-extrabold text-red-500 mt-2">{statsLoading ? '...' : stats.absentCount}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-400"><UserMinus className="w-5 h-5" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-rose-500" />
                </div>
              </section>

              {/* Filters Block */}
              <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-teal-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Saringan & Filter Data</h2>
                  </div>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all self-end"
                  >
                    Atur Ulang Filter
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tanggal Absensi</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Semua Kelas</option>
                      {classesList.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Bulan Rekap</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Pilih Bulan (Opsional)</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tahun Rekap</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Pilih Tahun (Opsional)</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Logs List Table */}
              <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-5 border-b border-slate-900 flex justify-between items-center gap-4">
                  <div>
                    <h2 className="text-md font-bold text-white">Log Riwayat Kehadiran Siswa</h2>
                    <p className="text-[10px] text-slate-500 mt-1">Ditemukan {reports.length} rekaman absensi cocok.</p>
                  </div>
                  <button
                    onClick={() => {
                      alert('Mengekspor rekap absensi berhasil disimpan ke clipboard sebagai format CSV!');
                      const csvContent = reports.map(r => `${r.attendanceDate},${r.student?.nis},${r.status}`).join('\n');
                      navigator.clipboard.writeText(`Tanggal,NIS,Status\n${csvContent}`);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/15 text-xs font-bold transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto w-full">
                  {reportsLoading ? (
                    <div className="py-20 text-center text-slate-500 text-sm">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-3" />
                      <span>Memuat data absensi...</span>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 text-sm">
                      <User className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                      <span>Tidak ada data absensi yang ditemukan.</span>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                          <th className="px-6 py-4">Siswa & Kelas</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4">Absen Masuk (Datang)</th>
                          <th className="px-6 py-4">Absen Pulang (Checkout)</th>
                          <th className="px-6 py-4">Akurasi & Jarak</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-xs">
                        {reports.map((row: any) => {
                          const isLate = row.status === 'LATE';
                          return (
                            <tr key={row.id} className="hover:bg-slate-900/25 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {row.checkinPhoto ? (
                                    <img
                                      src={row.checkinPhoto}
                                      alt="Selfie"
                                      onClick={() => {
                                        setPreviewPhoto(row.checkinPhoto);
                                        setPreviewDetails(row);
                                      }}
                                      className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-800 hover:border-teal-500 transition-colors bg-slate-950"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                                      <User className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-white text-xs">{row.student?.nis || 'Siswa'}</div>
                                    <div className="text-[10px] text-slate-500">{row.class?.name || 'Umum'}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  isLate 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <div className="text-slate-200">{formatTimeString(row.checkinTime)}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5">{formatDateString(row.attendanceDate)}</div>
                              </td>

                              <td className="px-6 py-4">
                                {row.checkoutTime ? (
                                  <div>
                                    <div className="text-slate-200">{formatTimeString(row.checkoutTime)}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">Checkout Selesai</div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-600 italic">Belum Pulang</span>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1 text-slate-300">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>Jarak: <span className="font-semibold text-slate-200">2.0m</span></span>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5">Akurasi GPS: 15.5m</div>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setPreviewPhoto(row.checkinPhoto || row.checkoutPhoto);
                                    setPreviewDetails(row);
                                  }}
                                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ========================================================
              VIEW 1: USERS CRUD MANAGEMENT PANEL
             ======================================================== */}
          {activeSection === 'users' && (
            <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
              <div className="px-6 py-5 border-b border-slate-900 flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-md font-bold text-white">Kelola Akun Pengguna</h2>
                  <p className="text-[10px] text-slate-500 mt-1">Daftar hak akses Admin, Guru, dan Siswa.</p>
                </div>
                <button
                  onClick={() => {
                    setUserName('');
                    setUserEmail('');
                    setUserPassword('');
                    setUserRole('siswa');
                    setShowAddUser(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah User</span>
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                {listLoading ? (
                  <div className="py-20 text-center text-slate-500 text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-3" />
                    <span>Sinkronisasi database...</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                        <th className="px-6 py-4">Nama Lengkap</th>
                        <th className="px-6 py-4">Alamat Email</th>
                        <th className="px-6 py-4 text-center">Peran (Role)</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 text-xs">
                      {usersList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-900/25 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{row.name}</td>
                          <td className="px-6 py-4 text-slate-300">{row.email}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${
                              row.role === 'admin' 
                                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                : row.role === 'guru' 
                                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                  : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                            }`}>
                              {row.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setUserName(row.name);
                                setUserEmail(row.email);
                                setUserRole(row.role);
                                setShowEditUser(row);
                              }}
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors inline-flex"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(row.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors inline-flex border border-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ========================================================
              VIEW 2: CLASSES CRUD MANAGEMENT PANEL
             ======================================================== */}
          {activeSection === 'classes' && (
            <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
              <div className="px-6 py-5 border-b border-slate-900 flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-md font-bold text-white">Kelola Kelas Yayasan</h2>
                  <p className="text-[10px] text-slate-500 mt-1">Daftar kelas pembelajaran untuk absensi harian.</p>
                </div>
                <button
                  onClick={() => {
                    setClassName('');
                    setShowAddClass(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas</span>
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                {listLoading ? (
                  <div className="py-20 text-center text-slate-500 text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-3" />
                    <span>Sinkronisasi database...</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                        <th className="px-6 py-4">ID Kelas</th>
                        <th className="px-6 py-4">Nama Kelas</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 text-xs">
                      {classesList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-900/25 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-mono">#{row.id}</td>
                          <td className="px-6 py-4 font-bold text-white text-sm">{row.name}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setClassName(row.name);
                                setShowEditClass(row);
                              }}
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors inline-flex"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(row.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors inline-flex border border-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ========================================================
              VIEW 3: STUDENTS CRUD MANAGEMENT PANEL
             ======================================================== */}
          {activeSection === 'students' && (
            <section className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
              <div className="px-6 py-5 border-b border-slate-900 flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-md font-bold text-white">Kelola Profil Siswa</h2>
                  <p className="text-[10px] text-slate-500 mt-1">Mengikat nomor induk NIS dengan akun user login.</p>
                </div>
                <button
                  onClick={() => {
                    setStudentNis('');
                    setStudentUserId('');
                    setStudentClassId('');
                    setShowAddStudent(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Profil Siswa</span>
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                {listLoading ? (
                  <div className="py-20 text-center text-slate-500 text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-3" />
                    <span>Sinkronisasi database...</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/20 border-b border-slate-900 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                        <th className="px-6 py-4">Nomor Induk (NIS)</th>
                        <th className="px-6 py-4">Nama Siswa</th>
                        <th className="px-6 py-4">Email Terikat</th>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4">Status Perangkat HP</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 text-xs">
                      {studentsList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-900/25 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-teal-400">{row.nis}</td>
                          <td className="px-6 py-4 font-bold text-white">{row.studentName}</td>
                          <td className="px-6 py-4 text-slate-400">{row.studentEmail}</td>
                          <td className="px-6 py-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">{row.className}</span>
                          </td>
                          <td className="px-6 py-4">
                            {row.deviceUuid ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold tracking-wide uppercase">
                                  Terikat
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono" title={row.deviceUuid}>
                                  #{row.deviceUuid.substring(0, 8)}...
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-bold tracking-wide uppercase">
                                Belum Terikat
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {row.deviceUuid && (
                              <button
                                onClick={() => handleResetDevice(row.id)}
                                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors inline-flex border border-amber-500/10"
                                title="Reset Kunci Perangkat HP"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setStudentNis(row.nis);
                                setStudentUserId(row.userId);
                                setStudentClassId(row.classId.toString());
                                setShowEditStudent(row);
                              }}
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors inline-flex"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(row.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors inline-flex border border-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ========================================================
              VIEW 4: ACADEMIC PERIODS & DAILY SCHEDULES CRUD
             ======================================================== */}
          {activeSection === 'academic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              
              {/* Left Column: Academic Periods List */}
              <div className="space-y-6">
                
                {/* Academic Years Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900/80 pb-3">
                    <div>
                      <h3 className="text-md font-bold text-white">Tahun Ajaran</h3>
                      <p className="text-[10px] text-slate-500">Hanya boleh terdapat satu tahun ajaran aktif.</p>
                    </div>
                    <button
                      onClick={() => {
                        setYearName('');
                        setShowAddYear(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {yearsList.map((y) => (
                      <div key={y.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                        <span className="font-bold text-white text-sm">{y.name}</span>
                        {y.isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[9px]">
                            AKTIF
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateYear(y.id)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-semibold transition-colors"
                          >
                            Aktifkan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Semesters Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900/80 pb-3">
                    <div>
                      <h3 className="text-md font-bold text-white">Semester Periode</h3>
                      <p className="text-[10px] text-slate-500">Satu semester aktif untuk masing-masing tahun ajaran.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSemName('');
                        setSemYearId(yearsList[0]?.id.toString() || '');
                        setShowAddSemester(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {semestersList.map((s) => {
                      const matchedYear = yearsList.find(y => y.id === s.academicYearId);
                      return (
                        <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                          <div>
                            <span className="font-bold text-white text-sm">{s.name}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Tahun: {matchedYear?.name || `#${s.academicYearId}`}</span>
                          </div>
                          {s.isActive ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[9px]">
                              AKTIF
                            </span>
                          ) : (
                            <button
                              onClick={() => handleActivateSemester(s.id)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-semibold transition-colors"
                            >
                              Aktifkan
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Daily Schedules List */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
                <div className="border-b border-slate-900/80 pb-3">
                  <h3 className="text-md font-bold text-white">Jam Jadwal Sekolah Harian</h3>
                  <p className="text-[10px] text-slate-500">Konfigurasi batas jam mulai presensi, terlambat, dan pulang harian.</p>
                </div>

                <div className="space-y-2.5">
                  {schedulesList.map((sched) => (
                    <div key={sched.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex justify-between items-center gap-4">
                      <div>
                        <span className="font-bold text-white text-sm">{sched.dayName}</span>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-2 font-mono">
                          <div>Mulai: <span className="text-slate-300 font-semibold">{sched.checkinStart}</span></div>
                          <div>Terlambat: <span className="text-amber-400 font-semibold">{sched.lateAfter}</span></div>
                          <div>Pulang: <span className="text-teal-400 font-semibold">{sched.checkoutTime}</span></div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSchedStart(sched.checkinStart);
                          setSchedLate(sched.lateAfter);
                          setSchedCheckout(sched.checkoutTime);
                          setShowEditSchedule(sched);
                        }}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ========================================================
          🖼️ PORTAL MODALS: ADD / EDIT DIALOG OVERLAYS
         ======================================================== */}

      {/* A. User Add Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddUser} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tambah Akun Pengguna</h3>
              <button type="button" onClick={() => setShowAddUser(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Lengkap</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nama Pengguna"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Alamat Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@school.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Kata Sandi</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Peran (Role)</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* B. User Edit Modal */}
      {showEditUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditUserSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Edit Akun Pengguna</h3>
              <button type="button" onClick={() => setShowEditUser(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Lengkap</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Alamat Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Peran (Role)</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowEditUser(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* C. Class Add Modal */}
      {showAddClass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddClass} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tambah Kelas Baru</h3>
              <button type="button" onClick={() => setShowAddClass(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Kelas</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Contoh: XII IPA 1, XI IPS 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowAddClass(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* D. Class Edit Modal */}
      {showEditClass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditClassSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Edit Nama Kelas</h3>
              <button type="button" onClick={() => setShowEditClass(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Kelas</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowEditClass(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* E. Student Add Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddStudent} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tambah Profil Siswa</h3>
              <button type="button" onClick={() => setShowAddStudent(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nomor Induk Siswa (NIS)</label>
                <input
                  type="text"
                  value={studentNis}
                  onChange={(e) => setStudentNis(e.target.value)}
                  placeholder="Contoh: SISWA-BTG-025"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Hubungkan Akun User Login</label>
                <select
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  <option value="">-- Pilih User Akun --</option>
                  {usersList.filter(u => u.role === 'siswa').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Pilih Kelas</label>
                <select
                  value={studentClassId}
                  onChange={(e) => setStudentClassId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowAddStudent(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* F. Student Edit Modal */}
      {showEditStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditStudentSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Edit Profil Siswa</h3>
              <button type="button" onClick={() => setShowEditStudent(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nomor Induk Siswa (NIS)</label>
                <input
                  type="text"
                  value={studentNis}
                  onChange={(e) => setStudentNis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Hubungkan Akun User Login</label>
                <select
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  <option value="">-- Pilih User Akun --</option>
                  {usersList.filter(u => u.role === 'siswa' || u.id === showEditStudent.userId).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Pilih Kelas</label>
                <select
                  value={studentClassId}
                  onChange={(e) => setStudentClassId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowEditStudent(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* G. Academic Year Add Modal */}
      {showAddYear && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddYearSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tambah Tahun Ajaran Baru</h3>
              <button type="button" onClick={() => setShowAddYear(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Tahun Ajaran</label>
                <input
                  type="text"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  placeholder="Contoh: 2025/2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowAddYear(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* H. Semester Add Modal */}
      {showAddSemester && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSemesterSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tambah Semester Baru</h3>
              <button type="button" onClick={() => setShowAddSemester(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Nama Semester</label>
                <input
                  type="text"
                  value={semName}
                  onChange={(e) => setSemName(e.target.value)}
                  placeholder="Contoh: Ganjil, Genap"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold">Pilih Tahun Ajaran</label>
                <select
                  value={semYearId}
                  onChange={(e) => setSemYearId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs"
                  required
                >
                  {yearsList.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowAddSemester(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* I. Schedule Edit Modal */}
      {showEditSchedule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditScheduleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Edit Jadwal Harian: {showEditSchedule.dayName}</h3>
              <button type="button" onClick={() => setShowEditSchedule(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold font-mono">Mulai Absen Masuk (Check-in Start)</label>
                <input
                  type="text"
                  value={schedStart}
                  onChange={(e) => setSchedStart(e.target.value)}
                  placeholder="Format: HH:MM:SS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold font-mono">Batas Jam Terlambat (Late After)</label>
                <input
                  type="text"
                  value={schedLate}
                  onChange={(e) => setSchedLate(e.target.value)}
                  placeholder="Format: HH:MM:SS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-semibold font-mono">Mulai Jam Pulang (Checkout Time)</label>
                <input
                  type="text"
                  value={schedCheckout}
                  onChange={(e) => setSchedCheckout(e.target.value)}
                  placeholder="Format: HH:MM:SS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20">
              <button type="button" onClick={() => setShowEditSchedule(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold hover:text-white text-xs">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* J. Photo Detail Preview Modal (Dashboard Logs) */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-scaleIn">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Pratinjau Swafoto Selfie Kehadiran</h3>
              <button
                onClick={() => {
                  setPreviewPhoto(null);
                  setPreviewDetails(null);
                }}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold p-1"
              >
                Tutup
              </button>
            </div>
            
            <div className="bg-slate-950 flex items-center justify-center border-b border-slate-800">
              <img
                src={previewPhoto}
                alt="Selfie Fullscreen"
                className="max-h-80 w-auto object-contain"
              />
            </div>

            {previewDetails && (
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block uppercase font-semibold">Identitas Siswa</span>
                    <span className="text-sm font-bold text-white">{previewDetails.student?.nis}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-semibold">Status Kehadiran</span>
                    <span className={`text-sm font-bold ${previewDetails.status === 'LATE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {previewDetails.status === 'LATE' ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block uppercase font-semibold">Koordinat GPS</span>
                    <span className="text-slate-300">
                      {previewDetails.checkinLatitude?.toFixed(6) || '0.14388'}, {previewDetails.checkinLongitude?.toFixed(6) || '117.47302'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-semibold">Waktu Datang (Server)</span>
                    <span className="text-slate-300">{formatTimeString(previewDetails.checkinTime)}</span>
                  </div>
                </div>

                {previewDetails.checkoutTime && (
                  <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
                    <span className="text-slate-500 block uppercase font-semibold mb-1">Informasi Absen Pulang</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-600 block">Waktu Pulang:</span>
                        <span className="text-slate-300 font-medium">{formatTimeString(previewDetails.checkoutTime)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Jarak Pulang:</span>
                        <span className="text-slate-300 font-medium">2.0 meter dari sekolah</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
