import { useState, useEffect, useCallback } from 'react';
import { Check, X, MapPin, Clock, Eye, Globe, AlertCircle, RefreshCw, Building } from 'lucide-react';
import { api } from '../../lib/api';
import { DataTable } from '../shared/DataTable';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface School {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  isActive: boolean;
  isApproved: boolean;
  contactEmail: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracy: number;
  timezone: string;
  createdAt: string;
}

type FilterTab = 'pending' | 'active' | 'rejected' | 'all';

export const AdminSchoolsSection: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [error, setError] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/schools');
      if (res.success) {
        setSchools(res.data || []);
      } else {
        setError(res.error || 'Gagal memuat data sekolah.');
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const handleApprove = async (id: number) => {
    const res = await api.put(`/api/admin/schools/${id}/approve`);
    if (res.success) {
      setSchools(prev => prev.map(s => s.id === id ? { ...s, isApproved: true, isActive: true } : s));
    }
  };

  const handleReject = async (id: number) => {
    const res = await api.put(`/api/admin/schools/${id}/reject`);
    if (res.success) {
      setSchools(prev => prev.map(s => s.id === id ? { ...s, isApproved: false } : s));
    }
  };

  const filteredSchools = schools.filter(s => {
    if (filter === 'pending') return !s.isApproved;
    if (filter === 'active') return s.isApproved && s.isActive;
    if (filter === 'rejected') return !s.isApproved && !s.isActive;
    return true;
  });

  const columns = [
    {
      key: 'name',
      header: 'Sekolah',
      render: (row: School) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-2xs text-muted-foreground font-mono">{row.slug}.hadirq.app</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contactEmail',
      header: 'Kontak',
      render: (row: School) => (
        <div className="text-sm">
          <div className="text-foreground">{row.contactEmail || '-'}</div>
          {row.phone && <div className="text-2xs text-muted-foreground">{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: School) => {
        if (!row.isApproved) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-2xs font-bold uppercase tracking-wide">Menunggu</span>;
        if (row.isActive) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xs font-bold uppercase tracking-wide"><Check className="w-3 h-3" />Aktif</span>;
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-2xs font-bold uppercase tracking-wide"><X className="w-3 h-3" />Nonaktif</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Tanggal Daftar',
      render: (row: School) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right' as const,
      render: (row: School) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => { setSelectedSchool(row); setShowConfig(true); }}
            className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            title="Konfigurasi"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {!row.isApproved && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                title="Setujui"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                onClick={() => handleReject(row.id)}
                className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
                title="Tolak"
              >
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kelola Sekolah</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pendaftaran dan konfigurasi sekolah
          </p>
        </div>
        <button
          onClick={loadSchools}
          disabled={loading}
          className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        {(['pending', 'active', 'rejected', 'all'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
              filter === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'pending' && 'Menunggu'}
            {tab === 'active' && 'Aktif'}
            {tab === 'rejected' && 'Ditolak'}
            {tab === 'all' && 'Semua'}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredSchools}
          loading={loading}
          emptyText="Tidak ada sekolah."
          searchPlaceholder="Cari sekolah..."
        />
      </div>

      {showConfig && selectedSchool && (
        <SchoolConfigModal
          school={selectedSchool}
          onClose={() => { setShowConfig(false); setSelectedSchool(null); }}
          onSaved={loadSchools}
        />
      )}
    </div>
  );
};

interface ConfigModalProps {
  school: School;
  onClose: () => void;
  onSaved: () => void;
}

const SchoolConfigModal: React.FC<ConfigModalProps> = ({ school, onClose, onSaved }) => {
  const [latitude, setLatitude] = useState(String(school.latitude || ''));
  const [longitude, setLongitude] = useState(String(school.longitude || ''));
  const [radius, setRadius] = useState(String(school.radiusMeters || '50'));
  const [accuracy, setAccuracy] = useState(String(school.maxAccuracy || '30'));
  const [timezone, setTimezone] = useState(school.timezone || 'Asia/Jakarta');
  const [isActive, setIsActive] = useState(school.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/api/admin/schools/${school.id}`, {
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        radiusMeters: parseFloat(radius) || 50,
        maxAccuracy: parseFloat(accuracy) || 30,
        timezone,
        isActive,
      });
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError(res.error || 'Gagal menyimpan.');
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Konfigurasi: ${school.name}`}
      onClose={onClose}
      maxWidth="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-muted-foreground mb-1 uppercase font-semibold text-2xs">Status</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">Sekolah aktif</span>
            </label>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <MapPin className="w-3.5 h-3.5" />
            Geofence
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Latitude" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-6.2088" />
            <FormInput label="Longitude" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="106.8456" />
            <FormInput label="Radius (m)" type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="50" />
            <FormInput label="Max Akurasi (m)" type="number" value={accuracy} onChange={e => setAccuracy(e.target.value)} placeholder="30" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5" />
            Zona Waktu
          </h4>
          <FormSelect
            label="Zona Waktu"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            options={[
              { value: 'Asia/Jakarta', label: 'WIB (UTC+7)' },
              { value: 'Asia/Makassar', label: 'WITA (UTC+8)' },
              { value: 'Asia/Jayapura', label: 'WIT (UTC+9)' },
            ]}
          />
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <Globe className="w-3.5 h-3.5" />
            Informasi
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-2xs text-muted-foreground uppercase font-semibold">Slug</span>
              <p className="text-foreground font-mono">{school.slug}</p>
            </div>
            <div>
              <span className="text-2xs text-muted-foreground uppercase font-semibold">Email</span>
              <p className="text-foreground">{school.contactEmail || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
