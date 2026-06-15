import { useState, useEffect } from 'react';
import { Save, MapPin, Crosshair, Ruler, Wifi, AlertCircle, CheckCircle, School } from 'lucide-react';
import { FormInput } from '../shared/FormField';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface Props {
  token: string;
}

export const SettingsSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings', { headers: authHeader });
      const data = await res.json();
      if (data.success) {
        setLatitude(data.data.school_latitude || '');
        setLongitude(data.data.school_longitude || '');
        setRadius(data.data.school_radius_meters || '');
        setAccuracy(data.data.max_accuracy_meters || '');
        setApiBaseUrl(data.data.api_base_url || '');
        setSchoolName(data.data.school_name || '');
      }
    } catch (err: any) {
      setError('Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload: Record<string, string> = {};
    if (latitude.trim()) payload.school_latitude = latitude.trim();
    if (longitude.trim()) payload.school_longitude = longitude.trim();
    if (radius.trim()) payload.school_radius_meters = radius.trim();
    if (accuracy.trim()) payload.max_accuracy_meters = accuracy.trim();
    if (apiBaseUrl.trim()) payload.api_base_url = apiBaseUrl.trim();
    if (schoolName.trim()) payload.school_name = schoolName.trim();

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Pengaturan berhasil disimpan.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      setError('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pengaturan Sistem</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Konfigurasi geolokasi & koneksi perangkat Android
          </p>
        </div>
        <button
          onClick={loadSettings}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Muat Ulang
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-400" />
            Lokasi Sekolah (Geofence)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-7.123456"
            />
            <FormInput
              label="Longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="112.123456"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-teal-400" />
            Batasan Presensi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Radius Sekolah (meter)"
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="50"
            />
            <FormInput
              label="Maks. Akurasi GPS (meter)"
              type="number"
              value={accuracy}
              onChange={(e) => setAccuracy(e.target.value)}
              placeholder="30"
            />
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
            <Ruler className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Radius sekolah: batas maksimal jarak siswa dari titik koordinat sekolah.
              Akurasi GPS: batas maksimal ketidakpastian sinyal GPS (semakin kecil semakin akurat).
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Wifi className="w-4 h-4 text-teal-400" />
            Koneksi Aplikasi Android
          </h3>
          <FormInput
            label="API Base URL (opsional)"
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://absensi.sekolah.sch.id"
          />
          <p className="text-xs text-muted-foreground">
            Biarkan kosong untuk menggunakan URL server otomatis. Isi jika aplikasi Android
            membutuhkan URL tetap (misalnya untuk akses dari luar jaringan).
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <School className="w-4 h-4 text-teal-400" />
            Identitas Sekolah
          </h3>
          <FormInput
            label="Nama Sekolah"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="SMA Negeri 1 Bontang"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
};
