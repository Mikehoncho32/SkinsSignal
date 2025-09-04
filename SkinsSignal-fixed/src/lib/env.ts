import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CSFLOAT_API_KEY: z.string().min(1),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.errors.map(e => e.path.join("."));
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[env] Missing required env(s): ${missing.join(", ")}`);
    } else {
      console.warn("[env] Missing/invalid env vars (dev tolerated):", missing.join(", "));
    }
  }
  return process.env as unknown as Env;
}
