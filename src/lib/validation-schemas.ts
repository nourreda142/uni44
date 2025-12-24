import { z } from 'zod';

// User validation schemas
export const userCreateSchema = z.object({
  userCode: z.string()
    .trim()
    .min(1, 'User code is required')
    .max(50, 'User code must be less than 50 characters')
    .regex(/^[A-Za-z0-9]+$/, 'User code must be alphanumeric only'),
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be less than 200 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  role: z.enum(['admin', 'staff', 'student'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
});

export const userUpdateSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be less than 200 characters'),
  role: z.enum(['admin', 'staff', 'student'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
});

// Course validation schema
export const courseSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Course name is required')
    .max(200, 'Course name must be less than 200 characters'),
  code: z.string()
    .trim()
    .min(1, 'Course code is required')
    .max(20, 'Course code must be less than 20 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Course code must be alphanumeric with hyphens only'),
  departmentId: z.string()
    .uuid('Invalid department selected'),
  doctorId: z.string().uuid().optional().or(z.literal('')),
  taId: z.string().uuid().optional().or(z.literal('')),
});

// Instructor validation schema
export const instructorSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be less than 200 characters'),
  title: z.string()
    .trim()
    .max(50, 'Title must be less than 50 characters'),
  instructorType: z.enum(['doctor', 'teaching_assistant'], {
    errorMap: () => ({ message: 'Please select a valid instructor type' })
  }),
  departmentId: z.string().uuid().optional().or(z.literal('')),
  userId: z.string().uuid().optional().or(z.literal('')),
});

// Department validation schema
export const departmentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Department name is required')
    .max(200, 'Department name must be less than 200 characters'),
  code: z.string()
    .trim()
    .min(1, 'Department code is required')
    .max(20, 'Department code must be less than 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Department code must be uppercase alphanumeric'),
});

// Group validation schema
export const groupSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters'),
  departmentId: z.string()
    .uuid('Invalid department selected'),
});

// Section validation schema
export const sectionSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Section name is required')
    .max(100, 'Section name must be less than 100 characters'),
  groupId: z.string()
    .uuid('Invalid group selected'),
});

// Simple validation helper that returns data or error message
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data, error: null };
  }
  return { data: null, error: result.error.errors[0]?.message || 'Validation failed' };
}

// Type inference helpers
export type CourseFormData = z.infer<typeof courseSchema>;
export type InstructorFormData = z.infer<typeof instructorSchema>;
export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type DepartmentFormData = z.infer<typeof departmentSchema>;
export type GroupFormData = z.infer<typeof groupSchema>;
export type SectionFormData = z.infer<typeof sectionSchema>;
