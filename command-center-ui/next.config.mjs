import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PERMANENT FIX: In development, force .env.local Clerk keys to override shell environment
// This prevents production keys from leaking via shell/IDE environment (e.g., from `vercel env pull`)
if (process.env.NODE_ENV !== 'production') {
  const envLocalPath = resolve(__dirname, '.env.local');
  if (existsSync(envLocalPath)) {
    const envContent = readFileSync(envLocalPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.includes('=')) continue;

      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();

      // Override Clerk keys from .env.local (these are the problematic ones that leak from shell)
      if (key.includes('CLERK') && value) {
        process.env[key.trim()] = value;
      }
    }
  }

  // Verify correct keys are loaded
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (clerkKey?.startsWith('pk_live_')) {
    console.error('\n⚠️  ERROR: Production Clerk key detected in development!');
    console.error('   This should not happen after .env.local override.');
    console.error('   Check your .env.local file has correct test keys (pk_test_...)\n');
  } else if (clerkKey?.startsWith('pk_test_')) {
    console.log('✓ Development Clerk keys loaded from .env.local');
  }
}

// DISABLED: Custom dotenv loading was interfering with Next.js's native .env.local loading
// Next.js automatically loads .env.local in development, which has all required variables
// Vercel provides environment variables directly via their dashboard for production
//
// if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
//   const { config } = await import('dotenv');
//   config({ path: resolve(__dirname, '../.env') });
// }

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
  output: 'standalone', // Required for Docker deployment

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

