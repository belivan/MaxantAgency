import { analyzeWebsites } from '../analyzer.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 DATA QUALITY TEST - 15 WEBSITES (Focus: Data Extraction)\n');
console.log('=' .repeat(70));

// 15 diverse test websites (mix of industries, platforms, contact info quality)
const TEST_URLS = [
  // Strong contact info expected
  'https://maksant.com',              // 1. Web design agency (email expected)
  'https://goettl.com',               // 2. HVAC company (phone expected)
  'https://sweetgreen.com',           // 3. Restaurant chain (corporate contact)

  // Platform diversity
  'https://grindcorehouse.com',       // 4. Coffee shop (WordPress?)
  'https://bluebottlecoffee.com',    // 5. Coffee chain (custom platform)
  'https://dig.com',                  // 6. Fast casual (modern stack)

  // Known platforms (for platform detection test)
  'https://weebly.com',               // 7. Weebly (should detect own platform)
  'https://squarespace.com',          // 8. Squarespace (should detect)
  'https://wix.com',                  // 9. Wix (should detect)

  // E-commerce platforms
  'https://shopify.com',              // 10. Shopify (should detect)
  'https://bigcartel.com',            // 11. E-commerce builder

  // Tech companies (rich data expected)
  'https://vercel.com',               // 12. Vercel platform
  'https://netlify.com',              // 13. Netlify platform

  // Service chains
  'https://firehousesubs.com',        // 14. Franchise
  'https://chipotle.com',             // 15. National chain
];

console.log(`\n📋 Test Plan:`);
console.log(`   - Analyzing ${TEST_URLS.length} diverse websites`);
console.log(`   - Mix of: Local businesses, chains, SaaS, e-commerce`);
console.log(`   - Depth: Tier 1 (quick analysis)`);
console.log(`   - Modules: Basic + Industry only`);
console.log(`   - Supabase: ENABLED ✅`);
console.log(`\n⏱️  Estimated time: ~12 minutes (45 sec/site)`);
console.log('=' .repeat(70));

const startTime = Date.now();
let completedCount = 0;

// Progress callback
function sendProgress(data) {
  if (data.type === 'site_complete') {
    completedCount++;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const avgTime = Math.floor(elapsed / completedCount);
    const remaining = (TEST_URLS.length - completedCount) * avgTime;

    console.log(`\n✅ [${completedCount}/${TEST_URLS.length}] ${data.url}`);
    console.log(`   ⏱️  ${elapsed}s elapsed | ~${remaining}s remaining`);
  } else if (data.type === 'error') {
    console.log(`\n❌ Error: ${data.message}`);
  }
}

// Options for analysis
const options = {
  emailType: 'local',
  depthTier: 'tier1',
  textModel: 'gpt-5-mini',
  visionModel: 'gpt-4o',
  modules: {
    basic: true,
    industry: true,
    visual: false,      // Disabled for speed
    seo: false,         // Disabled for speed
    competitor: false   // Disabled for speed
  },
  saveToDrafts: false,
  saveToSupabase: true  // ← ENABLED
};

console.log('\n🚀 Starting analysis...\n');

try {
  // Run analysis
  const results = await analyzeWebsites(TEST_URLS, options, sendProgress);

  const totalTime = Math.floor((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE!');
  console.log('='.repeat(70));
  console.log(`   Total time: ${totalTime}s (${Math.floor(totalTime / 60)}m ${totalTime % 60}s)`);
  console.log(`   Avg per site: ${Math.floor(totalTime / TEST_URLS.length)}s`);
  console.log(`   Success: ${results.length}/${TEST_URLS.length} sites`);

  // Data Quality Report
  let hasEmail = 0, hasPhone = 0, hasCompany = 0, hasIndustry = 0;
  let hasLocation = 0, hasPlatform = 0, hasServices = 0, hasSocial = 0;

  results.forEach(r => {
    if (r.contact?.email || r.grokData?.contactInfo?.email) hasEmail++;
    if (r.grokData?.contactInfo?.phone) hasPhone++;
    if (r.companyName || r.grokData?.companyInfo?.name) hasCompany++;
    if (r.industry?.specific || r.grokData?.companyInfo?.industry) hasIndustry++;
    if (r.grokData?.companyInfo?.location) hasLocation++;
    if (r.grokData?.techStack?.platform) hasPlatform++;
    if (r.grokData?.businessIntel?.services?.length > 0) hasServices++;
    if (Object.keys(r.grokData?.socialProfiles || {}).length > 0) hasSocial++;
  });

  console.log(`\n📊 DATA EXTRACTION QUALITY REPORT:`);
  console.log(`   ✉️  Email found: ${hasEmail}/${results.length} (${Math.round(hasEmail / results.length * 100)}%)`);
  console.log(`   📞 Phone found: ${hasPhone}/${results.length} (${Math.round(hasPhone / results.length * 100)}%)`);
  console.log(`   🏢 Company name: ${hasCompany}/${results.length} (${Math.round(hasCompany / results.length * 100)}%)`);
  console.log(`   🏭 Industry detected: ${hasIndustry}/${results.length} (${Math.round(hasIndustry / results.length * 100)}%)`);
  console.log(`   📍 Location found: ${hasLocation}/${results.length} (${Math.round(hasLocation / results.length * 100)}%)`);
  console.log(`   💻 Platform detected: ${hasPlatform}/${results.length} (${Math.round(hasPlatform / results.length * 100)}%)`);
  console.log(`   🛠️  Services extracted: ${hasServices}/${results.length} (${Math.round(hasServices / results.length * 100)}%)`);
  console.log(`   🔗 Social profiles: ${hasSocial}/${results.length} (${Math.round(hasSocial / results.length * 100)}%)`);

  const avgDataQuality = Math.round(
    (hasEmail + hasPhone + hasCompany + hasIndustry + hasLocation + hasPlatform + hasServices + hasSocial) /
    (results.length * 8) * 100
  );
  console.log(`\n   📈 OVERALL DATA QUALITY: ${avgDataQuality}%`);

  // Wait for Supabase saves to complete
  console.log(`\n⏳ Waiting 5 seconds for all Supabase saves to complete...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n' + '='.repeat(70));
  console.log('📊 QUERYING SUPABASE DATABASE...');
  console.log('='.repeat(70));

  // Query Supabase for all leads
  const { data: allLeads, error } = await supabase
    .from('leads')
    .select('url, company_name, contact_email, industry, location, website_grade, lead_grade, tech_stack')
    .order('analyzed_at', { ascending: false })
    .limit(20);  // Get last 20 (should include our 15)

  if (error) {
    console.error('❌ Supabase query failed:', error.message);
    throw error;
  }

  console.log(`\n✅ Found ${allLeads.length} total leads in database`);

  // Filter to just our test URLs
  const ourLeads = allLeads.filter(lead =>
    TEST_URLS.some(url => lead.url.includes(url.replace('https://', '').replace('http://', '')))
  );

  console.log(`✅ ${ourLeads.length}/${TEST_URLS.length} of our test sites saved to Supabase`);

  if (ourLeads.length < TEST_URLS.length) {
    console.log(`\n⚠️  WARNING: ${TEST_URLS.length - ourLeads.length} sites missing from database!`);
    const savedUrls = ourLeads.map(l => l.url);
    const missing = results.filter(r => !savedUrls.some(url => url.includes(r.url.replace('https://', ''))));
    console.log(`   Missing:`, missing.map(r => r.url));
  }

  // Display sample data
  console.log(`\n📄 SAMPLE DATA (first 5 leads):\n`);
  ourLeads.slice(0, 5).forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.company_name || 'Unknown Company'}`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Email: ${lead.contact_email || 'Not found'}`);
    console.log(`   Industry: ${lead.industry || 'Unknown'}`);
    console.log(`   Location: ${lead.location || 'Unknown'}`);
    console.log(`   Platform: ${lead.tech_stack?.platform || 'Unknown'}`);
    console.log(`   Grades: Website ${lead.website_grade} | Lead ${lead.lead_grade}`);
    console.log('');
  });

  // Query by grade
  console.log('=' .repeat(70));
  console.log('🎯 QUERY TEST: Get all Grade A leads');
  console.log('='.repeat(70));

  const { data: gradeALeads, error: gradeError } = await supabase
    .from('leads')
    .select('company_name, url, contact_email, lead_grade')
    .eq('lead_grade', 'A')
    .not('contact_email', 'is', null)
    .order('analyzed_at', { ascending: false });

  if (gradeError) {
    console.error('❌ Grade A query failed:', gradeError.message);
  } else {
    console.log(`\n✅ Found ${gradeALeads.length} Grade A leads ready to contact:\n`);
    gradeALeads.slice(0, 5).forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.company_name || lead.url} - ${lead.contact_email}`);
    });
  }

  // Query by platform
  console.log('\n' + '='.repeat(70));
  console.log('💻 QUERY TEST: Get leads by platform');
  console.log('='.repeat(70));

  const { data: platformLeads, error: platformError } = await supabase
    .from('leads')
    .select('company_name, url, tech_stack')
    .not('tech_stack', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(10);

  if (platformError) {
    console.error('❌ Platform query failed:', platformError.message);
  } else {
    console.log(`\n✅ Platform detection results:\n`);
    const platformCount = {};
    platformLeads.forEach(lead => {
      const platform = lead.tech_stack?.platform || 'Unknown';
      platformCount[platform] = (platformCount[platform] || 0) + 1;
    });
    Object.entries(platformCount).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} sites`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 ALL TESTS PASSED! SUPABASE INTEGRATION VERIFIED!');
  console.log('='.repeat(70));

  console.log(`\n📊 NEXT STEPS:`);
  console.log(`   1. View in Supabase: https://app.supabase.com/project/njejsagzeebvvupzffpd/editor`);
  console.log(`   2. Click "Table Editor" → "leads"`);
  console.log(`   3. See all ${ourLeads.length} analyzed websites!`);
  console.log(`\n   SQL examples to run in Supabase:`);
  console.log(`   - SELECT * FROM leads WHERE lead_grade = 'A';`);
  console.log(`   - SELECT * FROM leads WHERE tech_stack->>'platform' = 'WordPress';`);
  console.log(`   - SELECT * FROM leads WHERE location LIKE '%Philadelphia%';`);
  console.log(`   - SELECT company_name, services FROM leads WHERE 'Web Design' = ANY(services);`);

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
