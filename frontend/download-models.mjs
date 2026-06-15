import fs from 'fs';
import path from 'path';
import https from 'https';

const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const modelsDir = path.join(process.cwd(), 'public', 'models');

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin'
];

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

function download(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(baseUrl + filename, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${filename}' (${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('Downloading face-api models...');
  try {
    for (const file of files) {
      await download(file);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
    process.exit(1);
  }
}

downloadAll();
