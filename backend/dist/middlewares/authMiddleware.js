"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authMiddleware = void 0;
const auth_js_1 = require("../lib/auth.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logPath = path_1.default.join(__dirname, '../../auth_debug.log');
const authMiddleware = async (req, res, next) => {
    try {
        const sessionData = await auth_js_1.auth.api.getSession({
            headers: req.headers
        });
        const logMsg = `[${new Date().toISOString()}] URL: ${req.url}, Method: ${req.method}, Auth: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'NONE'}, Session: ${sessionData ? `User: ${sessionData.user.email}, Role: ${sessionData.user.role}` : 'NULL'}\n`;
        fs_1.default.appendFileSync(logPath, logMsg);
        if (!sessionData) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Sesi tidak ditemukan.' });
        }
        req.context = {
            user: sessionData.user,
            session: sessionData.session
        };
        next();
    }
    catch (err) {
        console.error('[AuthMiddleware] Error:', err);
        res.status(500).json({ success: false, error: 'Gagal memproses autentikasi.' });
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const contextMsg = `[requireRole] URL: ${req.url}, context: ${!!req.context}, user: ${!!req.context?.user}, role: ${req.context?.user?.role}, allowed: ${JSON.stringify(allowedRoles)}\n`;
        fs_1.default.appendFileSync(logPath, contextMsg);
        if (!req.context || !req.context.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Sesi tidak ditemukan.' });
        }
        const role = req.context.user.role;
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ success: false, error: 'Forbidden: Anda tidak memiliki akses untuk menu ini.' });
        }
        next();
    };
};
exports.requireRole = requireRole;
