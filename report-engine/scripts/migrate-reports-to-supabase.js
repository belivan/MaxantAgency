/**
 * Migration Script: Upload Existing PDF Reports to Supabase Storage
 *
 * This script scans local-backups/report-engine/reports/ for FULL.pdf files,
 * uploads them to Supabase Storage, and updates the reports table with storage URLs.
 *
 * Usage:
 *   node scripts/migrate-reports-to-supabase.js [--dry-run]
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  console.error('   Make sure .env file exists in report-engine/ directory');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const REPORTS_DIR = join(__dirname, '..', '..', 'local-backups', 'report-engine', 'reports');
const STORAGE_BUCKET = 'reports';
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Recursively find all FULL.pdf files in the reports directory
 */
async function findFullPdfFiles(dir) {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findFullPdfFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('-FULL.pdf')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

/**
 * Extract company name from PDF filename
 * e.g., "burnside-dental-care-p-c--FULL.pdf" -> "burnside-dental-care-p-c-"
 */
function extractCompanySlug(filename) {
  return basename(filename, '-FULL.pdf');
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadPdfToSupabase(pdfPath, companySlug) {
  const pdfBuffer = await readFile(pdfPath);
  const storagePath = `${companySlug}/FULL.pdf`;

  console.log(`📤 Uploading: ${storagePath} (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  if (DRY_RUN) {
    console.log('   [DRY RUN] Skipping actual upload');
    return { success: true, path: storagePath, dryRun: true };
  }

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { success: true, path: storagePath };
}

/**
 * Find matching report record in database by company name
 */
async function findReportByCompanyName(companySlug) {
  // Convert slug back to likely company name variations
  const searchTerms = [
    companySlug,
    companySlug.replace(/-/g, ' '),
    companySlug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim(),
  ];

  // Try to find report with matching company name
  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('reports')
      .select('id, company_name, website_url, storage_path')
      .ilike('company_name', `%${term}%`)
      .limit(1)
      .single();

    if (data && !error) {
      return data;
    }
  }

  return null;
}

/**
 * Update report record with new storage path
 */
async function updateReportStoragePath(reportId, storagePath) {
  console.log(`   💾 Updating report ${reportId} with storage path: ${storagePath}`);

  if (DRY_RUN) {
    console.log('   [DRY RUN] Skipping database update');
    return { success: true, dryRun: true };
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      storage_path: storagePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }

  return { success: true, data };
}

/**
 * Main migration function
 */
async function migrateReports() {
  console.log('🚀 Starting PDF migration to Supabase Storage...');
  console.log(`📁 Scanning directory: ${REPORTS_DIR}`);

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No actual uploads or database updates will be performed\n');
  }

  // Find all FULL.pdf files
  const pdfFiles = await findFullPdfFiles(REPORTS_DIR);

  if (pdfFiles.length === 0) {
    console.log('❌ No FULL.pdf files found in', REPORTS_DIR);
    return;
  }

  console.log(`✅ Found ${pdfFiles.length} PDF files to migrate\n`);

  // Track results
  const results = {
    total: pdfFiles.length,
    uploaded: 0,
    dbUpdated: 0,
    dbNotFound: 0,
    errors: [],
  };

  // Process each PDF
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const filename = basename(pdfPath);
    const companySlug = extractCompanySlug(filename);

    console.log(`\n[${i + 1}/${pdfFiles.length}] Processing: ${filename}`);

    try {
      // Step 1: Upload to Supabase Storage
      const uploadResult = await uploadPdfToSupabase(pdfPath, companySlug);

      if (uploadResult.success) {
        results.uploaded++;
        console.log('   ✅ Upload successful');

        // Step 2: Find matching report in database
        const reportRecord = await findReportByCompanyName(companySlug);

        if (reportRecord) {
          console.log(`   🔍 Found report: ${reportRecord.company_name} (${reportRecord.id})`);

          // Step 3: Update database with storage path
          const updateResult = await updateReportStoragePath(reportRecord.id, uploadResult.path);

          if (updateResult.success) {
            results.dbUpdated++;
            console.log('   ✅ Database updated');
          }
        } else {
          results.dbNotFound++;
          console.log(`   ⚠️  No matching report found in database for: ${companySlug}`);
          console.log('   📝 Note: PDF uploaded to Storage but database record not updated');
        }
      }

    } catch (error) {
      results.errors.push({ file: filename, error: error.message });
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total PDFs found:              ${results.total}`);
  console.log(`✅ Successfully uploaded:       ${results.uploaded}`);
  console.log(`✅ Database records updated:    ${results.dbUpdated}`);
  console.log(`⚠️  DB records not found:       ${results.dbNotFound}`);
  console.log(`❌ Errors:                      ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    console.log('   Run without --dry-run to perform actual migration');
  }

  console.log('\n✨ Migration complete!');
}

// Run migration
migrateReports().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
