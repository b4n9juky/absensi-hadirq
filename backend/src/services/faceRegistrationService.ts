import { db } from '../db/index.js';
import { students } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { studentService } from './studentService.js';
import path from 'path';
import fs from 'fs';

const MODELS_PATH = process.env.FACEAPI_MODELS_PATH || path.join(__dirname, '../../../frontend/public/models');

export class FaceRegistrationService {
  private modelsLoaded = false;

  private async ensureModels() {
    if (this.modelsLoaded) return;

    if (!fs.existsSync(MODELS_PATH)) {
      throw new Error(`Face-api models not found at ${MODELS_PATH}. Run 'cd frontend && node download-models.mjs' first.`);
    }

    const faceapi = await import('@vladmandic/face-api');
    const canvas = await import('canvas');

    const { Canvas, Image, ImageData } = canvas.default as any;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH),
    ]);

    this.modelsLoaded = true;
  }

  async registerFace(studentId: number, photoPath: string) {
    const faceapi = await import('@vladmandic/face-api');
    const canvas = await import('canvas');

    await this.ensureModels();

    if (!fs.existsSync(photoPath)) {
      throw new Error('File foto tidak ditemukan.');
    }

    const img = await (canvas.default as any).loadImage(photoPath);
    const detections = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      fs.unlinkSync(photoPath);
      throw new Error('Tidak dapat mendeteksi wajah pada foto. Pastikan wajah terlihat jelas dan pencahayaan cukup.');
    }

    if (!detections.landmarks || detections.landmarks.positions.length < 50) {
      fs.unlinkSync(photoPath);
      throw new Error('Kualitas foto wajah kurang baik. Pastikan seluruh wajah terlihat, tidak tertutup masker/kacamata hitam, dan pencahayaan cukup.');
    }

    const embedding = Array.from(detections.descriptor);

    const dup = await studentService.checkDuplicateFace(studentId, embedding);
    if (dup.isDuplicate) {
      fs.unlinkSync(photoPath);
      throw new Error(`Wajah ini sudah terdaftar atas nama ${dup.matchedStudent!.name} (${dup.matchedStudent!.nis}). Silakan hapus data wajah sebelumnya jika ingin mendaftarkan ulang.`);
    }

    const relativePhotoPath = photoPath.replace(/\\/g, '/').replace(/^.*?\/uploads\//, 'uploads/');
    const savedPath = relativePhotoPath.startsWith('uploads/') ? relativePhotoPath : `uploads/faces/${path.basename(photoPath)}`;

    await studentService.appendFaceEmbedding(studentId, embedding);
    await db.update(students)
      .set({ photo: savedPath })
      .where(eq(students.id, studentId));

    return {
      success: true,
      message: 'Wajah berhasil direkam.',
      studentId,
      embeddingSize: embedding.length,
    };
  }
}

export const faceRegistrationService = new FaceRegistrationService();
