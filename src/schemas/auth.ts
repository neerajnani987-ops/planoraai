import { z } from "zod";

export const RegisterInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(128, "Password cannot exceed 128 characters"),
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name cannot exceed 60 characters"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UserPreferencesSchema = z.object({
  defaultCurrency: z.string().min(1).max(5).default("USD"),
  emailNotifications: z.boolean().default(true),
  themePreference: z.enum(["light", "dark", "system"]).default("light"),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().default(""),
  photoURL: z.string().optional().default(""),
  preferences: UserPreferencesSchema.default({
    defaultCurrency: "USD",
    emailNotifications: true,
    themePreference: "light",
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
