import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req[target]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((issue: { message: string }) => issue.message).join(', ');
        return res.status(400).json({ success: false, error: messages });
      }
      return res.status(400).json({ success: false, error: 'Validasi gagal.' });
    }
  };
}
