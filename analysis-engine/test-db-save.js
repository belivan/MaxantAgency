/**
 * Test database save with a quick analysis
 */

console.log('Testing database save...\n');

const response = await fetch('http://localhost:3001/api/analyze-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://zahavrestaurant.com',
    company_name: 'Zahav Test',
    industry: 'restaurant'
  })
});

const result = await response.json();

console.log('Analysis result:');
console.log(`- Grade: ${result.result.grade}`);
console.log(`- Design: ${result.result.design_score}`);
console.log(`- SEO: ${result.result.seo_score}`);
console.log(`- Content: ${result.result.content_score}`);
console.log(`- Social: ${result.result.social_score}`);
console.log('');

// Now query database to see if it was saved
console.log('Checking database for saved lead...');

const { createClient } = await import('@supabase/supabase-js');
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data: leads, error } = await supabase
  .from('leads')
  .select('company_name, website_grade, design_score, seo_score, source_app, analyzed_at')
  .eq('source_app', 'analysis-engine')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (error) {
  console.error('Database query error:', error);
} else if (leads.length === 0) {
  console.log('❌ No leads from analysis-engine found in database');
} else {
  console.log('✅ Lead found in database:');
  console.log(JSON.stringify(leads[0], null, 2));
}
