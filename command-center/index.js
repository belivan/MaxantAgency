#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Load env from root, then downstream apps so we reuse shared secrets
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envPaths = [
  path.join(rootDir, '.env'),
  path.join(rootDir, 'website-audit-tool/.env'),
  path.join(rootDir, 'client-orchestrator/.env'),
  path.join(rootDir, 'email-composer/.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

import { runProspector, normalizeUrl } from '../client-orchestrator/index.js';
import { analyzeWebsites } from '../website-audit-tool/analyzer.js';
import { requireSupabase, getAnalyzedUrlSet, getPendingProspects, flagProspects } from './supabase.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const defaults = {
    brief: path.join('client-orchestrator', 'brief.json'),
    prospectFile: null,
    count: 20,
    city: undefined,
    model: 'gpt-4o-mini',
    verify: true,
    skipProspects: false,
    skipAnalysis: false,
    reanalyze: false,
    tier: 'tier1',
    modules: 'basic,seo',
    batch: 5,
    limit: 0,
    emailType: 'local',
    prospectStatus: 'pending_analysis'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--brief':
        defaults.brief = args[++i];
        break;
      case '--count':
        defaults.count = parseInt(args[++i], 10);
        break;
      case '--city':
        defaults.city = args[++i];
        break;
      case '--model':
        defaults.model = args[++i];
        break;
      case '--no-verify':
        defaults.verify = false;
        break;
      case '--skip-prospects':
        defaults.skipProspects = true;
        break;
      case '--skip-analysis':
        defaults.skipAnalysis = true;
        break;
      case '--reanalyze':
        defaults.reanalyze = true;
        break;
      case '--tier':
        defaults.tier = args[++i];
        break;
      case '--modules':
        defaults.modules = args[++i];
        break;
      case '--batch':
        defaults.batch = Math.max(1, Math.min(10, parseInt(args[++i], 10) || 5));
        break;
      case '--limit':
        defaults.limit = parseInt(args[++i], 10) || 0;
        break;
      case '--email-type':
        defaults.emailType = args[++i];
        break;
      case '--prospect-file':
        defaults.prospectFile = args[++i];
        break;
      case '--prospect-status':
        defaults.prospectStatus = args[++i];
        break;
      case '--campaign':
        defaults.campaign = args[++i];
        break;
      case '--project':
        defaults.project = args[++i];
        break;
      case '--client':
        defaults.client = args[++i];
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }

  return defaults;
}

function buildModules(moduleString) {
  const modules = { basic: true };
  if (!moduleString) return modules;
  const set = new Set(moduleString.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean));
  if (set.has('seo')) modules.seo = true;
  if (set.has('visual')) modules.visual = true;
  if (set.has('industry')) modules.industry = true;
  if (set.has('competitor')) modules.competitor = true;
  if (set.has('crawler')) modules.crawler = true;
  return modules;
}

async function main() {
  const args = parseArgs();
  requireSupabase();

  const runId = randomUUID();
  console.log(`�" Run ID: ${runId}`);

  let candidateUrls = [];

  if (!args.skipProspects) {
    const prospectOptions = {
      briefPath: path.resolve(rootDir, args.brief),
      outPath: args.prospectFile ? path.resolve(rootDir, args.prospectFile) : null,
      count: args.count,
      city: args.city,
      model: args.model,
      verify: args.verify,
      saveToFile: Boolean(args.prospectFile),
      saveSupabase: true,
      supabaseStatus: args.prospectStatus,
      runId,
      source: 'command-center'
    };

    const { urls, prospectOut } = await runProspector(prospectOptions);
    candidateUrls = urls;
    console.log(`�o. Prospector generated ${prospectOut.countFound} verified URLs`);
  } else {
    const pending = await getPendingProspects(args.limit || 50);
    candidateUrls = pending.map((p) => normalizeUrl(p.website));
    console.log(`�o. Loaded ${candidateUrls.length} URLs from existing Supabase prospects`);
  }

  candidateUrls = candidateUrls.filter(Boolean);

  if (args.limit && args.limit > 0) {
    candidateUrls = candidateUrls.slice(0, args.limit);
  }

  if (candidateUrls.length === 0) {
    console.log('No URLs to analyze. Exiting.');
    return;
  }

  let urlsToAnalyze = candidateUrls;
  if (!args.reanalyze) {
    const analyzedSet = await getAnalyzedUrlSet(candidateUrls);
    urlsToAnalyze = candidateUrls.filter((u) => !analyzedSet.has(u.toLowerCase()));
    console.log(`�o. ${urlsToAnalyze.length} URLs remain after skipping already analyzed leads`);
  }

  if (urlsToAnalyze.length === 0 || args.skipAnalysis) {
    console.log('Analysis step skipped.');
    return;
  }

  await flagProspects(urlsToAnalyze, 'queued');

  const modules = buildModules(args.modules);
  const metadata = {
    runId,
    sourceApp: 'command-center',
    campaignId: args.campaign || null,
    projectId: args.project || null,
    clientName: args.client || null
  };

  const batchSize = Math.min(10, Math.max(1, args.batch));
  for (let i = 0; i < urlsToAnalyze.length; i += batchSize) {
    const chunk = urlsToAnalyze.slice(i, i + batchSize);
    console.log(`dY'? Analyzing batch ${i / batchSize + 1}/${Math.ceil(urlsToAnalyze.length / batchSize)} (${chunk.length} sites)`);

    const options = {
      textModel: process.env.DEFAULT_TEXT_MODEL || 'gpt-5-mini',
      visionModel: process.env.DEFAULT_VISION_MODEL || 'gpt-4o',
      depthTier: args.tier,
      modules,
      emailType: args.emailType,
      metadata
    };

    const progress = (payload) => {
      if (!payload) return;
      if (payload.type === 'site_start') {
        console.log(`  → ${payload.url}`);
      } else if (payload.type === 'complete') {
        console.log(`  ✓ Batch complete (${payload.count} results)`);
      } else if (payload.type === 'error') {
        console.error(`  ✕ Batch error: ${payload.error}`);
      }
    };

    try {
      await analyzeWebsites(chunk, options, progress);
      await flagProspects(chunk, 'analyzed');
    } catch (error) {
      console.error('�?O Analyzer failure:', error.message);
    }
  }

  console.log('✅ Command center run complete. Leads saved to Supabase.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
