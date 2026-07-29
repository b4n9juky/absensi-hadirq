import { useState } from 'react';
import { GraduationCap, CheckCircle, AlertCircle, Building, Globe, Mail, Lock, User } from 'lucide-react';
import { api } from '../../lib/api';

export const SchoolRegistrationSection: React.FC = () => {
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(generated);
    setSlugAvailable(null);
  };

  const handleSlugChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    setSlugAvailable(null);
  };

  const checkSlug = async () => {
    if (!slug || slug.length < 3) return;
    setCheckingSlug(true);
    try {
      const res = await api.get(`/api/schools/check-slug?slug=${slug}`, { public: true });
      setSlugAvailable(res.success && !res.data?.taken);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || slugAvailable === false) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/schools/register', {
        name: schoolName,
        slug,
        adminName,
        adminEmail,
        adminPassword,
      }, { public: true });
      if (res.success) {
        setStep('success');
      } else {
        setError(res.error || 'Gagal mendaftarkan sekolah.');
      }
    } catch (err: any) {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pendaftaran Berhasil!</h2>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Data sekolah <span className="font-semibold text-foreground">{schoolName}</span> telah kami terima.
              Tim kami akan memverifikasi dan mengaktifkan akun Anda.
            </p>
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-4 text-left text-sm space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span>Akses sekolah: <span className="font-mono text-foreground">{slug}.hadirq.app</span></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Email admin: <span className="text-foreground">{adminEmail}</span></span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Status aktivasi akan dikirimkan ke email admin setelah disetujui.
            Proses verifikasi biasanya memakan waktu 1x24 jam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-md space-y-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Hadir<span className="text-primary">Q</span>
            </h1>
            <p className="text-base text-muted-foreground mt-3 leading-relaxed">
              Sistem absensi sekolah modern dengan dukungan QR code dan pengenalan wajah.
              Daftarkan sekolah Anda dan kelola presensi secara efisien.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Multi Platform</p>
                <p className="text-xs text-muted-foreground">Web dashboard & aplikasi Android</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">QR Code & Face Recognition</p>
                <p className="text-xs text-muted-foreground">Absensi cepat dengan QR dan pengenalan wajah</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Geofence Otomatis</p>
                <p className="text-xs text-muted-foreground">Validasi lokasi presensi siswa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hadir<span className="text-primary">Q</span>
            </h1>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-xl font-semibold text-foreground">Daftarkan Sekolah</h2>
            <p className="text-sm text-muted-foreground">
              Isi data sekolah untuk memulai. Akun admin akan dibuat otomatis.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-muted-foreground mb-1.5 uppercase font-semibold text-xs">Nama Sekolah</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => handleSchoolNameChange(e.target.value)}
                  placeholder="SMA Negeri 1 Bontang"
                  className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1.5 uppercase font-semibold text-xs">Subdomain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  onBlur={checkSlug}
                  placeholder="sman-1-bontang"
                  className={`w-full bg-background border rounded-xl pl-10 pr-24 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors ${
                    slugAvailable === true ? 'border-emerald-500/50' : slugAvailable === false ? 'border-destructive/50' : 'border-input'
                  }`}
                  required
                  minLength={3}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">.hadirq.app</span>
              </div>
              {checkingSlug && <p className="text-xs text-muted-foreground mt-1">Memeriksa ketersediaan...</p>}
              {slugAvailable === true && <p className="text-xs text-emerald-400 mt-1">Subdomain tersedia!</p>}
              {slugAvailable === false && <p className="text-xs text-destructive mt-1">Subdomain sudah digunakan.</p>}
            </div>

            <div className="border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Akun Admin</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-muted-foreground mb-1.5 uppercase font-semibold text-xs">Nama Admin</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      placeholder="Kepala Sekolah"
                      className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1.5 uppercase font-semibold text-xs">Email Admin</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder="admin@sekolah.sch.id"
                      className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1.5 uppercase font-semibold text-xs">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || slugAvailable === false || !slug}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Mendaftarkan...' : 'Daftarkan Sekolah'}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Sudah punya akun?{' '}
              <a href="/#/login" className="text-primary hover:underline">Masuk</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
