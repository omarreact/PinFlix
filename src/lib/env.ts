import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (!value) return true;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("PinFlix"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  DEMO_MODE: booleanish.default(true),
  DATABASE_URL: z.string().default("file:./dev.db"),
  AUTH_SECRET: z.string().min(32).default("streamflix-demo-secret-change-this-in-production-123"),
  SESSION_COOKIE_NAME: z.string().default("streamflix_session"),
});

export const env = envSchema.parse(process.env);

export function ensureDemoModeSafe() {
  return env.DEMO_MODE !== false;
}
