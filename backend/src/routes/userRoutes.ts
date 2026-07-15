import { Router } from 'express';
import { userService } from '../services/userService.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../lib/validation.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  try {
    const data = await userService.getUsers();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

usersRouter.post('/', validate(createUserSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const userId = await userService.createUser({ name, email, password, role });
    res.status(201).json({ success: true, message: 'User berhasil dibuat.', data: { id: userId } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

usersRouter.put('/:id', validate(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    await userService.updateUser(id, { name, email, role });
    res.json({ success: true, message: 'User berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE user
usersRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;



    await userService.deleteUser(id);
    res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
export default usersRouter;
