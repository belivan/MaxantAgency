// Use native fetch (Node 18+)
console.log('Testing manifest save with fixed Analysis Engine...\n');

const payload = {
  url: 'https://elmwooddental.com',
  company_name: 'Elmwood Test FINAL VERIFICATION',
  saveToDatabase: true,
  project_id: 'ffd7afd1-5ebe-4ad3-8aff-ec9b9547b409'
};

console.log('Sending analysis request to http://localhost:3001/api/analyze-url');
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');

try {
  const response = await fetch('http://localhost:3001/api/analyze-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  console.log('✅ Analysis complete!');
  console.log('  Lead ID:', result.result.id);
  console.log('  Company:', result.result.company_name);
  console.log('  Grade:', result.result.grade);
  console.log('  matched_benchmark_id:', result.result.matched_benchmark_id || 'MISSING');
  console.log('  screenshots_manifest:', result.result.screenshots_manifest ? 'YES' : 'NO');

  if (result.result.screenshots_manifest) {
    console.log('  Total screenshots:', result.result.screenshots_manifest.total_screenshots);
    console.log('  Storage type:', result.result.screenshots_manifest.storage_type);
  }

  console.log('\nNow checking database...');

  const { supabase } = await import('./analysis-engine/database/supabase-client.js');

  const { data, error } = await supabase
    .from('leads')
    .select('id, company_name, matched_benchmark_id, screenshots_manifest')
    .eq('id', result.result.id)
    .single();

  if (error) {
    console.error('❌ Database check failed:', error.message);
  } else {
    console.log('\n✅ DATABASE VERIFICATION:');
    console.log('  Company:', data.company_name);
    console.log('  Benchmark ID:', data.matched_benchmark_id ? 'SAVED ✅' : 'MISSING ❌');
    console.log('  Manifest:', data.screenshots_manifest ? `SAVED ✅ (${data.screenshots_manifest.total_screenshots} screenshots)` : 'MISSING ❌');
  }

} catch (err) {
  console.error('Error:', err.message);
}
