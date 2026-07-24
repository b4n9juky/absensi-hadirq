import { useState, useEffect, useRef, memo, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CheckCircle2, UserCircle, Maximize2, Minimize2, Clock, Users, RefreshCw } from 'lucide-react';
import { useAttendanceSound } from '../../hooks/useAttendanceSound';
import { getVideoDevices, getDefaultDeviceId, getCameraConstraints } from '../../utils/camera';

interface StudentEmbedding {
  id: number;
  nis: string;
  studentName: string;
  photo?: string;
  faceEmbedding: number[][];
}

interface RecentArrival {
  id: number;
  studentId: number;
  studentName: string;
  nis: string;
  photo?: string;
  className: string;
  status: string;
  checkinTime: string;
}

const RecentArrivalsPanel = memo(({ arrivals }: { arrivals: RecentArrival[] }) => {
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'text-success bg-success/10 border-success/20';
      case 'LATE': return 'text-warning bg-warning/10 border-warning/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted-foreground/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'Hadir';
      case 'LATE': return 'Terlambat';
      default: return status;
    }
  };

  return (
    <div className="w-1/2 flex-1 min-h-0 flex flex-col bg-zinc-900/50 border-l border-zinc-800/50">
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center border border-success/20">
              <Users className="w-4 h-4 text-success" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Kedatangan Terakhir</h2>
              <p className="text-xs text-zinc-500">{arrivals.length} siswa hari ini</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">Live</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-xl flex items-center justify-center mb-4 border border-zinc-700/50">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm font-medium">Belum ada kedatangan</p>
            <p className="text-zinc-600 text-xs mt-1">Siswa akan muncul di sini setelah scan wajah</p>
          </div>
        ) : (
          arrivals.map((arrival, index) => (
            <div
              key={arrival.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                index === 0
                  ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                  : 'bg-zinc-800/30 border-zinc-700/30 hover:bg-zinc-800/50'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : index < 3
                    ? 'bg-zinc-700 text-zinc-300'
                    : 'bg-zinc-800/50 text-zinc-500'
              }`}>
                <span className="text-xs font-bold">{index + 1}</span>
              </div>

              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/50 flex-shrink-0">
                {arrival.photo ? (
                  <img src={arrival.photo} alt={arrival.studentName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{arrival.studentName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500 font-mono">{arrival.nis}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400">{arrival.className}</span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusColor(arrival.status)}`}>
                  {getStatusLabel(arrival.status)}
                </span>
                <span className="text-xs text-zinc-500 mt-1 font-mono">{formatTime(arrival.checkinTime)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
RecentArrivalsPanel.displayName = 'RecentArrivalsPanel';

export const KioskAttendance = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [studentsData, setStudentsData] = useState<StudentEmbedding[]>([]);
  const [statusMsg, setStatusMsg] = useState('Memuat sistem kiosk...');
  const [matchResult, setMatchResult] = useState<{name: string, isSuccess: boolean, message: string, photo?: string} | null>(null);
  const [kioskKey, setKioskKey] = useState<string | null>(localStorage.getItem('kiosk_secret_key'));
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recentArrivals, setRecentArrivals] = useState<RecentArrival[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [showCameraPicker, setShowCameraPicker] = useState(false);

  const isScanningRef = useRef(true);
  const studentsDataRef = useRef<StudentEmbedding[]>([]);
  const modelsLoadedRef = useRef(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { playAttendanceSound } = useAttendanceSound();

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => { studentsDataRef.current = studentsData; }, [studentsData]);
  useEffect(() => { modelsLoadedRef.current = modelsLoaded; }, [modelsLoaded]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  const fetchRecentArrivals = useCallback(async () => {
    if (!kioskKey) return;
    try {
      const res = await fetch('/api/kiosk/recent-arrivals', { headers: { 'x-kiosk-token': kioskKey } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setRecentArrivals(data.data);
      }
    } catch { /* ignore */ }
  }, [kioskKey]);

  const startVideo = useCallback((deviceId?: string) => {
    setStatusMsg('Mengakses kamera...');
    navigator.mediaDevices.getUserMedia({
      video: getCameraConstraints(deviceId ?? selectedCameraId)
    }).then(async stream => {
      let attempts = 0;
      while (!videoRef.current && attempts < 10) { await new Promise(r => setTimeout(r, 50)); attempts++; }
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        videoRef.current.srcObject = stream;
      }
      setStatusMsg('Sistem siap. Silakan berdiri di depan kamera.');
    }).catch(() => { setStatusMsg('Kamera tidak ditemukan atau ditolak.'); });
  }, [selectedCameraId]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    startVideo(deviceId);
    setShowCameraPicker(false);
  }, [startVideo]);

  const refreshCameras = useCallback(async () => {
    const devices = await getVideoDevices();
    setCameraDevices(devices);
    if (!selectedCameraId && devices.length > 0) {
      const defaultId = getDefaultDeviceId(devices);
      setSelectedCameraId(defaultId);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    if (!kioskKey) return;

    const loadData = async () => {
      try {
        const res = await fetch('/api/kiosk/embeddings', { headers: { 'x-kiosk-token': kioskKey } });
        if (res.status === 401) { localStorage.removeItem('kiosk_secret_key'); setKioskKey(null); return; }
        const data = await res.json();
        if (data.success) setStudentsData(data.data);
      } catch { /* ignore */ }
    };

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
        await refreshCameras();
        startVideo();
      } catch { setStatusMsg('Gagal memuat AI Models.'); }
    };

    loadData();
    loadModels();
    fetchRecentArrivals();
    const arrivalInterval = setInterval(fetchRecentArrivals, 10000);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      clearInterval(arrivalInterval);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [kioskKey, startVideo, fetchRecentArrivals, refreshCameras]);

  const handleVideoPlay = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!isScanningRef.current || !videoRef.current || !modelsLoadedRef.current || studentsDataRef.current.length === 0) return;
      if (videoRef.current.paused || videoRef.current.ended || videoRef.current.videoWidth === 0) return;

      let detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks().withFaceDescriptors();

      if (detections.length === 0) {
        detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
          .withFaceLandmarks().withFaceDescriptors();
      }

      if (canvasRef.current && videoRef.current) {
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        if (displaySize.width > 0) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resized = faceapi.resizeResults(detections, displaySize);
          canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resized);
        }
      }

      if (detections.length > 0) {
        let bestMatch = { id: -1, distance: 1.0, name: '' };
        let secondBest = { id: -1, distance: 1.0, name: '' };
        const descriptor = detections[0].descriptor;
        for (const student of studentsDataRef.current) {
          const minDist = student.faceEmbedding.reduce((min, emb) => {
            const d = faceapi.euclideanDistance(descriptor, new Float32Array(emb));
            return d < min ? d : min;
          }, Infinity);
          if (minDist < bestMatch.distance) {
            secondBest = bestMatch;
            bestMatch = { id: student.id, distance: minDist, name: student.studentName || student.nis };
          } else if (minDist < secondBest.distance) {
            secondBest = { id: student.id, distance: minDist, name: student.studentName || student.nis };
          }
        }
        const margin = secondBest.distance - bestMatch.distance;
        if (bestMatch.distance < 0.4 && margin > 0.05 && isScanningRef.current) {
          isScanningRef.current = false;
          processCheckin(bestMatch.id, bestMatch.name);
        }
      }
    }, 500);
  }, []);

  const processCheckin = useCallback(async (studentId: number, name: string) => {
    if (!kioskKey) return;
    try {
      let lat: number | undefined, lng: number | undefined, acc: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
      } catch {
        /* GPS unavailable — proceed without location */
      }

      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kiosk-token': kioskKey },
        body: JSON.stringify({ studentId, latitude: lat, longitude: lng, accuracy: acc })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMatchResult({ name: data.data.studentName || name, isSuccess: true, message: data.message, photo: data.data.studentPhoto });
        playAttendanceSound(true, data.message);
        fetchRecentArrivals();
      } else {
        setMatchResult({ name, isSuccess: false, message: data.error || 'Gagal check-in', photo: undefined });
        playAttendanceSound(false, data.error || 'Gagal check-in');
      }
    } catch {
      setMatchResult({ name, isSuccess: false, message: 'Kesalahan jaringan', photo: undefined });
      playAttendanceSound(false, 'Kesalahan jaringan');
    }
    setTimeout(() => { setMatchResult(null); isScanningRef.current = true; }, 4000);
  }, [kioskKey, fetchRecentArrivals, playAttendanceSound]);

  if (!kioskKey) {
    const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      setAuthLoading(true);

      // 1. Validate kiosk key first
      try {
        const res = await fetch('/api/kiosk/embeddings', { headers: { 'x-kiosk-token': inputKey } });
        if (res.status === 401) { setAuthError('Kunci Kiosk tidak valid.'); setAuthLoading(false); return; }
        const data = await res.json();
        if (!res.ok || !data.success) { setAuthError(data.error || 'Kunci Kiosk tidak valid.'); setAuthLoading(false); return; }
      } catch { setAuthError('Gagal terhubung ke server.'); setAuthLoading(false); return; }

      // 2. Geofence check — require GPS, compare against school location
      try {
        const [posRes, locRes] = await Promise.all([
          new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
          }),
          fetch('/api/kiosk/school-location', { headers: { 'x-kiosk-token': inputKey } }).then(r => r.json())
        ]);

        const { school_latitude, school_longitude, school_radius_meters } = locRes.data;
        if (school_latitude && school_longitude) {
          const R = 6371000;
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(posRes.coords.latitude - school_latitude);
          const dLon = toRad(posRes.coords.longitude - school_longitude);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(school_latitude)) * Math.cos(toRad(posRes.coords.latitude)) * Math.sin(dLon / 2) ** 2;
          const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (distanceM > school_radius_meters) {
            setAuthError(`Berada di luar area sekolah (${Math.round(distanceM)}m). Maksimal ${school_radius_meters}m.`);
            setAuthLoading(false);
            return;
          }
        }

        localStorage.setItem('kiosk_secret_key', inputKey);
        setKioskKey(inputKey);
      } catch {
        setAuthError('Gagal mendapatkan lokasi GPS. Aktifkan GPS pada perangkat.');
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto border border-primary/20 text-primary">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Otentikasi Kiosk Absensi</h2>
            <p className="text-zinc-400 text-sm mt-2">Masukkan Kunci Rahasia Kiosk. Perangkat harus berada di area sekolah (GPS aktif).</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)}
              placeholder="Masukkan Kunci Rahasia..."
              className="w-full px-5 py-4 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" required />
            {authError && <p className="text-destructive text-xs text-left px-1" role="alert">{authError}</p>}
            <button type="submit" disabled={authLoading} className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold transition-all shadow-lg hover:shadow-primary/20">
              {authLoading ? 'Memvalidasi...' : 'Hubungkan Perangkat'}
            </button>
          </form>
          <p className="text-zinc-600 text-xs">Kunci rahasia diatur oleh administrator pada file .env backend server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 flex justify-between items-center border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Kiosk Absensi</h1>
            <p className="text-xs text-zinc-500">{studentsData.length} wajah terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400" role="status">{statusMsg}</p>
          {cameraDevices.length > 1 && (
            <div className="relative">
              <button onClick={() => setShowCameraPicker(v => !v)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-primary hover:text-primary/70 transition-colors"
                title="Ganti Kamera" aria-label="Ganti Kamera">
                <RefreshCw className="w-4 h-4" />
              </button>
              {showCameraPicker && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {cameraDevices.map(d => (
                    <button key={d.deviceId}
                      onClick={() => switchCamera(d.deviceId)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-zinc-800 last:border-b-0 transition-colors ${
                        d.deviceId === selectedCameraId
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}>
                      {d.label || `Kamera ${d.deviceId.slice(0, 8)}...`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={handleToggleFullscreen} className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-primary hover:text-primary/70 transition-colors" title="Layar Penuh" aria-label="Layar Penuh">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side - Camera Feed */}
        <div className="w-1/2 relative bg-zinc-950 flex items-center justify-center">
          <video ref={videoRef} autoPlay muted playsInline onPlay={handleVideoPlay}
            className="absolute min-w-full min-h-full object-cover transform -scale-x-100 opacity-80" />
          <canvas ref={canvasRef} className="absolute min-w-full min-h-full object-cover transform -scale-x-100 z-10 pointer-events-none" />
          <div className="z-10 w-56 h-72 border-4 border-dashed border-primary/50 rounded-full animate-pulse flex items-center justify-center pointer-events-none">
            <div className="w-full h-full border-2 border-solid border-primary rounded-full opacity-30"></div>
          </div>
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-zinc-800/50" role="status">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs text-zinc-400">Kamera Aktif</span>
          </div>

          {/* Result Overlay — scoped to camera side only */}
          <div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ visibility: matchResult ? 'visible' : 'hidden', contain: 'strict' }}
          >
            <div className="w-full h-full flex items-center justify-center bg-black/80">
              <div className={`p-8 rounded-3xl flex flex-col items-center text-center max-w-sm w-full mx-4 shadow-2xl transition-opacity duration-200 ${matchResult?.isSuccess ? 'bg-primary/40 border border-primary/50' : 'bg-destructive/40 border border-destructive/50'}`}
                style={{ opacity: matchResult ? 1 : 0 }} role="alert">
                {matchResult?.photo ? (
                  <img src={matchResult.photo} alt={matchResult.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/50 shadow-lg mb-4" />
                ) : matchResult?.isSuccess ? (
                  <CheckCircle2 className="w-20 h-20 text-primary mb-4 drop-shadow-lg" />
                ) : (
                  <UserCircle className="w-20 h-20 text-destructive mb-4 drop-shadow-lg" />
                )}
                <h2 className="text-2xl font-bold mb-2 text-white">{matchResult?.name}</h2>
                <p className="text-base text-gray-300">{matchResult?.message}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Arrival List (memoized) */}
        <RecentArrivalsPanel arrivals={recentArrivals} />
      </div>
    </div>
  );
};
