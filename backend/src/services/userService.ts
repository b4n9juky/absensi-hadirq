import { userRepo } from '../repositories/userRepository.js';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { user } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { parseExcelUserFile } from '../lib/excelParser.js';
import fs from 'fs';
import { hashPassword } from '@better-auth/utils/password';

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  role: string;
  phone?: string;
}

export interface UpdateUserDto {
  name: string;
  email: string;
  role: string;
  password?: string;
  phone?: string;
}

export class UserService {
  async getUsers(schoolId?: number) {
    return userRepo.findAll(schoolId);
  }

  async createUser(dto: CreateUserDto, schoolId?: number) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama tidak boleh kosong.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new Error('Email tidak boleh kosong.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new Error('Password minimal harus 6 karakter.');
    }

    const validRoles = ['admin', 'guru', 'parent', 'siswa'];
    if (!validRoles.includes(dto.role)) {
      throw new Error('Role tidak valid.');
    }

    // Check email uniqueness
    const existing = await userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error('Email sudah terdaftar.');
    }

    // Call Better Auth to register credentials and user tables safely
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: dto.email,
        password: dto.password,
        name: dto.name
      }
    });

    const userId = signUpResult.user.id;

    // Update role if not 'siswa' (default is 'siswa' in auth configuration)
    if (dto.role !== 'siswa') {
      await db.update(user).set({ role: dto.role }).where(eq(user.id, userId));
    }

    // Set phone if provided
    if (dto.phone) {
      await db.update(user).set({ phone: dto.phone }).where(eq(user.id, userId));
    }

    // Set schoolId if provided (multi-tenant)
    if (schoolId) {
      await db.update(user).set({ schoolId }).where(eq(user.id, userId));
    }

    return userId;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existingUser = await userRepo.findById(id);
    if (!existingUser) {
      throw new Error('User tidak ditemukan.');
    }

    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama tidak boleh kosong.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new Error('Email tidak boleh kosong.');
    }

    const validRoles = ['admin', 'guru', 'parent', 'siswa'];
    if (!validRoles.includes(dto.role)) {
      throw new Error('Role tidak valid.');
    }

    // Check email uniqueness if email changed
    if (dto.email !== existingUser.email) {
      const emailConflict = await userRepo.findByEmail(dto.email);
      if (emailConflict) {
        throw new Error('Email sudah digunakan oleh user lain.');
      }
    }

    await userRepo.update(id, dto.name, dto.email, dto.role, dto.phone);

    // Update password if provided
    if (dto.password) {
      const hashed = await hashPassword(dto.password);
      await userRepo.updatePassword(id, hashed);
    }
  }

  async deleteUser(id: string) {
    const existing = await userRepo.findById(id);
    if (!existing) {
      throw new Error('User tidak ditemukan.');
    }
    await userRepo.delete(id);
  }

  async importUsers(filePath: string, schoolId?: number) {
    const { rows, errors: parseErrors } = parseExcelUserFile(filePath);

    const results: { row: number; email: string; status: string; error?: string }[] = [];
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const existing = await userRepo.findByEmail(row.email);
        if (existing) {
          results.push({ row: rowNum, email: row.email, status: 'skipped', error: 'Email sudah terdaftar.' });
          failed++;
          continue;
        }

        const randomPassword = crypto.randomBytes(8).toString('hex');

        await auth.api.signUpEmail({
          body: {
            email: row.email,
            password: randomPassword,
            name: row.name,
          },
        });

        const created = await userRepo.findByEmail(row.email);
        if (created) {
          if (row.role !== 'siswa') {
            await db.update(user).set({ role: row.role }).where(eq(user.id, created.id));
          }
          if (schoolId) {
            await db.update(user).set({ schoolId }).where(eq(user.id, created.id));
          }
        }

        results.push({ row: rowNum, email: row.email, status: 'imported' });
        imported++;
      } catch (err: any) {
        results.push({ row: rowNum, email: row.email, status: 'failed', error: err.message || 'Gagal membuat user.' });
        failed++;
      }
    }

    // Also include parse-level errors
    for (const pe of parseErrors) {
      results.push({ row: pe.row, email: pe.email, status: 'failed', error: pe.error });
      failed++;
    }

    // Clean up uploaded file
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }

    return { imported, failed, results };
  }
}
export const userService = new UserService();
