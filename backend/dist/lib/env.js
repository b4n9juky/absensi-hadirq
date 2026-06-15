"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Since the backend builds to CommonJS (type: commonjs), __dirname is available globally.
const currentDir = __dirname;
// Search paths for .env:
// 1. Current working directory: process.cwd() / .env
// 2. Current working directory backend folder: process.cwd() / backend / .env
// 3. Relative to this file's compiled directory (dist/lib/env.js -> dist/.env)
// 4. Relative to this file's source directory (src/lib/env.ts -> .env)
const envPaths = [
    path_1.default.join(process.cwd(), '.env'),
    path_1.default.join(process.cwd(), 'backend', '.env'),
    path_1.default.resolve(currentDir, '../../.env'),
    path_1.default.resolve(currentDir, '../../../.env'),
];
let loaded = false;
for (const envPath of envPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath, override: true });
        loaded = true;
        break;
    }
}
if (!loaded) {
    // Default fallback
    dotenv_1.default.config({ override: true });
}
