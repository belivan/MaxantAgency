/**
 * Lib Barrel Exports
 * Central export file for cleaner imports across the application
 *
 * NOTE: This file only exports client-safe modules.
 * For server-only code, import directly:
 * - import { supabase } from '@/lib/database/supabase-server';
 * - import { getDefaultBrief } from '@/lib/api/orchestrator';
 * - import { ensureSharedEnv } from '@/lib/server/server-utils';
 */

// General utilities (client-safe)
export * from './utils';

// Type exports (client-safe)
export * from './types';

// NOTE: Server-only modules are NOT exported here to avoid bundling issues.
// Import them directly when needed in API routes or Server Components.
