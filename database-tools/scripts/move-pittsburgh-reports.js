#!/usr/bin/env node

/**
 * Move existing Pittsburgh reports into organized folder structure
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';
const PROJECT_NAME = 'Pittsburgh-Dental-11-24';
const REPORTS_DIR = resolve(__dirname, '../../local-backups/report-engine/reports');
const OUTPUT_DIR = path.join(REPORTS_DIR, PROJECT_NAME);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('Move Pittsburgh Reports into Organized Structure', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Get all leads to map file names to companies
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('project_id', PROJECT_ID);

  if (!leads || leads.length === 0) {
    log('No leads found', 'red');
    return;
  }

  // Get all report files in the root directory
  const files = fs.readdirSync(REPORTS_DIR);
  const pittsburghFiles = files.filter(f =>
    (f.endsWith('.html') || f.endsWith('.pdf')) &&
    !f.startsWith('.') &&
    // Match Pittsburgh company names
    leads.some(lead => {
      const safeName = lead.company_name
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      return f.startsWith(safeName);
    })
  );

  log(`Found ${pittsburghFiles.length} Pittsburgh report files to organize\n`, 'green');

  if (pittsburghFiles.length === 0) {
    log('No Pittsburgh files found in root directory', 'yellow');
    return;
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let movedCount = 0;
  const companiesProcessed = new Set();

  for (const lead of leads) {
    const safeName = lead.company_name
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    // Find files for this company
    const companyFiles = pittsburghFiles.filter(f => f.startsWith(safeName));

    if (companyFiles.length === 0) continue;

    // Create company folder
    const companyFolder = path.join(OUTPUT_DIR, safeName);
    if (!fs.existsSync(companyFolder)) {
      fs.mkdirSync(companyFolder, { recursive: true });
    }

    // Move files
    for (const file of companyFiles) {
      const sourcePath = path.join(REPORTS_DIR, file);
      const destPath = path.join(companyFolder, file);

      fs.renameSync(sourcePath, destPath);
      movedCount++;
    }

    // Create metadata
    const metadataPath = path.join(companyFolder, `${safeName}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      company_name: lead.company_name,
      website: lead.website,
      website_grade: lead.website_grade,
      design_score: lead.design_score,
      seo_score: lead.seo_score,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      files_moved: companyFiles
    }, null, 2));

    companiesProcessed.add(lead.company_name);
    log(`✅ Moved ${companyFiles.length} files for: ${lead.company_name}`, 'blue');
  }

  log('', 'reset');
  log('='.repeat(70), 'bright');
  log('ORGANIZATION COMPLETE', 'bright');
  log('='.repeat(70), 'bright');
  log(`Companies Organized: ${companiesProcessed.size}`, 'green');
  log(`Files Moved: ${movedCount}`, 'green');
  log(`Output Directory: ${OUTPUT_DIR}`, 'cyan');
  log('='.repeat(70), 'bright');
  log('', 'reset');
}

main().catch(console.error);
