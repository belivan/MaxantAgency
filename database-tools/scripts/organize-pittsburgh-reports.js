#!/usr/bin/env node

/**
 * Organize Pittsburgh Dental 11_24 Reports
 * Creates organized folder structure and project summary report
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
const OUTPUT_DIR = resolve(__dirname, '../../local-backups/report-engine/reports', PROJECT_NAME);

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
  log('Pittsburgh Dental 11_24 - Report Organization', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', PROJECT_ID)
    .single();

  // Get all leads
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('website_grade', { ascending: true });

  if (!leads || leads.length === 0) {
    log('No leads found for project', 'red');
    return;
  }

  log(`Found ${leads.length} leads\n`, 'green');

  // Get all reports
  const leadIds = leads.map(l => l.id);
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .in('lead_id', leadIds);

  if (!reports || reports.length === 0) {
    log('No reports found', 'red');
    return;
  }

  log(`Found ${reports.length} reports\n`, 'green');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Download and organize reports by company
  const reportsByCompany = {};
  for (const report of reports) {
    if (!reportsByCompany[report.company_name]) {
      reportsByCompany[report.company_name] = [];
    }
    reportsByCompany[report.company_name].push(report);
  }

  log('Downloading and organizing reports...\n', 'cyan');

  let successCount = 0;
  let errorCount = 0;

  for (const [companyName, companyReports] of Object.entries(reportsByCompany)) {
    try {
      // Sanitize company name for folder
      const safeName = companyName
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

      // Create company folder
      const companyFolder = path.join(OUTPUT_DIR, safeName);
      if (!fs.existsSync(companyFolder)) {
        fs.mkdirSync(companyFolder, { recursive: true });
      }

      // Download each report
      for (const report of companyReports) {
        if (!report.storage_path || !report.storage_bucket) continue;

        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(report.storage_bucket)
          .download(report.storage_path);

        if (downloadError) {
          errorCount++;
          continue;
        }

        const fileExt = report.format === 'pdf' ? 'pdf' : 'html';
        const fileName = `${safeName}-${report.format === 'pdf' ? 'FULL' : 'PREVIEW'}.${fileExt}`;
        const filePath = path.join(companyFolder, fileName);

        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
      }

      // Save metadata
      const lead = leads.find(l => l.company_name === companyName);
      const metadataPath = path.join(companyFolder, `${safeName}-metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        company_name: companyName,
        website: lead?.website,
        website_grade: lead?.website_grade,
        design_score: lead?.design_score,
        seo_score: lead?.seo_score,
        contact_email: lead?.contact_email,
        contact_phone: lead?.contact_phone,
        reports: companyReports.map(r => ({
          report_id: r.id,
          format: r.format,
          grade: r.website_grade,
          created_at: r.created_at
        }))
      }, null, 2));

      successCount++;
      const formats = companyReports.map(r => r.format.toUpperCase()).join(' + ');
      log(`✅ [${successCount}/${Object.keys(reportsByCompany).length}] ${companyName} (${formats})`, 'blue');

    } catch (error) {
      errorCount++;
      log(`❌ Failed: ${companyName} - ${error.message}`, 'red');
    }
  }

  log('', 'reset');

  // Generate project summary
  log('Generating project summary...\n', 'cyan');

  const gradeDistribution = leads.reduce((acc, lead) => {
    const grade = lead.website_grade || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  const avgDesignScore = Math.round(leads.reduce((sum, l) => sum + (l.design_score || 0), 0) / leads.length);
  const avgSeoScore = Math.round(leads.reduce((sum, l) => sum + (l.seo_score || 0), 0) / leads.length);

  const summary = {
    project: {
      id: PROJECT_ID,
      name: project?.name || 'Pittsburgh Dental 11_24',
      created_at: project?.created_at,
      icp_brief: project?.icp_brief
    },
    stats: {
      total_prospects: 60,
      prospects_with_emails: 22,
      total_leads: leads.length,
      total_reports: reports.length,
      avg_design_score: avgDesignScore,
      avg_seo_score: avgSeoScore
    },
    grade_distribution: gradeDistribution,
    top_performers: leads
      .filter(l => l.website_grade === 'B')
      .map(l => ({
        company_name: l.company_name,
        website: l.website,
        grade: l.website_grade,
        design_score: l.design_score,
        seo_score: l.seo_score
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
        top_issue: l.top_issue
      })),
    generated_at: new Date().toISOString()
  };

  const summaryPath = path.join(OUTPUT_DIR, 'PROJECT-SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  log('✅ Project summary created\n', 'green');

  // Print summary
  log('='.repeat(70), 'bright');
  log('PROJECT SUMMARY', 'bright');
  log('='.repeat(70), 'bright');
  log(`Project: ${summary.project.name}`, 'cyan');
  log(`Total Prospects: ${summary.stats.total_prospects}`, 'cyan');
  log(`Prospects with Emails: ${summary.stats.prospects_with_emails}`, 'cyan');
  log(`Total Leads Analyzed: ${summary.stats.total_leads}`, 'cyan');
  log(`Total Reports Generated: ${summary.stats.total_reports}`, 'cyan');
  log(`Average Design Score: ${summary.stats.avg_design_score}`, 'cyan');
  log(`Average SEO Score: ${summary.stats.avg_seo_score}`, 'cyan');
  log('', 'reset');
  log('Grade Distribution:', 'yellow');
  Object.entries(gradeDistribution).forEach(([grade, count]) => {
    const percentage = Math.round((count / leads.length) * 100);
    log(`  ${grade}: ${count} (${percentage}%)`, 'blue');
  });
  log('', 'reset');
  log(`Companies Organized: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`Errors: ${errorCount}`, 'red');
  }
  log(`Output Directory: ${OUTPUT_DIR}`, 'green');
  log('='.repeat(70), 'bright');
  log('', 'reset');
}

main().catch(console.error);
