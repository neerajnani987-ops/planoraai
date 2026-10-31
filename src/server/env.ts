import { z } from "zod";

const ServerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function getServerEnv() {
  // Support standard Gemini and Google Gen AI environment variable names
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  const trimmedKey = rawKey.trim();
  const isValidKey =
    trimmedKey.length > 0 &&
    !trimmedKey.includes("your_gemini_api_key") &&
    !trimmedKey.includes("placeholder") &&
    !trimmedKey.includes("your_api_key_here");

  const rawModel = process.env.GEMINI_MODEL || process.env.GOOGLE_GENAI_MODEL || "gemini-3.8-flash";

  const parsed = ServerEnvSchema.safeParse({
    GEMINI_API_KEY: isValidKey ? trimmedKey : undefined,
    GEMINI_MODEL: rawModel.trim() || "gemini-3.8-flash",
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.format());
    console.error("Invalid server environment configuration:", errorDetails);
    throw new Error("Invalid server environment configuration");
  }

  return parsed.data;
}
