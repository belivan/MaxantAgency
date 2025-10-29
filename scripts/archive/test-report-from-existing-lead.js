/**
 * Generate Reports from Existing Lead
 * Tests HTML + PDF generation using an already-analyzed lead
 */

import { autoGenerateReport } from './analysis-engine/reports/auto-report-generator.js';
import { supabase } from './analysis-engine/database/supabase-client.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const LEAD_ID = '10c04c8d-5da3-472c-b6df-d77ba65299c7'; // Elmwood Dental - Production Test
const COMPANY_SLUG = 'elmwood-dental-production-test';

async function testReportGeneration() {
  console.log('🧪 Testing Report Generation from Existing Lead\n');
  console.log('Lead ID:', LEAD_ID);
  console.log('\n⏳ Fetching lead data from database...\n');

  // Fetch lead from database
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', LEAD_ID)
    .single();

  if (error || !lead) {
    throw new Error(`Lead not found: ${error?.message || 'Unknown error'}`);
  }

  console.log('✅ Lead found:', lead.company_name);
  console.log('\n⏳ Generating reports (HTML + PDF)...\n');

  const startTime = Date.now();

  try {
    // Generate reports using the production function
    const result = await autoGenerateReport(lead, {
      format: 'html',
      saveToDatabase: false
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n✅ Reports Generated!\n');
    console.log('Duration:', duration, 'seconds');
    console.log('Result:', result);

    // Check for all 4 expected files
    console.log('\n📂 Checking Generated Files...\n');

    const reportsDir = 'local-backups/analysis-engine/reports';
    const files = await readdir(reportsDir);

    const matchingFiles = files.filter(f => f.includes(COMPANY_SLUG));

    const expectedPatterns = [
      '-PREVIEW.html',
      '-FULL.html',
      '-PREVIEW.pdf',
      '-FULL.pdf'
    ];

    const results = [];
    for (const pattern of expectedPatterns) {
      const file = matchingFiles.find(f => f.endsWith(pattern));
      if (file) {
        const filePath = join(reportsDir, file);
        const stats = await stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(0);
        results.push({ pattern, file, exists: true, sizeKB, path: filePath });
        console.log(`  ✅ ${file} (${sizeKB} KB)`);
      } else {
        results.push({ pattern, exists: false });
        console.log(`  ❌ *${pattern} - NOT FOUND`);
      }
    }

    const allPresent = results.every(r => r.exists);

    if (allPresent) {
      console.log('\n🎉 SUCCESS! All 4 files generated!\n');
      console.log('📄 Opening full HTML report...');

      const fullHtmlResult = results.find(r => r.pattern === '-FULL.html');
      if (fullHtmlResult) {
        const { exec } = await import('child_process');
        exec(`start ${fullHtmlResult.path}`);
        console.log('✅ Report opened in browser');
      }

      console.log('\n📊 Generated Files:');
      results.forEach(r => {
        if (r.exists) console.log(`   ${r.path}`);
      });

    } else {
      console.log('\n⚠️  Some files are missing!');
      console.log('\nExpected but not found:');
      results.filter(r => !r.exists).forEach(r => {
        console.log(`   ❌ *${r.pattern}`);
      });
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testReportGeneration();
