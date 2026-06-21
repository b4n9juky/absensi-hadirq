import { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { CheckCircle2, XCircle, Camera, Loader2 } from 'lucide-react';

interface StudentRecord {
  id: number;
  nis: string;
  studentName: string;
  classId: number;
}

interface ClassRecord { id: number; name: string; }

export const FaceRegistration = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const token = new URLSearchParams(window.location.search).get('token');
  const authHeaders = { 'x-kiosk-token': token || '' };

  const [authenticated, setAuthenticated] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Memuat sistem...');
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentRecord | null>(null);
  const [recording, setRecording] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) { setStatusMsg('Token tidak ditemukan.'); return; }
    fetch('/api/kiosk/classes', { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setClassesList(d.data);
          setAuthenticated(true);
          setStatusMsg('Pilih kelas untuk memulai.');
          loadModels();
        } else {
          setStatusMsg('Token tidak valid.');
        }
      })
      .catch(() => setStatusMsg('Gagal terhubung ke server.'));
  }, []);

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
    } catch {
      setStatusMsg('Gagal memuat model AI.');
    }
  };

  useEffect(() => {
    if (!selectedClassId) return;
    setStatusMsg('Memuat daftar siswa...');
    setActiveStudent(null);
    setResultMsg(null);
    fetch(`/api/kiosk/students-without-face?classId=${selectedClassId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStudents(d.data);
          setStatusMsg(d.data.length > 0 ? `${d.data.length} siswa perlu direkam. Tap untuk memulai.` : 'Semua siswa sudah memiliki data wajah.');
        }
      })
      .catch(() => setStatusMsg('Gagal memuat siswa.'));
  }, [selectedClassId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanRef.current = true;
        setRecording(true);
        setTimeout(startScanning, 500);
      }
    } catch {
      setStatusMsg('Kamera tidak tersedia.');
    }
  };

  const stopCamera = () => {
    scanRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  const startScanning = () => {
    if (!scanRef.current || !videoRef.current) return;
    const iv = setInterval(async () => {
      if (!scanRef.current || !videoRef.current || !videoRef.current.videoWidth) {
        clearInterval(iv);
        return;
      }
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
      ).withFaceLandmarks().withFaceDescriptors();

      if (canvasRef.current && videoRef.current) {
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const resized = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resized);
      }

      if (detections.length > 0 && detections[0].descriptor) {
        clearInterval(iv);
        scanRef.current = false;
        const descriptor = Array.from(detections[0].descriptor);
        await uploadFace(descriptor);
      }
    }, 400);
  };

  const uploadFace = async (descriptor: number[]) => {
    if (!activeStudent) return;
    setStatusMsg('Menyimpan data wajah...');
    try {
      const res = await fetch(`/api/kiosk/register-face/${activeStudent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ faceEmbedding: descriptor }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompletedIds(prev => new Set(prev).add(activeStudent.id));
        setStudents(prev => prev.filter(s => s.id !== activeStudent.id));
        setResultMsg({ ok: true, msg: `${activeStudent.studentName} berhasil direkam!` });
      } else {
        setResultMsg({ ok: false, msg: data.error || 'Gagal menyimpan.' });
      }
    } catch {
      setResultMsg({ ok: false, msg: 'Gagal terhubung ke server.' });
    }
    stopCamera();
    setActiveStudent(null);
    setRecording(false);
  };

  const handleSelectStudent = (s: StudentRecord) => {
    if (completedIds.has(s.id)) return;
    setActiveStudent(s);
    setResultMsg(null);
    startCamera();
  };

  if (!authenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm">{statusMsg}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold">Rekam Wajah Siswa</h1>
        <p className="text-xs text-muted-foreground">{statusMsg}</p>
      </div>

      {!recording && (
        <>
          <select
            value={selectedClassId || ''}
            onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-foreground text-xs mb-4"
          >
            <option value="">-- Pilih Kelas --</option>
            {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                className="p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left"
              >
                <div className="text-xs font-bold truncate">{s.studentName}</div>
                <div className="text-[10px] text-muted-foreground">{s.nis}</div>
              </button>
            ))}
          </div>

          {resultMsg && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${resultMsg.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {resultMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {resultMsg.msg}
            </div>
          )}
        </>
      )}

      {recording && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="relative flex-1">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover mirror" playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute top-4 left-4 text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-xl">
              {activeStudent.studentName}
            </div>
            <button
              onClick={() => { stopCamera(); setActiveStudent(null); setResultMsg(null); }}
              className="absolute top-4 right-4 text-white bg-red-500/80 px-4 py-2 rounded-xl text-xs font-bold"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
