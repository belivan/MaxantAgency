/**
 * Test Production Report Generation
 * Tests report generation via the real API endpoint
 */

const LEAD_ID = '10c04c8d-5da3-472c-b6df-d77ba65299c7';
const API_URL = 'http://localhost:3001/api/reports/generate';

async function generateReport() {
  console.log('🎨 Generating FULL report via production API...\n');
  console.log('Lead ID:', LEAD_ID);
  console.log('\n⏳ Generating report (this may take 10-20 seconds)...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lead_id: LEAD_ID,
        reportType: 'full'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', result);
      process.exit(1);
    }

    console.log('✅ Report Generated Successfully!\n');
    console.log('📄 Report Details:');
    console.log('  Report ID:', result.id);
    console.log('  File Path:', result.file_path);
    console.log('  Report Type:', result.report_type);
    console.log('  Size:', Math.round(result.file_size / 1024), 'KB');
    console.log('  Created:', result.created_at);

    console.log('\n🔍 Opening report in browser...');

    // Import dynamically to avoid ESM issues
    const { exec } = await import('child_process');
    exec(`start ${result.file_path}`, (error) => {
      if (error) {
        console.log('\n⚠️  Could not open browser automatically');
        console.log('📂 Report location:', result.file_path);
      } else {
        console.log('✅ Report opened in browser');
      }
    });

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

generateReport();
