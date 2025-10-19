#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load local .env (optional) then website-audit-tool/.env (primary)
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyzerEnv = path.resolve(__dirname, '../website-audit-tool/.env');
if (fs.existsSync(analyzerEnv)) dotenv.config({ path: analyzerEnv, override: false });

import { buildProspectPrompt, buildDomainInferencePrompt } from './prompts.js';
import { completeJSON } from './llm.js';
import { analyzeWebsites } from '../website-audit-tool/analyzer.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    briefPath: null,
    outPath: 'prospects.json',
    count: 20,
    city: undefined,
    verify: true,
    run: false,
    tier: 'tier1',
    emailType: 'local',
    batch: 10,
    model: 'gpt-4o-mini'
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--brief') out.briefPath = args[++i];
    else if (a === '--out') out.outPath = args[++i];
    else if (a === '--count') out.count = parseInt(args[++i], 10);
    else if (a === '--city') out.city = args[++i];
    else if (a === '--verify') out.verify = true;
    else if (a === '--no-verify') out.verify = false;
    else if (a === '--run') out.run = true;
    else if (a === '--tier') out.tier = args[++i];
    else if (a === '--email-type') out.emailType = args[++i];
    else if (a === '--batch') out.batch = Math.min(10, parseInt(args[++i], 10) || 10);
    else if (a === '--model') out.model = args[++i];
  }
  if (!out.briefPath) {
    console.error('Missing --brief <path>');
    process.exit(1);
  }
  return out;
}

function readJSON(p) {
  const full = path.resolve(process.cwd(), p);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function verifyUrl(url) {
  try {
    const u = new URL(url);
    const res = await fetch(u.toString(), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeUrl(s) {
  if (!s) return '';
  let v = s.trim();
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    return '';
  }
}

async function main() {
  const args = parseArgs();
  const brief = readJSON(args.briefPath);

  // Seeds
  const seedUrls = (brief.seeds || []).map(normalizeUrl).filter(Boolean);

  // Build prospect prompt from brief
  const prompt = buildProspectPrompt({ studio: brief.studio, icp: brief.icp, geo: brief.geo, count: args.count, cityHint: args.city });
  const json = await completeJSON({ prompt, model: args.model });

  let companies = Array.isArray(json?.companies) ? json.companies : [];
  // If many lack websites, attempt domain inference
  const missing = companies.filter(c => !c.website);
  if (missing.length > 0) {
    try {
      const inferPrompt = buildDomainInferencePrompt(companies);
      const inferred = await completeJSON({ prompt: inferPrompt, model: args.model });
      const byName = new Map((inferred || []).map(x => [x.name?.toLowerCase(), x.website]));
      companies = companies.map(c => ({
        ...c,
        website: c.website || byName.get((c.name || '').toLowerCase()) || ''
      }));
    } catch {}
  }

  // Normalize & verify URLs
  let urls = companies.map(c => normalizeUrl(c.website)).filter(Boolean);
  urls = uniq([...seedUrls, ...urls]);

  if (args.verify) {
    const results = [];
    for (const u of urls) {
      const ok = await verifyUrl(u);
      if (ok) results.push(u);
    }
    urls = results;
  }

  // Save prospects file
  const prospectOut = {
    generatedAt: new Date().toISOString(),
    countRequested: args.count,
    countFound: urls.length,
    city: args.city || brief?.geo?.city || null,
    industries: json?.industries || [],
    companies,
    urls
  };
  fs.writeFileSync(path.resolve(process.cwd(), args.outPath), JSON.stringify(prospectOut, null, 2), 'utf8');
  console.log(`Saved prospects to ${args.outPath} (${urls.length} URLs)`);

  if (!args.run) return;

  // Run analyzer in batches
  const batchSize = Math.min(10, Math.max(1, args.batch || 10));
  for (let i = 0; i < urls.length; i += batchSize) {
    const chunk = urls.slice(i, i + batchSize);
    console.log(`Analyzing batch ${i / batchSize + 1} of ${Math.ceil(urls.length / batchSize)} (${chunk.length} sites)`);
    const options = {
      textModel: process.env.TEXT_MODEL || 'gpt-5-mini',
      visionModel: process.env.VISION_MODEL || 'gpt-4o',
      depthTier: args.tier,
      modules: { basic: true, seo: true },
      emailType: args.emailType,
      saveToDrafts: process.env.SAVE_TO_DRAFTS === 'true',
      dryRun: process.env.DRY_RUN === 'true'
    };

    const progress = (p) => {
      if (p?.type === 'progress') {
        process.stdout.write(`.`);
      } else if (p?.type === 'complete') {
        console.log(`\nBatch complete: ${p.count} results`);
      } else if (p?.type === 'error') {
        console.error(`\nBatch error: ${p.error}`);
      }
    };

    try {
      await analyzeWebsites(chunk, options, progress);
    } catch (e) {
      console.error('Analyzer error:', e.message);
    }
  }

  console.log('All done. Results saved under website-audit-tool/analysis-results');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

