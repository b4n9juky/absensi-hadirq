"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const userService_js_1 = require("../services/userService.js");
const schema_js_1 = require("../db/schema.js");
const index_js_1 = require("../db/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const validate_js_1 = require("../middlewares/validate.js");
const validation_js_1 = require("../lib/validation.js");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.get('/', async (req, res) => {
    try {
        const data = await userService_js_1.userService.getUsers();
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.usersRouter.post('/', (0, validate_js_1.validate)(validation_js_1.createUserSchema), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const userId = await userService_js_1.userService.createUser({ name, email, password, role });
        res.status(201).json({ success: true, message: 'User berhasil dibuat.', data: { id: userId } });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.usersRouter.put('/:id', (0, validate_js_1.validate)(validation_js_1.updateUserSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        await userService_js_1.userService.updateUser(id, { name, email, role });
        res.json({ success: true, message: 'User berhasil diperbarui.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// DELETE user
exports.usersRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check references in students
        const linked = await index_js_1.db.select().from(schema_js_1.students).where((0, drizzle_orm_1.eq)(schema_js_1.students.userId, id)).limit(1);
        if (linked.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User tidak bisa dihapus karena terhubung dengan data profil Siswa. Silakan hapus data siswa terlebih dahulu.'
            });
        }
        await userService_js_1.userService.deleteUser(id);
        res.json({ success: true, message: 'User berhasil dihapus.' });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = exports.usersRouter;
