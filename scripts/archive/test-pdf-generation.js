/**
 * Test PDF Generation with Production API
 * Analyzes a website and verifies 4 files are generated (2 HTML + 2 PDF)
 */

const API_URL = 'http://localhost:3001/api/analyze-url';
const TEST_URL = 'https://elmwooddental.com';
const COMPANY_NAME = 'Elmwood Dental - PDF Test';

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation with Production Analysis\n');
  console.log('📍 Test URL:', TEST_URL);
  console.log('🏢 Company:', COMPANY_NAME);
  console.log('\n⏳ Running analysis (2-3 minutes)...\n');

  const startTime = Date.now();

  try {
    // Get project ID
    const { supabase } = await import('./analysis-engine/database/supabase-client.js');
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    const projectId = projects?.[0]?.id;
    if (!projectId) {
      throw new Error('No project found. Create a project first.');
    }

    // Run analysis
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: TEST_URL,
        company_name: COMPANY_NAME,
        project_id: projectId,
        generateReport: true,
        reportType: 'full'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Analysis failed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n✅ Analysis Complete!\n');
    console.log('📊 Results:');
    console.log('  Grade:', result.website_grade || result.grade);
    console.log('  Score:', result.overall_score);
    console.log('  Duration:', duration, 'seconds');

    // Check for generated files
    console.log('\n📂 Checking Generated Files...\n');

    const fs = await import('fs/promises');
    const path = await import('path');

    const reportsDir = 'local-backups/analysis-engine/reports';
    const slug = COMPANY_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const expectedFiles = [
      `${slug}-PREVIEW.html`,
      `${slug}-FULL.html`,
      `${slug}-PREVIEW.pdf`,
      `${slug}-FULL.pdf`
    ];

    const results = [];
    for (const filename of expectedFiles) {
      const filePath = path.join(reportsDir, filename);
      try {
        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(0);
        results.push({ filename, exists: true, sizeKB, path: filePath });
        console.log(`  ✅ ${filename} (${sizeKB} KB)`);
      } catch {
        results.push({ filename, exists: false });
        console.log(`  ❌ ${filename} - NOT FOUND`);
      }
    }

    const allPresent = results.every(r => r.exists);

    if (allPresent) {
      console.log('\n🎉 SUCCESS! All 4 files generated correctly!\n');
      console.log('📄 Files:');
      results.forEach(r => console.log(`   ${r.path}`));

      // Open the full HTML report
      const fullHtmlPath = results.find(r => r.filename.includes('FULL.html')).path;
      console.log('\n🔍 Opening full HTML report...');

      const { exec } = await import('child_process');
      exec(`start ${fullHtmlPath}`);
    } else {
      console.log('\n⚠️  Some files are missing!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPDFGeneration();
