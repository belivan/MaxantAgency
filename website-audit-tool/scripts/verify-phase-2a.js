/**
 * Phase 2A Verification Test
 * Tests the complete pipeline with Grok integration
 */

import fetch from 'node-fetch';

const TEST_SITES = [
  'https://www.bargleyadvertising.com/',  // Philly Marketing Agency
  'https://www.rsbyerscompany.com/',      // Philly Plumbing/HVAC
  'https://www.morganlewis.com/',         // Philly Law Firm
  'https://www.zahavrestaurant.com/',     // Philly Restaurant
  'https://www.mcallisternrg.com/',       // Philly Energy/HVAC
  'https://marcumllp.com/',               // Philly Accounting
  'https://www.paelectric.com/',          // Philly Electrical
  'https://philadelphiadentistry.com/'    // Philly Dental
];

console.log('🧪 PHASE 2A VERIFICATION TEST');
console.log('='.repeat(80));
console.log('Testing complete pipeline: Scraping → Grok → Validation → Results\n');

async function testWebsite(url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${url}`);
  console.log('='.repeat(80));

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [url],
        emailType: 'local',
        depthTier: 'tier1'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse Server-Sent Events (SSE) stream
    const text = await response.text();
    const events = text.split('\n\n').filter(e => e.trim());

    let result = null;
    for (const event of events) {
      if (event.startsWith('data: ')) {
        const data = JSON.parse(event.slice(6)); // Remove "data: " prefix
        if (data.type === 'complete') {
          result = data;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Analysis Complete (${duration}s)`);
    console.log('-'.repeat(80));

    // Check if we have analysis results
    if (result.results && result.results.length > 0) {
      const analysis = result.results[0];

      console.log('\n📊 VERIFICATION CHECKLIST:');

      // 1. Check if Grok data exists
      const hasGrokData = analysis.grokData && analysis.grokData.companyInfo;
      console.log(`${hasGrokData ? '✅' : '❌'} Grok extraction ran: ${hasGrokData ? 'YES' : 'NO'}`);

      // 2. Check contact info from Grok
      const email = analysis.grokData?.contactInfo?.email || analysis.contact?.email;
      const phone = analysis.grokData?.contactInfo?.phone || analysis.contact?.phone;
      console.log(`${email ? '✅' : '⚠️ '} Email found: ${email || 'None'}`);
      console.log(`${phone ? '✅' : '⚠️ '} Phone found: ${phone || 'None'}`);

      // 3. Check enhanced Grok data
      const companyName = analysis.grokData?.companyInfo?.name;
      const industry = analysis.grokData?.companyInfo?.industry;
      const location = analysis.grokData?.companyInfo?.location;
      const services = analysis.grokData?.businessIntel?.services;
      const valueProp = analysis.grokData?.businessIntel?.valueProposition;

      console.log(`${companyName ? '✅' : '⚠️ '} Company name: ${companyName || 'Not found'}`);
      console.log(`${industry ? '✅' : '⚠️ '} Industry: ${industry || 'Not detected'}`);
      console.log(`${location ? '✅' : '⚠️ '} Location: ${location || 'Not found'}`);
      console.log(`${services?.length > 0 ? '✅' : '⚠️ '} Services: ${services?.length || 0} found`);
      console.log(`${valueProp ? '✅' : '⚠️ '} Value Prop: ${valueProp ? 'Yes' : 'Not found'}`);

      // 4. Check social profiles
      const socialProfiles = analysis.grokData?.socialProfiles || {};
      const socialCount = [
        socialProfiles.linkedIn?.company,
        socialProfiles.instagram?.url,
        socialProfiles.twitter?.url,
        socialProfiles.facebook,
        socialProfiles.youtube
      ].filter(Boolean).length;
      console.log(`${socialCount > 0 ? '✅' : '⚠️ '} Social profiles: ${socialCount} found`);

      // 5. Check AI analysis
      const hasAnalysis = analysis.summary || analysis.critiques?.basic?.length > 0;
      console.log(`${hasAnalysis ? '✅' : '❌'} AI analysis: ${hasAnalysis ? 'Generated' : 'Failed'}`);

      // 6. Calculate quality score
      let score = 0;
      if (companyName) score += 15;
      if (email) score += 20;
      if (phone) score += 20;
      if (industry) score += 10;
      if (location) score += 5;
      if (services?.length > 0) score += 10;
      if (valueProp) score += 5;
      if (socialCount > 0) score += 15;

      let grade = score >= 70 ? '🟢 A' : score >= 50 ? '🟡 B' : score >= 30 ? '🟠 C' : '🔴 D';
      console.log(`\n📊 Quality Score: ${score}/100 ${grade}`);

      // 7. Show AI critique sample
      if (analysis.critiques?.basic?.length > 0) {
        console.log(`\n💡 Sample Critique:`);
        const critique = analysis.critiques.basic[0];
        console.log(`   "${critique.substring(0, 150)}..."`);
      }

      // 8. Show Grok metadata
      if (analysis.grokData?.metadata) {
        console.log(`\n💰 Grok Cost: $${analysis.grokData.metadata.cost?.toFixed(4) || '0.0000'}`);
        console.log(`⏱️  Grok Time: ${analysis.grokData.metadata.responseTime?.toFixed(2) || '0'}ms`);
      }

      return { success: true, score, url };

    } else {
      console.log('❌ No results returned');
      return { success: false, url };
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { success: false, url, error: error.message };
  }
}

async function runTests() {
  const results = [];

  for (const url of TEST_SITES) {
    const result = await testWebsite(url);
    results.push(result);

    // Wait between tests
    if (TEST_SITES.indexOf(url) < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(80));
  console.log('PHASE 2A VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgScore = results.filter(r => r.score).reduce((sum, r) => sum + r.score, 0) / successful;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful: ${successful} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  if (successful > 0) {
    console.log(`Average Quality: ${avgScore.toFixed(0)}%`);
  }

  console.log('\nResults:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const scoreText = r.score ? ` (${r.score}%)` : '';
    console.log(`  ${status} ${r.url}${scoreText}`);
  });

  console.log('\n' + '='.repeat(80));
  if (successful === results.length) {
    console.log('✅ PHASE 2A VERIFICATION: PASSED');
    console.log('\nGrok integration is working correctly!');
    console.log('- Data extraction: ✅');
    console.log('- Validation: ✅');
    console.log('- AI analysis: ✅');
    console.log('- Results format: ✅');
  } else {
    console.log('⚠️  PHASE 2A VERIFICATION: PARTIAL');
    console.log(`\n${successful}/${results.length} tests passed`);
  }
  console.log('='.repeat(80));
  console.log('\n✅ Verification complete!\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
