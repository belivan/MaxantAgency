import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { ensureSharedEnv } from '@/lib/server-utils';

let orchestratorModulePromise: Promise<any> | null = null;
let supabaseModulePromise: Promise<any> | null = null;
let analyzerModulePromise: Promise<any> | null = null;

function getRepoRoot() {
  return path.resolve(process.cwd(), '..');
}

function importFromRepo(relativePath: string) {
  const absolute = path.resolve(getRepoRoot(), relativePath);
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_COMMAND_CENTER === 'true') {
    console.log('[orchestrator] importing', absolute);
  }
  return import(pathToFileURL(absolute).href);
}

async function getOrchestratorModule() {
  if (!orchestratorModulePromise) {
    orchestratorModulePromise = importFromRepo('client-orchestrator/index.js');
  }
  return orchestratorModulePromise;
}

async function getSupabaseModule() {
  if (!supabaseModulePromise) {
    supabaseModulePromise = importFromRepo('client-orchestrator/supabase.js');
  }
  return supabaseModulePromise;
}

async function getAnalyzerModule() {
  if (!analyzerModulePromise) {
    analyzerModulePromise = importFromRepo('website-audit-tool/analyzer.js');
  }
  return analyzerModulePromise;
}

export async function runProspectorBridge(options: any) {
  ensureSharedEnv();
  const { runProspector } = await getOrchestratorModule();
  return runProspector(options);
}

export async function markProspectStatusBridge(urls: string[], status: string) {
  ensureSharedEnv();
  const { markProspectStatus } = await getSupabaseModule();
  if (typeof markProspectStatus === 'function') {
    await markProspectStatus(urls, status);
  }
}

export async function analyzeWebsitesBridge(urls: string[], options: any, onProgress?: (payload: any) => void) {
  ensureSharedEnv();
  const { analyzeWebsites } = await getAnalyzerModule();
  return analyzeWebsites(urls, options, onProgress || (() => {}));
}

export async function getDefaultBrief() {
  ensureSharedEnv();
  try {
    const briefPath = path.resolve(getRepoRoot(), 'client-orchestrator/brief.json');
    const contents = await fs.readFile(briefPath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    return null;
  }
}
