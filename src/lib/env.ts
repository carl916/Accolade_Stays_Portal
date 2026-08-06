import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.string().default("Local")
});

export function getPublicAppEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV
  }).NEXT_PUBLIC_APP_ENV;
}
