import { useState, useCallback, useEffect } from 'react';

import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { ErrorBanner } from './shared/ErrorBanner';
import { DashboardSection } from './sections/DashboardSection';
import { UsersSection } from './sections/UsersSection';
import { ClassesSection } from './sections/ClassesSection';
import { StudentsSection } from './sections/StudentsSection';
import { AcademicSection } from './sections/AcademicSection';

type Section = 'dashboard' | 'users' | 'classes' | 'students' | 'academic';

interface Props {
  token: string;
  user: any;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<Props> = ({ token, user, onLogout }) => {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSectionData = useCallback(async () => {
    setErrorMsg('');
    try {
      if (activeSection === 'dashboard') return;
      const authHeader = { 'Authorization': `Bearer ${token}` };
      let res: Response | undefined;
      if (activeSection === 'users') res = await fetch('/api/users', { headers: authHeader });
      else if (activeSection === 'classes') res = await fetch('/api/classes', { headers: authHeader });
      else if (activeSection === 'students') res = await fetch('/api/students', { headers: authHeader });
      else if (activeSection === 'academic') res = await fetch('/api/academic-years', { headers: authHeader });
      if (res) {
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal memuat data.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }, [activeSection, token]);

  useEffect(() => {
    fetchSectionData();
    // Force section components to re-mount on section change
  }, [activeSection]);

  const handleRefresh = () => {
    setErrorMsg('');
    fetchSectionData();
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection token={token} />;
      case 'users': return <UsersSection token={token} />;
      case 'classes': return <ClassesSection token={token} />;
      case 'students': return <StudentsSection token={token} />;
      case 'academic': return <AcademicSection token={token} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar activeSection={activeSection} onSectionChange={setActiveSection} onRefresh={handleRefresh} isLoading={false} />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <ErrorBanner message={errorMsg} />
          {renderSection()}
        </main>
      </div>
    </div>
  );
};
