// Generate SQL to drop all tables
// Run the output in your Supabase SQL Editor

console.log('🗑️  SQL to drop all tables (CASCADE removes dependencies)\n');
console.log('Copy and paste this into your Supabase SQL Editor:\n');
console.log('=' .repeat(60));
console.log();

// Tables in reverse dependency order (children first, parents last)
const tables = [
  'campaign_runs',
  'campaigns',
  'composed_emails',
  'page_analyses',
  'project_prospects',
  'reports',
  'leads',
  'prospects',
  'projects'
];

const sql = tables.map(t => `DROP TABLE IF EXISTS ${t} CASCADE;`).join('\n');

console.log(sql);
console.log();
console.log('=' .repeat(60));
console.log('\n✅ Copy the SQL above and run it in your Supabase Dashboard');
console.log('   Dashboard → SQL Editor → New Query → Paste → Run');
console.log('\n⚠️  This will permanently delete ALL data in these tables!');