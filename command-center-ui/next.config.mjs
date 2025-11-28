import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
    NEXT_PUBLIC_PROSPECTING_API: process.env.NEXT_PUBLIC_PROSPECTING_API,
    NEXT_PUBLIC_ANALYSIS_API: process.env.NEXT_PUBLIC_ANALYSIS_API,
    NEXT_PUBLIC_OUTREACH_API: process.env.NEXT_PUBLIC_OUTREACH_API,
    NEXT_PUBLIC_REPORT_API: process.env.NEXT_PUBLIC_REPORT_API,
    NEXT_PUBLIC_PIPELINE_API: process.env.NEXT_PUBLIC_PIPELINE_API,
  },

  // Production build configuration
  // output: 'standalone', // Only needed for Docker deployment, not Vercel

  // Experimental features
  experimental: {
    externalDir: true,
  },

  // Turbopack configuration - set root directory to avoid lockfile confusion
  turbopack: {
    root: __dirname,
  },

  // Disable static export for Clerk compatibility
  // Pages will be rendered on-demand (SSR)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

