import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createAssignmentSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  classId: z.string().uuid('Invalid class ID'),
  dueDate: z.string().refine((val) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return val >= todayStr;
  }, 'Due date cannot be in the past'),
});

export const logSessionSchema = z.object({
  recordId: z.string().uuid('Invalid record ID'),
  seconds: z.number().int().min(1).max(28800, 'Reading sessions cannot exceed 8 hours'),
});

export const updateStatusSchema = z.object({
  recordId: z.string().uuid('Invalid record ID'),
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type LogSessionInput = z.infer<typeof logSessionSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
