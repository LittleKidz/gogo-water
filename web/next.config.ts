import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Supabase REST (https) + Realtime (wss) — the only external origins the browser talks to.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWss = supabaseUrl.replace(/^https:/, "wss:");

/**
 * CSP without nonces (page is statically prerendered).
 * Per Next.js docs, nonces require dynamic rendering for every request and are incompatible
 * with partial prerendering, so 'unsafe-inline' is needed for Next's inline bootstrap scripts.
 * See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md → "Without Nonces".
 * 'unsafe-eval' only in development (React dev tooling).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'", // next/font self-hosts Google fonts
  `connect-src 'self' ${supabaseUrl} ${supabaseWss}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
