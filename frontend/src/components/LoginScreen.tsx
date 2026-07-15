import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, GraduationCap } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password tidak boleh kosong.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Login gagal.');
      }
      if (data.user?.role === 'siswa') {
        throw new Error('Siswa tidak memiliki akses ke panel admin web.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
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
              Kelola presensi siswa secara efisien dan akurat.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-lg font-bold text-foreground">QR Code</div>
              <p className="text-sm text-muted-foreground mt-1">Absensi cepat</p>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Face ID</div>
              <p className="text-sm text-muted-foreground mt-1">Verifikasi wajah</p>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Geofence</div>
              <p className="text-sm text-muted-foreground mt-1">Lokasi sekolah</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hadir<span className="text-primary">Q</span>
            </h1>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-xl font-semibold text-foreground">Masuk</h2>
            <p className="text-sm text-muted-foreground">
              Masukkan kredensial akun Anda untuk melanjutkan.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Menghubungkan...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center mt-8 text-xs text-muted-foreground/60">
            HadirQ &mdash; Sistem Absensi Sekolah
          </p>
        </div>
      </div>
    </div>
  );
};
