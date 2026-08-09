import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.string().default("Local")
});

const siteUrlSchema = z
  .string()
  .trim()
  .url()
  .transform((value) => value.replace(/\/+$/, ""));

export function getPublicAppEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV
  }).NEXT_PUBLIC_APP_ENV;
}

export function getPublicSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "https://portal.accoladestays.co.uk";

  const url = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;

  return siteUrlSchema.parse(url);
}

export function getInviteAcceptUrl() {
  return `${getPublicSiteUrl()}/auth/accept-invite`;
}
