import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Since the backend builds to CommonJS (type: commonjs), __dirname is available globally.
const currentDir = __dirname;

// Search paths for .env:
// 1. Current working directory: process.cwd() / .env
// 2. Current working directory backend folder: process.cwd() / backend / .env
// 3. Relative to this file's compiled directory (dist/lib/env.js -> dist/.env)
// 4. Relative to this file's source directory (src/lib/env.ts -> .env)
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.resolve(currentDir, '../../.env'),
  path.resolve(currentDir, '../../../.env'),
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    loaded = true;
    break;
  }
}

if (!loaded) {
  // Default fallback
  dotenv.config({ override: true });
}
