#!/usr/bin/env node

/**
 * Organize All Reports by Project
 *
 * Moves reports from root directory into organized project folders:
 * - Pittsburgh-Dental-11-24/
 * - Dental-11-7/
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

const PITTSBURGH_PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';
const DENTAL_11_7_PROJECT_ID = 'b9c9f0f3-ee36-467a-996e-dd8e684475d0';
const REPORTS_DIR = resolve(__dirname, '../../local-backups/report-engine/reports');

const projects = [
  { id: PITTSBURGH_PROJECT_ID, name: 'Pittsburgh-Dental-11-24' },
  { id: DENTAL_11_7_PROJECT_ID, name: 'Dental-11-7' }
];

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

function sanitizeName(name) {
  return name
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function organizeProject(projectId, projectName) {
  log(`\n${'='.repeat(70)}`, 'bright');
  log(`Organizing: ${projectName}`, 'bright');
  log('='.repeat(70) + '\n', 'bright');

  const OUTPUT_DIR = path.join(REPORTS_DIR, projectName);

  // Get all leads for this project
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('project_id', projectId)
    .order('website_grade', { ascending: true });

  if (!leads || leads.length === 0) {
    log('No leads found', 'red');
    return { processed: 0, moved: 0 };
  }

  log(`Found ${leads.length} leads\n`, 'green');

  // Get all report files in the root directory
  const files = fs.readdirSync(REPORTS_DIR);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let processed = 0;
  let movedCount = 0;
  const companiesProcessed = new Set();

  for (const lead of leads) {
    const safeName = sanitizeName(lead.company_name);

    // Find files for this company
    const companyFiles = files.filter(f =>
      (f.endsWith('.html') || f.endsWith('.pdf')) &&
      !f.startsWith('.') &&
      f.startsWith(safeName)
    );

    if (companyFiles.length === 0) continue;

    processed++;

    // Create company folder
    const companyFolder = path.join(OUTPUT_DIR, safeName);
    if (!fs.existsSync(companyFolder)) {
      fs.mkdirSync(companyFolder, { recursive: true });
    }

    // Move files
    for (const file of companyFiles) {
      const sourcePath = path.join(REPORTS_DIR, file);
      const destPath = path.join(companyFolder, file);

      // Only move if it's actually a file in root directory
      if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
        fs.renameSync(sourcePath, destPath);
        movedCount++;
      }
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
    log(`✅ [${processed}/${leads.length}] ${lead.company_name} - ${companyFiles.length} files`, 'blue');
  }

  // Generate project summary
  const gradeDistribution = leads.reduce((acc, lead) => {
    const grade = lead.website_grade || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  const avgDesignScore = Math.round(leads.reduce((sum, l) => sum + (l.design_score || 0), 0) / leads.length);
  const avgSeoScore = Math.round(leads.reduce((sum, l) => sum + (l.seo_score || 0), 0) / leads.length);

  const leadsWithEmails = leads.filter(l => l.contact_email).length;

  const summary = {
    project: {
      id: projectId,
      name: projectName,
      generated_at: new Date().toISOString()
    },
    stats: {
      total_leads: leads.length,
      leads_with_emails: leadsWithEmails,
      avg_design_score: avgDesignScore,
      avg_seo_score: avgSeoScore
    },
    grade_distribution: gradeDistribution,
    top_performers: leads
      .filter(l => l.website_grade === 'A' || l.website_grade === 'B')
      .map(l => ({
        company_name: l.company_name,
        website: l.website,
        grade: l.website_grade,
        design_score: l.design_score,
        seo_score: l.seo_score,
        contact_email: l.contact_email
      })),
    needs_improvement: leads
      .filter(l => l.website_grade === 'C' || l.website_grade === 'D' || l.website_grade === 'F')
      .slice(0, 10)
      .map(l => ({
        company_name: l.company_name,
        website: l.website,
        grade: l.website_grade,
        design_score: l.design_score,
        seo_score: l.seo_score,
        top_issue: l.top_issue,
        contact_email: l.contact_email
      }))
  };

  const summaryPath = path.join(OUTPUT_DIR, 'PROJECT-SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  log('', 'reset');
  log('✅ Project summary created', 'green');

  return { processed, moved: movedCount, companies: companiesProcessed.size };
}

async function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('Organize All Reports by Project', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  const results = {};

  for (const project of projects) {
    results[project.name] = await organizeProject(project.id, project.name);
  }

  // Summary
  log('\n' + '='.repeat(70), 'bright');
  log('ORGANIZATION COMPLETE', 'bright');
  log('='.repeat(70), 'bright');

  for (const [projectName, result] of Object.entries(results)) {
    log(`\n${projectName}:`, 'cyan');
    log(`  Companies: ${result.companies}`, 'blue');
    log(`  Leads Processed: ${result.processed}`, 'blue');
    log(`  Files Moved: ${result.moved}`, 'green');
  }

  const totalMoved = Object.values(results).reduce((sum, r) => sum + r.moved, 0);
  const totalCompanies = Object.values(results).reduce((sum, r) => sum + r.companies, 0);

  log('\nTotal:', 'cyan');
  log(`  Companies Organized: ${totalCompanies}`, 'green');
  log(`  Files Moved: ${totalMoved}`, 'green');
  log(`  Output Directory: ${REPORTS_DIR}`, 'blue');

  log('\n' + '='.repeat(70), 'bright');
  log('', 'reset');
}

main().catch(console.error);
