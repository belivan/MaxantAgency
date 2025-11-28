/**
 * Supabase Client for Prospecting Engine
 *
 * This is the main entry point for database operations.
 * The client is initialized here and operations are organized into modules:
 * - prospect-operations.js: Prospect CRUD operations
 * - project-config-operations.js: Project ICP brief and config operations
 * - query-history-operations.js: Query history tracking operations
 *
 * All functions are re-exported here for backward compatibility.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Load env from root .env (centralized credentials)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const rootEnv = path.join(projectRoot, '.env');

// Use root .env for Supabase credentials (override any existing env vars)
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv, override: true });
} else {
  dotenv.config();
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ═══════════════════════════════════════════════════════════════════════════
// Re-export all operations for backward compatibility
// ═══════════════════════════════════════════════════════════════════════════

// Prospect Operations
export {
  saveProspect,
  updateProspect,
  getProspects,
  getProspectById,
  prospectExists,
  prospectExistsInProject,
  linkProspectToProject,
  saveOrLinkProspect,
  getProspectsByProject,
  deleteProspect,
  deleteProspects,
  getProspectStats
} from './prospect-operations.js';

// Project Config Operations
export {
  getProjectIcpBrief,
  saveProjectIcpBrief,
  saveProjectProspectingPrompts,
  saveProjectModelSelections,
  saveProjectIcpAndPrompts,
  saveProspectingConfig
} from './project-config-operations.js';

// Query History Operations
export {
  saveQueryHistory,
  getPreviousQueries,
  queryExists,
  getQueryStats
} from './query-history-operations.js';

export default supabase;
