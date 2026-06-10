import { userRepo } from '../repositories/userRepository.js';
import { auth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { user } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  role: string;
}

export class UserService {
  async getUsers() {
    return userRepo.findAll();
  }

  async createUser(dto: CreateUserDto) {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Nama tidak boleh kosong.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new Error('Email tidak boleh kosong.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new Error('Password minimal harus 6 karakter.');
    }

    const validRoles = ['admin', 'guru', 'siswa'];
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

    // Update role if not 'siswa' (default is 'siswa' in auth configuration)
    if (dto.role !== 'siswa') {
      await db.update(user).set({ role: dto.role }).where(eq(user.id, signUpResult.user.id));
    }

    return signUpResult.user.id;
  }

  async updateUser(id: string, dto: CreateUserDto) {
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

    const validRoles = ['admin', 'guru', 'siswa'];
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

    await userRepo.update(id, dto.name, dto.email, dto.role);
  }

  async deleteUser(id: string) {
    const existing = await userRepo.findById(id);
    if (!existing) {
      throw new Error('User tidak ditemukan.');
    }
    await userRepo.delete(id);
  }
}
export const userService = new UserService();
