#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Load local .env (optional) then website-audit-tool/.env (primary)
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyzerEnv = path.resolve(__dirname, '../website-audit-tool/.env');
if (fs.existsSync(analyzerEnv)) dotenv.config({ path: analyzerEnv, override: false });

import { buildProspectPrompt, buildDomainInferencePrompt } from './prompts.js';
import { completeJSON } from './llm.js';
import { findCompaniesWithGrok } from './grok-prospector.js';
import { analyzeWebsites } from '../website-audit-tool/analyzer.js';
import { upsertProspects, hasSupabase, markProspectStatus } from './supabase.js';

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
    model: 'gpt-4o-mini',
    saveSupabase: undefined,
    supabaseStatus: 'pending_analysis'
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
    else if (a === '--save-supabase') out.saveSupabase = true;
    else if (a === '--no-supabase') out.saveSupabase = false;
    else if (a === '--prospect-status') out.supabaseStatus = args[++i];
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

export function uniq(arr) {
  return Array.from(new Set(arr));
}

export async function verifyUrl(url) {
  try {
    const u = new URL(url);

    // Fetch the page and check if it's a real business website
    const getRes = await fetch(u.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10 second timeout
      redirect: 'follow'
    });

    if (!getRes.ok) {
      return false;
    }

    // Check if redirected to a parking page domain
    const finalUrl = getRes.url.toLowerCase();
    const parkingDomains = [
      'godaddy.com',
      'secureserver.net',
      'parklogic.com',
      'parkingcrew.net',
      'sedoparking.com',
      'bodis.com',
      'parkweb.co',
      'afternic.com',
      'dan.com',
      'namecheap.com/parking',
      'hugedomains.com',
      'buy.com',
      'domainmarket.com'
    ];

    // Check if final URL contains any parking domain
    if (parkingDomains.some(domain => finalUrl.includes(domain))) {
      console.log(`  ⚠️  ${url} → Parked domain detected (${finalUrl})`);
      return false;
    }

    // Get page content to check for parking page indicators
    const html = await getRes.text();
    const htmlLower = html.toLowerCase();

    // Common parking page text indicators
    const parkingIndicators = [
      'this domain may be for sale',
      'this domain is for sale',
      'buy this domain',
      'domain is parked',
      'parked free',
      'this page is parked',
      'coming soon',
      'under construction',
      'domain forwarding',
      'domain parking',
      'this domain has been registered',
      'renew this domain',
      'expired domain',
      'hugedomains.com',
      'sedo domain parking',
      'godaddy.com/domainsearch'
    ];

    // Check for multiple indicators (more than 2 = likely a parking page)
    const indicatorCount = parkingIndicators.filter(indicator =>
      htmlLower.includes(indicator)
    ).length;

    if (indicatorCount >= 2) {
      console.log(`  ⚠️  ${url} → Parking page detected (${indicatorCount} indicators)`);
      return false;
    }

    // Passed all checks
    return true;

  } catch (error) {
    return false;
  }
}

export function normalizeUrl(s) {
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

export async function runProspector(options) {
  const {
    briefPath,
    briefData,
    outPath = null,
    count = 20,
    city,
    model = 'gpt-4o-mini',
    verify = true,
    seeds = [],
    saveToFile = true,
    saveSupabase,
    supabaseStatus = 'pending_analysis',
    runId = randomUUID(),
    source = 'client-orchestrator',
    projectId = null,
    logger = console
  } = options;

  if (!briefPath && !briefData) {
    throw new Error('Brief data or --brief path required');
  }

  const brief = briefData || readJSON(briefPath);
  const seedUrls = [...seeds, ...(brief.seeds || [])].map(normalizeUrl).filter(Boolean);

  // Use Grok with web search for real companies, or GPT for fast generation
  let json;
  if (model === 'grok-4-fast' || model === 'grok-beta') {
    if (logger.info) {
      logger.info('Using Grok with web search to find real companies', { model, count, city: city || 'none' });
    } else {
      console.log('🔍 Using Grok with web search to find REAL companies...');
    }
    json = await findCompaniesWithGrok({ brief, count, city, logger });
  } else {
    if (logger.info) {
      logger.info(`Using ${model} to generate prospect list`, { count, city: city || 'none' });
    } else {
      console.log(`📋 Using ${model} to generate prospect list...`);
    }
    const prompt = buildProspectPrompt({ studio: brief.studio, icp: brief.icp, geo: brief.geo, count, cityHint: city });
    json = await completeJSON({ prompt, model });
  }

  let companies = Array.isArray(json?.companies) ? json.companies : [];
  const missing = companies.filter((c) => !c.website);
  if (missing.length > 0) {
    try {
      const inferPrompt = buildDomainInferencePrompt(companies);
      const inferred = await completeJSON({ prompt: inferPrompt, model });
      const byName = new Map((Array.isArray(inferred) ? inferred : []).map((x) => [x.name?.toLowerCase(), x.website]));
      companies = companies.map((c) => ({
        ...c,
        website: c.website || byName.get((c.name || '').toLowerCase()) || ''
      }));
    } catch (error) {
      console.warn('�?O Domain inference failed, continuing with provided websites.');
    }
  }

  let urls = companies.map((c) => normalizeUrl(c.website)).filter(Boolean);
  urls = uniq([...seedUrls, ...urls]);

  if (logger.debug) {
    logger.debug('Extracted URLs from companies', { count: urls.length, urls });
  } else {
    console.log(`📋 Extracted ${urls.length} URLs from companies:`, urls);
  }

  if (verify) {
    if (logger.info) {
      logger.info('Verifying URLs', { count: urls.length });
    } else {
      console.log('🔍 Verifying URLs...');
    }

    const results = [];
    const failed = [];

    for (const u of urls) {
      const ok = await verifyUrl(u);
      if (ok) {
        results.push(u);
      } else {
        failed.push(u);
      }

      if (logger.debug) {
        logger.debug(`URL verification: ${ok ? 'passed' : 'failed'}`, { url: u, verified: ok });
      } else {
        console.log(`  ${ok ? '✅' : '❌'} ${u}`);
      }
    }

    if (logger.info) {
      logger.info('URL verification completed', {
        total: urls.length,
        verified: results.length,
        failed: failed.length,
        failedUrls: failed
      });
    } else {
      console.log(`✅ Verified ${results.length} of ${urls.length} URLs`);
    }

    urls = results;
  }

  const prospectOut = {
    generatedAt: new Date().toISOString(),
    countRequested: count,
    countFound: urls.length,
    city: city || brief?.geo?.city || null,
    industries: json?.industries || [],
    companies,
    urls,
    runId
  };

  if (saveToFile && outPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(prospectOut, null, 2), 'utf8');
    console.log(`Saved prospects to ${outPath} (${urls.length} URLs)`);
  }

  const shouldSaveSupabase = saveSupabase !== undefined ? saveSupabase : hasSupabase();
  let supabaseRecords = [];
  if (shouldSaveSupabase) {
    try {
      const companyMap = new Map();
      for (const comp of companies) {
        const normalized = normalizeUrl(comp.website);
        if (normalized) {
          companyMap.set(normalized, { ...comp, website: normalized });
        }
      }

      const payload = urls.map((urlValue) => ({
        ...(companyMap.get(urlValue) || { name: null, industry: null, why_now: null, teaser: null }),
        website: urlValue
      }));

      supabaseRecords = await upsertProspects(payload, {
        runId,
        source,
        status: supabaseStatus,
        city: city || brief?.geo?.city || null,
        projectId,
        brief: {
          studio: brief.studio || null,
          icp: brief.icp || null,
          geo: brief.geo || null,
          notes: brief.notes || null
        }
      });
      if (supabaseRecords.length) {
        console.log(`�o. Synced ${supabaseRecords.length} prospects to Supabase`);
      }
    } catch (error) {
      console.error('�?O Failed to sync prospects to Supabase:', error.message);
    }
  }

  return { prospectOut, urls, companies, brief, runId, supabaseRecords };
}

async function runCli() {
  const args = parseArgs();
  const { prospectOut, urls, runId } = await runProspector({
    briefPath: args.briefPath,
    outPath: args.outPath,
    count: args.count,
    city: args.city,
    model: args.model,
    verify: args.verify,
    saveToFile: true,
    saveSupabase: args.saveSupabase,
    supabaseStatus: args.supabaseStatus,
    source: 'client-orchestrator-cli'
  });

  if (!args.run || urls.length === 0) {
    return;
  }

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
      dryRun: process.env.DRY_RUN === 'true',
      metadata: {
        runId,
        sourceApp: 'client-orchestrator-cli'
      }
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
      await markProspectStatus(chunk, 'analyzed');
    } catch (e) {
      console.error('Analyzer error:', e.message);
    }
  }

  console.log('All done. Results saved under website-audit-tool/analysis-results');
}

const isCliEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
