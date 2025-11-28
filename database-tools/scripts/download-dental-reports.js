#!/usr/bin/env node

/**
 * Download and organize Dental 11_7 project reports
 * Downloads all reports from database and organizes them by company name
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

const PROJECT_ID = 'b9c9f0f3-ee36-467a-996e-dd8e684475d0';
const OUTPUT_DIR = resolve(__dirname, '../../dental-11-7-reports');

async function downloadAndOrganizeReports() {
  console.log('\n🔍 Fetching Dental 11_7 reports...\n');

  // Get all leads for this project
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, company_name, website_grade')
    .eq('project_id', PROJECT_ID);

  if (leadsError) {
    console.error('❌ Error fetching leads:', leadsError.message);
    return;
  }

  console.log(`📊 Found ${leads.length} leads in project\n`);

  // Get all reports for these leads
  const leadIds = leads.map(l => l.id);
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, lead_id, company_name, format, storage_path, storage_bucket, website_grade, created_at')
    .in('lead_id', leadIds);

  if (reportsError) {
    console.error('❌ Error fetching reports:', reportsError.message);
    return;
  }

  console.log(`📄 Found ${reports.length} reports to download\n`);

  // Group reports by company
  const reportsByCompany = {};
  for (const report of reports) {
    if (!reportsByCompany[report.company_name]) {
      reportsByCompany[report.company_name] = [];
    }
    reportsByCompany[report.company_name].push(report);
  }

  console.log(`🏢 ${Object.keys(reportsByCompany).length} unique companies\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}\n`);
  }

  let successCount = 0;
  let errorCount = 0;

  // Process each company
  for (const [companyName, companyReports] of Object.entries(reportsByCompany)) {
    try {
      // Sanitize company name for folder/file names
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

      // Download each report for this company
      for (const report of companyReports) {
        if (!report.storage_path || !report.storage_bucket) {
          console.log(`  ⚠️  Skipping ${companyName} (${report.format}) - no storage path`);
          continue;
        }

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(report.storage_bucket)
          .download(report.storage_path);

        if (downloadError) {
          console.error(`  ❌ Error downloading ${report.format}: ${downloadError.message}`);
          errorCount++;
          continue;
        }

        // Save file
        const fileExt = report.format === 'pdf' ? 'pdf' : 'html';
        const fileName = `${safeName}-${report.format === 'pdf' ? 'FULL' : 'PREVIEW'}.${fileExt}`;
        const filePath = path.join(companyFolder, fileName);

        // Convert blob to buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
      }

      // Save metadata for all reports
      const metadataPath = path.join(companyFolder, `${safeName}-metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        company_name: companyName,
        reports: companyReports.map(r => ({
          report_id: r.id,
          lead_id: r.lead_id,
          format: r.format,
          grade: r.website_grade,
          created_at: r.created_at
        }))
      }, null, 2));

      successCount++;
      const formats = companyReports.map(r => r.format.toUpperCase()).join(' + ');
      console.log(`✅ [${successCount}/${Object.keys(reportsByCompany).length}] ${companyName} (${formats})`);

    } catch (error) {
      errorCount++;
      console.error(`❌ Failed: ${companyName} - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('DOWNLOAD SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Companies: ${Object.keys(reportsByCompany).length}`);
  console.log(`Total Report Files: ${reports.length}`);
  console.log(`Successfully Organized: ${successCount} companies`);
  if (errorCount > 0) {
    console.log(`Download Errors: ${errorCount}`);
  }
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(80) + '\n');
}

downloadAndOrganizeReports().catch(console.error);
