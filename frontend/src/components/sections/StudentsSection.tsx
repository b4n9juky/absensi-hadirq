import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, QrCode, Download, Camera, Upload } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { DeviceBadge } from '../shared/StatusBadge';
import { DataTable } from '../shared/DataTable';
import { ModalShell } from '../shared/ModalShell';
import { FormInput, FormSelect } from '../shared/FormField';

interface StudentRecord {
  id: number; userId: string; nis: string; classId: number;
  studentName: string; studentEmail: string; className: string;
  deviceUuid?: string | null;
  qrcode?: string | null;
  faceEmbedding?: string | null;
  photo?: string | null;
}
interface UserRecord { id: string; name: string; email: string; role: string; }
interface ClassRecord { id: number; name: string; }

interface Props { token: string; }

export const StudentsSection: React.FC<Props> = ({ token }) => {
  const authHeader = { 'Authorization': `Bearer ${token}` };
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState<StudentRecord | null>(null);
  const [studentNis, setStudentNis] = useState('');
  const [studentUserId, setStudentUserId] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [previewQr, setPreviewQr] = useState<StudentRecord | null>(null);

  // Promote states
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteFromClass, setPromoteFromClass] = useState('');
  const [promoteToClass, setPromoteToClass] = useState('');
  const [promoteSelectedStudents, setPromoteSelectedStudents] = useState<number[]>([]);
  const [promoteLoading, setPromoteLoading] = useState(false);

  // Photo Upload
  const [showPhotoUpload, setShowPhotoUpload] = useState<StudentRecord | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Face Registration
  const [showFaceRegister, setShowFaceRegister] = useState<StudentRecord | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceStatus, setFaceStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const startFaceRegistration = async (student: StudentRecord) => {
    setShowFaceRegister(student);
    setFaceLoading(true);
    setFaceStatus('Memuat model AI...');
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setFaceStatus('Membuka kamera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        throw new Error('Elemen video tidak ditemukan setelah render.');
      }
    } catch (err: any) {
      setFaceStatus('Error: ' + err.message);
    } finally {
      setFaceLoading(false);
    }
  };

  const closeFaceRegister = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowFaceRegister(null);
    setFaceStatus('');
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !showFaceRegister) return;
    setFaceLoading(true);
    setFaceStatus('Mendeteksi wajah...');
    try {
      if (videoRef.current.paused || videoRef.current.ended || videoRef.current.videoWidth === 0) {
        setFaceStatus('Kamera belum siap, mohon tunggu beberapa saat.');
        setFaceLoading(false);
        return;
      }

      // 1. Try SSD Mobilenet V1
      let detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      // 2. Fallback to Tiny Face Detector
      if (!detection) {
        detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
        ).withFaceLandmarks().withFaceDescriptor();
      }

      if (!detection) {
        setFaceStatus('Wajah tidak terdeteksi. Pastikan posisi wajah tegak, pencahayaan cukup, dan hadap langsung ke kamera.');
        setFaceLoading(false);
        return;
      }
      setFaceStatus('Menyimpan ke database...');
      const descriptor = Array.from(detection.descriptor);
      const res = await fetch(`/api/students/${showFaceRegister.id}/register-face`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ faceEmbedding: descriptor })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Wajah berhasil didaftarkan!');
        closeFaceRegister();
      } else {
        throw new Error(data.error || 'Gagal menyimpan wajah');
      }
    } catch (err: any) {
      setFaceStatus('Error: ' + err.message);
    } finally {
      setFaceLoading(false);
    }
  };

  const promoteSourceStudents = studentsList.filter(s => s.classId === parseInt(promoteFromClass));

  useEffect(() => {
    if (promoteFromClass) {
      const ids = studentsList.filter(s => s.classId === parseInt(promoteFromClass)).map(s => s.id);
      setPromoteSelectedStudents(ids);
    } else {
      setPromoteSelectedStudents([]);
    }
  }, [promoteFromClass, studentsList]);

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteFromClass || !promoteToClass) {
      alert('Pilih kelas asal dan kelas tujuan.');
      return;
    }
    if (promoteFromClass === promoteToClass) {
      alert('Kelas asal dan kelas tujuan tidak boleh sama.');
      return;
    }
    if (promoteSelectedStudents.length === 0) {
      alert('Pilih minimal satu siswa untuk dipindahkan.');
      return;
    }
    setPromoteLoading(true);
    try {
      const res = await fetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          fromClassId: parseInt(promoteFromClass),
          toClassId: parseInt(promoteToClass),
          studentIds: promoteSelectedStudents
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Proses kenaikan kelas berhasil dilakukan!');
        setShowPromoteModal(false);
        setPromoteFromClass('');
        setPromoteToClass('');
        fetchData();
      } else {
        throw new Error(data.error || 'Gagal melakukan kenaikan kelas.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPromoteLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setListLoading(true);
    try {
      const [resStud, resCls, resUsr] = await Promise.all([
        fetch('/api/students', { headers: authHeader }),
        fetch('/api/classes', { headers: authHeader }),
        fetch('/api/users', { headers: authHeader }),
      ]);
      const dataStud = await resStud.json(); if (dataStud.success) setStudentsList(dataStud.data);
      const dataCls = await resCls.json(); if (dataCls.success) setClassesList(dataCls.data);
      const dataUsr = await resUsr.json(); if (dataUsr.success) setUsersList(dataUsr.data);
    } catch { /* ignore */ } finally { setListLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(''), 4000); return () => clearTimeout(t); } }, [toastMsg]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ nis: studentNis, userId: studentUserId, classId: parseInt(studentClassId) }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil dibuat!'); setShowAddStudent(false); setStudentNis(''); setStudentUserId(''); setStudentClassId(''); fetchData(); }
      else throw new Error(data.error || 'Gagal menyimpan siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditStudent) return;
    try {
      const res = await fetch(`/api/students/${showEditStudent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ nis: studentNis, userId: studentUserId, classId: parseInt(studentClassId) }) });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil diperbarui!'); setShowEditStudent(null); fetchData(); }
      else throw new Error(data.error || 'Gagal memperbarui siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus profil siswa ini?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Profil Siswa berhasil dihapus.'); fetchData(); }
      else throw new Error(data.error || 'Gagal menghapus siswa.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handlePhotoUpload = async () => {
    if (!showPhotoUpload || !photoFile) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const res = await fetch(`/api/students/${showPhotoUpload.id}/photo`, {
        method: 'PUT',
        headers: authHeader,
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Foto siswa berhasil diperbarui!');
        setShowPhotoUpload(null);
        setPhotoFile(null);
        setPhotoPreview(null);
        fetchData();
      } else {
        throw new Error(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const closePhotoUpload = () => {
    setShowPhotoUpload(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleResetDevice = async (id: number) => {
    if (!confirm('Reset perangkat HP yang terikat pada siswa ini?')) return;
    try {
      const res = await fetch(`/api/students/${id}/reset-device`, { method: 'PUT', headers: authHeader });
      const data = await res.json();
      if (res.ok && data.success) { triggerToast('Perangkat HP berhasil direset.'); fetchData(); }
      else throw new Error(data.error || 'Gagal reset device.');
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const columns = [
    {
      key: 'nis',
      header: 'Nomor Induk (NIS)',
      render: (row: StudentRecord) => <span className="font-mono text-muted-foreground font-bold">{row.nis}</span>
    },
    {
      key: 'studentName',
      header: 'Nama Siswa',
      render: (row: StudentRecord) => <span className="font-bold text-foreground">{row.studentName || '-'}</span>
    },
    {
      key: 'studentEmail',
      header: 'Email Terikat',
      render: (row: StudentRecord) => <span className="text-muted-foreground">{row.studentEmail || '-'}</span>
    },
    {
      key: 'className',
      header: 'Kelas',
      render: (row: StudentRecord) => <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">{row.className || '-'}</span>
    },
    {
      key: 'deviceUuid',
      header: 'Status Perangkat HP',
      render: (row: StudentRecord) => <DeviceBadge bound={!!row.deviceUuid} />
    },
    {
      key: 'faceEmbedding',
      header: 'Biometrik Wajah',
      align: 'center' as const,
      render: (row: StudentRecord) => (
        row.faceEmbedding ? (
          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-teal-500/10 border-teal-500/20 text-teal-400">
            Terdaftar
          </span>
        ) : (
          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-500/10 border-slate-500/20 text-slate-400">
            Belum Ada
          </span>
        )
      )
    },
    {
      key: 'photo',
      header: 'Foto',
      align: 'center' as const,
      render: (row: StudentRecord) => (
        row.photo ? (
          <img src={row.photo} alt={row.studentName}
            className="w-9 h-9 rounded-full object-cover border border-border cursor-pointer hover:border-primary transition-colors"
            onClick={() => { setShowPhotoUpload(row); setPhotoPreview(row.photo!); }} />
        ) : (
          <button onClick={() => { setShowPhotoUpload(row); setPhotoPreview(null); setPhotoFile(null); }}
            className="p-1.5 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex" title="Upload Foto">
            <Upload className="w-3.5 h-3.5" />
          </button>
        )
      )
    },
    {
      key: 'qrcode',
      header: 'QR Code',
      align: 'center' as const,
      render: (row: StudentRecord) => (
        row.qrcode ? (
          <button onClick={() => setPreviewQr(row)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex">
            <QrCode className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-muted-foreground/50 text-[10px]">—</span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right' as const,
      render: (row: StudentRecord) => (
        <div className="space-x-1 inline-flex">
          <button onClick={() => startFaceRegistration(row)}
            className="p-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-500 hover:text-teal-600 transition-colors inline-flex border border-teal-500/10" title="Daftarkan Wajah">
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setStudentNis(row.nis); setStudentUserId(row.userId); setStudentClassId(String(row.classId)); setShowEditStudent(row); }}
            className="p-2 rounded-lg bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex" title="Edit Siswa">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {row.deviceUuid && (
            <button onClick={() => handleResetDevice(row.id)}
              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-600 transition-colors inline-flex border border-amber-500/10" title="Reset Device">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => handleDelete(row.id)}
            className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors inline-flex border border-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center gap-4">
        <div><h2 className="text-md font-bold text-foreground">Kelola Profil Siswa</h2><p className="text-[10px] text-muted-foreground mt-1">Mengikat nomor induk NIS dengan akun user login.</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setPromoteFromClass(''); setPromoteToClass(''); setShowPromoteModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-all">
            <span>Kenaikan Kelas</span>
          </button>
          <button onClick={() => { setStudentNis(''); setStudentUserId(''); setStudentClassId(''); setShowAddStudent(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all">
            <Plus className="w-4 h-4" /><span>Tambah Profil Siswa</span>
          </button>
        </div>
      </div>
      <div className="w-full">
        <DataTable
          columns={columns}
          data={studentsList}
          loading={listLoading}
          searchPlaceholder="Cari siswa..."
          emptyText="Tidak ada profil siswa."
        />
      </div>
      {errorMsg && <div className="px-6 py-3 text-destructive text-xs">{errorMsg}</div>}
      {toastMsg && <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-2xl flex items-center gap-2 animate-bounce"><span>{toastMsg}</span></div>}

      {showAddStudent && (
        <ModalShell title="Tambah Profil Siswa" onClose={() => setShowAddStudent(false)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowAddStudent(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="addStudentForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan</button></>}>
          <form id="addStudentForm" onSubmit={handleAdd}>
            <div className="space-y-4">
              <FormInput label="Nomor Induk Siswa (NIS)" value={studentNis} onChange={(e) => setStudentNis(e.target.value)} placeholder="Contoh: SISWA-BTG-025" required />
              <FormSelect label="Hubungkan Akun User Login" value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)}
                options={usersList.filter(u => u.role === 'siswa').map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))} placeholder="-- Pilih User --" />
              <FormSelect label="Kelas" value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas --" />
            </div>
          </form>
        </ModalShell>
      )}

      {showEditStudent && (
        <ModalShell title="Edit Profil Siswa" onClose={() => setShowEditStudent(null)} maxWidth="md"
          footer={<><button type="button" onClick={() => setShowEditStudent(null)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button><button type="submit" form="editStudentForm" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">Simpan Perubahan</button></>}>
          <form id="editStudentForm" onSubmit={handleEdit}>
            <div className="space-y-4">
              <FormInput label="Nomor Induk Siswa (NIS)" value={studentNis} onChange={(e) => setStudentNis(e.target.value)} required />
              <FormSelect label="Hubungkan Akun User Login" value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)}
                options={usersList.filter(u => u.role === 'siswa' || u.id === showEditStudent.userId).map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))} placeholder="-- Pilih User --" />
              <FormSelect label="Kelas" value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas --" />
            </div>
          </form>
        </ModalShell>
      )}

      {previewQr && (
        <ModalShell title={`QR Code - ${previewQr.nis}`} onClose={() => setPreviewQr(null)} maxWidth="sm"
          footer={<>
            <a href={previewQr.qrcode!} download={`${previewQr.nis}.png`}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs inline-flex items-center gap-2">
              <Download className="w-3.5 h-3.5" /> Unduh QR
            </a>
            <button onClick={() => setPreviewQr(null)}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Tutup</button>
          </>}>
          <div className="flex flex-col items-center gap-4 py-4">
            <img src={previewQr.qrcode!} alt={`QR ${previewQr.nis}`}
              className="w-48 h-48 rounded-xl border border-border" />
            <div className="text-center">
              <p className="font-bold text-foreground text-sm">{previewQr.studentName || previewQr.nis}</p>
              <p className="text-muted-foreground text-xs mt-1">NIS: {previewQr.nis}</p>
            </div>
          </div>
        </ModalShell>
      )}

      {showFaceRegister && (
        <ModalShell title={`Pendaftaran Wajah - ${showFaceRegister.studentName || showFaceRegister.nis}`} onClose={closeFaceRegister} maxWidth="md"
          footer={<>
            <button onClick={closeFaceRegister} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button onClick={handleCaptureFace} disabled={faceLoading} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" /> {faceLoading ? 'Memproses...' : 'Ambil Wajah & Simpan'}
            </button>
          </>}>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-full max-w-[320px] aspect-[4/3] bg-black rounded-xl overflow-hidden border-2 border-border shadow-inner">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100"></video>
              <div className="absolute inset-0 border-2 border-teal-500/50 rounded-xl pointer-events-none border-dashed m-4"></div>
            </div>
            {faceStatus && <p className="text-sm text-center text-muted-foreground font-medium animate-pulse">{faceStatus}</p>}
            <p className="text-xs text-center text-muted-foreground/70 px-4">Posisikan wajah Anda tepat di tengah kamera dengan pencahayaan yang cukup. Pastikan Anda tidak memakai kacamata hitam atau masker.</p>
          </div>
        </ModalShell>
      )}
      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <ModalShell title={`Upload Foto - ${showPhotoUpload.studentName || showPhotoUpload.nis}`} onClose={closePhotoUpload} maxWidth="sm"
          footer={<>
            <button onClick={closePhotoUpload} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button onClick={handlePhotoUpload} disabled={!photoFile || photoUploading}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" /> {photoUploading ? 'Mengunggah...' : 'Simpan Foto'}
            </button>
          </>}>
          <div className="flex flex-col items-center gap-4 py-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview"
                className="w-40 h-40 rounded-full object-cover border-4 border-border shadow-lg" />
            ) : (
              <div className="w-40 h-40 rounded-full bg-background border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/60">
                <Upload className="w-10 h-10" />
              </div>
            )}
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-secondary hover:bg-accent border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-all inline-flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" /> Pilih File Foto
              <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
            </label>
            <p className="text-[10px] text-muted-foreground/70 text-center">Format: JPG, PNG, WebP. Maks: 2MB.</p>
          </div>
        </ModalShell>
      )}

      {/* Promote Students Modal */}
      {showPromoteModal && (
        <ModalShell title="Kenaikan Kelas Massal" onClose={() => setShowPromoteModal(false)} maxWidth="lg"
          footer={<><button type="button" onClick={() => setShowPromoteModal(false)} className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold hover:text-foreground text-xs">Batal</button>
            <button onClick={handlePromoteSubmit} disabled={promoteLoading} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
              {promoteLoading ? 'Memproses...' : 'Proses Kenaikan Kelas'}
            </button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Dari Kelas (Asal)" value={promoteFromClass} onChange={e => setPromoteFromClass(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas Asal --" />
              <FormSelect label="Ke Kelas (Tujuan)" value={promoteToClass} onChange={e => setPromoteToClass(e.target.value)}
                options={classesList.map(c => ({ value: String(c.id), label: c.name }))} placeholder="-- Pilih Kelas Tujuan --" />
            </div>

            {promoteFromClass && (
              <div className="border border-border rounded-xl p-4 bg-muted/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-foreground">Daftar Siswa ({promoteSourceStudents.length} siswa):</span>
                  <button type="button" onClick={() => {
                    if (promoteSelectedStudents.length === promoteSourceStudents.length) {
                      setPromoteSelectedStudents([]);
                    } else {
                      setPromoteSelectedStudents(promoteSourceStudents.map(s => s.id));
                    }
                  }} className="text-[10px] text-teal-400 font-bold hover:underline">
                    {promoteSelectedStudents.length === promoteSourceStudents.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>
                {promoteSourceStudents.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-6">Tidak ada siswa di kelas ini.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {promoteSourceStudents.map(s => {
                      const isChecked = promoteSelectedStudents.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 cursor-pointer border border-border/30 bg-background/50">
                          <input type="checkbox" checked={isChecked} onChange={() => {
                            if (isChecked) {
                              setPromoteSelectedStudents(prev => prev.filter(id => id !== s.id));
                            } else {
                              setPromoteSelectedStudents(prev => [...prev, s.id]);
                            }
                          }} className="rounded border-border focus:ring-teal-400" />
                          <div className="text-xs">
                            <span className="font-bold text-foreground">{s.studentName || 'Siswa'}</span>
                            <span className="text-muted-foreground font-mono ml-2">({s.nis})</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </section>
  );
};
