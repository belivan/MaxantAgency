import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n═══════════════════════════════════════════════════════');
console.log('   PROSPECTS TABLE AUDIT');
console.log('═══════════════════════════════════════════════════════\n');

async function auditProspectsTable() {
  try {
    // 1. Get total count and all prospects
    const { data: allProspects, error: fetchError, count } = await supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    console.log(`📊 Total prospects in database: ${count}\n`);

    // 2. Check for duplicates by company name
    const companyNames = {};
    const duplicates = [];

    allProspects.forEach(prospect => {
      const name = prospect.company_name?.toLowerCase();
      if (!companyNames[name]) {
        companyNames[name] = [];
      }
      companyNames[name].push(prospect);
    });

    Object.entries(companyNames).forEach(([name, prospects]) => {
      if (prospects.length > 1) {
        duplicates.push({ name, count: prospects.length, prospects });
      }
    });

    if (duplicates.length > 0) {
      console.log('🔄 DUPLICATE COMPANIES FOUND:');
      duplicates.forEach(dup => {
        console.log(`\n   "${dup.name}" appears ${dup.count} times:`);
        dup.prospects.forEach(p => {
          console.log(`     - ID: ${p.id.slice(0, 8)}... | Created: ${new Date(p.created_at).toLocaleDateString()} | Status: ${p.status || 'N/A'}`);
        });
      });
      console.log('');
    } else {
      console.log('✅ No duplicate companies found\n');
    }

    // 3. Check for test data patterns
    const testPatterns = [
      /test/i,
      /demo/i,
      /example/i,
      /sample/i,
      /fake/i,
      /dummy/i
    ];

    const potentialTestData = allProspects.filter(p => {
      const name = p.company_name || '';
      const industry = p.industry || '';
      return testPatterns.some(pattern =>
        pattern.test(name) || pattern.test(industry)
      );
    });

    if (potentialTestData.length > 0) {
      console.log('🧪 POTENTIAL TEST DATA:');
      potentialTestData.forEach(p => {
        console.log(`   - "${p.company_name}" (${p.industry}) - ID: ${p.id.slice(0, 8)}...`);
      });
      console.log('');
    } else {
      console.log('✅ No obvious test data found\n');
    }

    // 4. Check for data quality issues
    const qualityIssues = {
      noWebsite: [],
      noEmail: [],
      noPhone: [],
      noDescription: [],
      noSocial: [],
      lowRelevance: [],
      oldData: [],
      noProjectId: []
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    allProspects.forEach(p => {
      if (!p.website || p.website_status === 'no_website') {
        qualityIssues.noWebsite.push(p.company_name);
      }
      if (!p.contact_email) {
        qualityIssues.noEmail.push(p.company_name);
      }
      if (!p.contact_phone) {
        qualityIssues.noPhone.push(p.company_name);
      }
      if (!p.description) {
        qualityIssues.noDescription.push(p.company_name);
      }
      if (!p.social_profiles || Object.values(p.social_profiles).filter(v => v).length === 0) {
        qualityIssues.noSocial.push(p.company_name);
      }
      if (p.icp_match_score < 50) {
        qualityIssues.lowRelevance.push(`${p.company_name} (score: ${p.icp_match_score})`);
      }
      if (new Date(p.created_at) < thirtyDaysAgo) {
        qualityIssues.oldData.push(`${p.company_name} (${new Date(p.created_at).toLocaleDateString()})`);
      }
      if (!p.project_id) {
        qualityIssues.noProjectId.push(p.company_name);
      }
    });

    console.log('📋 DATA QUALITY SUMMARY:');
    console.log(`   - Missing website: ${qualityIssues.noWebsite.length}/${count} (${Math.round(qualityIssues.noWebsite.length/count*100)}%)`);
    console.log(`   - Missing email: ${qualityIssues.noEmail.length}/${count} (${Math.round(qualityIssues.noEmail.length/count*100)}%)`);
    console.log(`   - Missing phone: ${qualityIssues.noPhone.length}/${count} (${Math.round(qualityIssues.noPhone.length/count*100)}%)`);
    console.log(`   - Missing description: ${qualityIssues.noDescription.length}/${count} (${Math.round(qualityIssues.noDescription.length/count*100)}%)`);
    console.log(`   - No social profiles: ${qualityIssues.noSocial.length}/${count} (${Math.round(qualityIssues.noSocial.length/count*100)}%)`);
    console.log(`   - Low relevance (<50): ${qualityIssues.lowRelevance.length}/${count} (${Math.round(qualityIssues.lowRelevance.length/count*100)}%)`);
    console.log(`   - Data >30 days old: ${qualityIssues.oldData.length}/${count} (${Math.round(qualityIssues.oldData.length/count*100)}%)`);
    console.log(`   - No project assigned: ${qualityIssues.noProjectId.length}/${count} (${Math.round(qualityIssues.noProjectId.length/count*100)}%)\n`);

    // 5. Show distribution by status
    const statusCounts = {};
    allProspects.forEach(p => {
      const status = p.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📊 STATUS DISTRIBUTION:');
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, cnt]) => {
      console.log(`   - ${status}: ${cnt} (${Math.round(cnt/count*100)}%)`);
    });
    console.log('');

    // 6. Show distribution by city
    const cityCounts = {};
    allProspects.forEach(p => {
      const city = p.city || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    console.log('🌍 CITY DISTRIBUTION:');
    Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([city, cnt]) => {
      console.log(`   - ${city}: ${cnt}`);
    });
    console.log('');

    // 7. Show recent entries
    console.log('📅 MOST RECENT ENTRIES:');
    allProspects.slice(0, 5).forEach(p => {
      console.log(`   - ${p.company_name} (${p.city}) - ${new Date(p.created_at).toLocaleString()}`);
    });
    console.log('');

    // 8. Cleanup recommendations
    console.log('🧹 CLEANUP RECOMMENDATIONS:\n');

    let recommendCleanup = false;

    if (duplicates.length > 0) {
      console.log('   ⚠️  Remove duplicate companies (keep most recent or most complete)');
      recommendCleanup = true;
    }

    if (potentialTestData.length > 0) {
      console.log('   ⚠️  Review and remove test data entries');
      recommendCleanup = true;
    }

    if (qualityIssues.lowRelevance.length > 0) {
      console.log(`   ⚠️  Consider removing ${qualityIssues.lowRelevance.length} low-relevance prospects (score < 50)`);
      recommendCleanup = true;
    }

    if (qualityIssues.oldData.length > 10) {
      console.log(`   ⚠️  Consider archiving ${qualityIssues.oldData.length} prospects older than 30 days`);
      recommendCleanup = true;
    }

    if (qualityIssues.noProjectId.length > 10) {
      console.log(`   ⚠️  ${qualityIssues.noProjectId.length} prospects not assigned to any project`);
      recommendCleanup = true;
    }

    if (!recommendCleanup) {
      console.log('   ✅ No immediate cleanup needed - table is in good shape!');
    } else {
      console.log('\n   Would you like me to create a cleanup script? (This would need to be run separately)');
    }

  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

// Run audit
await auditProspectsTable();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(0);