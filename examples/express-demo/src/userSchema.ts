import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  email: z.email(),
});

export type User = z.infer<typeof userSchema>;
