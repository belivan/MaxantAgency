const API_BASE = 'http://localhost:3001';
const PROJECT_ID = '14d48e53-d504-4509-91c1-5ae830ba984d';

async function analyzeHeartland() {
  console.log('🎯 Starting analysis of Heartland Dental...\n');

  const response = await fetch(`${API_BASE}/api/analyze-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://heartland.com/',
      company_name: 'Heartland Dental',
      industry: 'dental',
      project_id: PROJECT_ID
    })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('❌ Analysis failed:', data.error);
    return;
  }

  console.log('✅ Analysis complete!');
  console.log('\n📊 Results:');
  console.log('   Company:', data.result.company_name);
  console.log('   URL:', data.result.url);
  console.log('   Grade:', data.result.grade);
  console.log('   Overall Score:', data.result.overall_score + '/100');
  console.log('   Design Score:', data.result.design_score);
  console.log('   SEO Score:', data.result.seo_score);
  console.log('   Content Score:', data.result.content_score);
  console.log('   Social Score:', data.result.social_score);
  console.log('\n   Lead ID:', data.result.database_id);
  console.log('   Analysis Cost: $' + (data.result.analysis_cost || 0).toFixed(4));
  console.log('   Analysis Time:', Math.round(data.result.analysis_time / 1000) + 's');

  if (data.result.report) {
    console.log('\n📄 Report Generated:', data.result.report.id || 'Local only');
  }

  return data.result;
}

analyzeHeartland();
