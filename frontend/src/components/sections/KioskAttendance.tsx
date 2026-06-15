import { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CheckCircle2, UserCircle } from 'lucide-react';

interface StudentEmbedding {
  id: number;
  nis: string;
  studentName: string;
  faceEmbedding: number[];
}

export const KioskAttendance = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [studentsData, setStudentsData] = useState<StudentEmbedding[]>([]);
  const [statusMsg, setStatusMsg] = useState('Memuat sistem kiosk...');
  
  const [matchResult, setMatchResult] = useState<{name: string, isSuccess: boolean, message: string} | null>(null);
  const isScanningRef = useRef(true);
  
  // Kiosk Authentication States
  const [kioskKey, setKioskKey] = useState<string | null>(localStorage.getItem('kiosk_secret_key'));
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');

  // Refs to prevent stale closures inside setInterval
  const studentsDataRef = useRef<StudentEmbedding[]>([]);
  const modelsLoadedRef = useRef(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    studentsDataRef.current = studentsData;
  }, [studentsData]);

  useEffect(() => {
    modelsLoadedRef.current = modelsLoaded;
  }, [modelsLoaded]);

  useEffect(() => {
    if (!kioskKey) return;

    const loadData = async () => {
      try {
        const res = await fetch('/api/students/embeddings', {
          headers: { 'x-kiosk-token': kioskKey }
        });
        if (res.status === 401) {
          localStorage.removeItem('kiosk_secret_key');
          setKioskKey(null);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setStudentsData(data.data);
        }
      } catch (err) {
        console.error('Failed to load embeddings', err);
      }
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
        setStatusMsg('Sistem siap. Silakan berdiri di depan kamera.');
        startVideo();
      } catch (err) {
        setStatusMsg('Gagal memuat AI Models.');
        console.error(err);
      }
    };
    
    loadData();
    loadModels();
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [kioskKey]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        facingMode: 'user' 
      } 
    })
      .then(async stream => {
        let attempts = 0;
        while (!videoRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        setStatusMsg('Kamera tidak ditemukan atau ditolak.');
        console.error(err);
      });
  };

  const handleVideoPlay = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    scanIntervalRef.current = setInterval(async () => {
      if (!isScanningRef.current || !videoRef.current || !modelsLoadedRef.current || studentsDataRef.current.length === 0) return;
      
      if (videoRef.current.paused || videoRef.current.ended || videoRef.current.videoWidth === 0) return;

      // 1. Try SSD Mobilenet V1
      let detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      ).withFaceLandmarks().withFaceDescriptors();

      // 2. Fallback to Tiny Face Detector
      if (detections.length === 0) {
        detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
        ).withFaceLandmarks().withFaceDescriptors();
      }
      
      if (canvasRef.current && videoRef.current) {
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        if (displaySize.width > 0) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        }
      }

      if (detections.length > 0) {
        // Find best match
        let bestMatch = { id: -1, distance: 1.0, name: '' };
        
        const descriptor = detections[0].descriptor;
        for (const student of studentsDataRef.current) {
          const studentDesc = new Float32Array(student.faceEmbedding);
          const distance = faceapi.euclideanDistance(descriptor, studentDesc);
          if (distance < bestMatch.distance) {
            bestMatch = { id: student.id, distance, name: student.studentName || student.nis };
          }
        }

        if (bestMatch.distance < 0.5) {
          if (isScanningRef.current) {
            isScanningRef.current = false;
            processCheckin(bestMatch.id, bestMatch.name);
          }
        }
      }
    }, 500); // scan every 500ms
  };

  const processCheckin = async (studentId: number, name: string) => {
    if (!kioskKey) return;
    try {
      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-kiosk-token': kioskKey
        },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMatchResult({ name: data.data.studentName || name, isSuccess: true, message: data.message });
      } else {
        setMatchResult({ name, isSuccess: false, message: data.error || 'Gagal check-in' });
      }
    } catch (err: any) {
      setMatchResult({ name, isSuccess: false, message: 'Kesalahan jaringan' });
    }
    
    setTimeout(() => {
      setMatchResult(null);
      isScanningRef.current = true;
    }, 4000);
  };

  // Lock screen if not authenticated
  if (!kioskKey) {
    const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      try {
        const res = await fetch('/api/students/embeddings', {
          headers: { 'x-kiosk-token': inputKey }
        });
        if (res.status === 401) {
          setAuthError('Kunci Kiosk tidak valid.');
          return;
        }
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('kiosk_secret_key', inputKey);
          setKioskKey(inputKey);
        } else {
          setAuthError(data.error || 'Kunci Kiosk tidak valid.');
        }
      } catch (err) {
        setAuthError('Gagal terhubung ke server.');
      }
    };

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20 text-teal-400">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Otentikasi Kiosk Absensi</h2>
            <p className="text-zinc-400 text-sm mt-2">Masukkan Kunci Rahasia Kiosk (Kiosk Secret Key) untuk mengaktifkan kamera deteksi wajah di perangkat ini.</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input 
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Masukkan Kunci Rahasia..."
              className="w-full px-5 py-4 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              required
            />
            {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}
            <button 
              type="submit"
              className="w-full py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-all shadow-lg hover:shadow-teal-500/20"
            >
              Hubungkan Perangkat
            </button>
          </form>
          <p className="text-zinc-600 text-[10px]">Kunci rahasia diatur oleh administrator pada file .env backend server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 w-full p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-2xl font-bold text-teal-400 flex items-center gap-2">
          <Camera className="w-8 h-8" /> Kiosk Absensi
        </h1>
        <div className="text-right">
          <p className="text-sm text-gray-300">{statusMsg}</p>
          <p className="text-xs text-gray-500">{studentsData.length} data wajah dimuat</p>
        </div>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          onPlay={handleVideoPlay}
          className="absolute min-w-full min-h-full object-cover transform -scale-x-100 opacity-80"
        />
        <canvas ref={canvasRef} className="absolute min-w-full min-h-full object-cover transform -scale-x-100 z-10 pointer-events-none" />
        
        {/* Frame / Overlay guide */}
        <div className="z-10 w-64 h-80 border-4 border-dashed border-teal-500/50 rounded-full animate-pulse flex items-center justify-center pointer-events-none">
          <div className="w-full h-full border-2 border-solid border-teal-400 rounded-full opacity-30"></div>
        </div>
      </div>

      {/* Result Overlay */}
      {matchResult && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className={`p-8 rounded-3xl flex flex-col items-center text-center max-w-md w-full mx-4 shadow-2xl ${matchResult.isSuccess ? 'bg-teal-900/40 border border-teal-500/50' : 'bg-red-900/40 border border-red-500/50'}`}>
            {matchResult.isSuccess ? (
              <CheckCircle2 className="w-24 h-24 text-teal-400 mb-4 drop-shadow-lg" />
            ) : (
              <UserCircle className="w-24 h-24 text-red-400 mb-4 drop-shadow-lg" />
            )}
            <h2 className="text-3xl font-bold mb-2 text-white">{matchResult.name}</h2>
            <p className="text-lg text-gray-300">{matchResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
