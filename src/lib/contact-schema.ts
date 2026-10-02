import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().max(254),
  projectType: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(0).optional(),
  formRenderedAt: z.number(),
});

export type ContactSubmission = z.infer<typeof contactSchema>;
