/**
 * Test outreach engine with fake leads
 */

// Fake leads with different grades and industries
const fakeLeads = [
  {
    id: 'fake-lead-001',
    company_name: 'Bella Vista Bistro',
    industry: 'Restaurant',
    url: 'https://example-restaurant.com',
    city: 'Philadelphia',
    contact_email: 'owner@example-restaurant.com',
    contact_name: 'Maria Rodriguez',
    website_grade: 'F',
    lead_grade: 'A',
    overall_score: 35,
    design_score: 30,
    seo_score: 25,
    content_score: 40,
    social_score: 45,
    top_issue: {
      category: 'design',
      issue: 'Outdated homepage design from 2015',
      impact: 'high'
    },
    analysis_summary: 'Website has significant design issues with outdated styling and poor mobile responsiveness. Menu is hard to navigate.',
    quick_wins: [
      'Update hero section with professional food photography',
      'Add online reservation system',
      'Fix mobile menu navigation'
    ]
  },
  {
    id: 'fake-lead-002',
    company_name: 'Smith & Associates Law',
    industry: 'Legal Services',
    url: 'https://example-lawfirm.com',
    city: 'Boston',
    contact_email: 'info@example-lawfirm.com',
    contact_name: 'John Smith',
    website_grade: 'D',
    lead_grade: 'B',
    overall_score: 55,
    design_score: 60,
    seo_score: 45,
    content_score: 50,
    social_score: 30,
    top_issue: {
      category: 'seo',
      issue: 'Missing meta descriptions on all pages',
      impact: 'medium'
    },
    analysis_summary: 'Professional design but weak SEO presence. Not ranking for key practice area keywords.',
    quick_wins: [
      'Add meta descriptions to all pages',
      'Create practice area landing pages',
      'Add schema markup for LocalBusiness'
    ]
  },
  {
    id: 'fake-lead-003',
    company_name: 'Perfect Smile Dental',
    industry: 'Dentistry',
    url: 'https://example-dental.com',
    city: 'San Francisco',
    contact_email: 'contact@example-dental.com',
    contact_name: 'Dr. Sarah Johnson',
    website_grade: 'C',
    lead_grade: 'A',
    overall_score: 65,
    design_score: 70,
    seo_score: 60,
    content_score: 65,
    social_score: 55,
    top_issue: {
      category: 'content',
      issue: 'No patient testimonials or reviews displayed',
      impact: 'high'
    },
    analysis_summary: 'Solid technical foundation but missing trust elements. No social proof or patient success stories.',
    quick_wins: [
      'Add patient testimonials section',
      'Display Google reviews on homepage',
      'Add before/after photo gallery'
    ]
  }
];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING OUTREACH ENGINE WITH FAKE LEADS');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log(`Created ${fakeLeads.length} fake leads for testing:\n`);

fakeLeads.forEach((lead, i) => {
  console.log(`${i + 1}. ${lead.company_name} (${lead.industry})`);
  console.log(`   Grade: ${lead.lead_grade} | Website: ${lead.website_grade}`);
  console.log(`   Contact: ${lead.contact_name} <${lead.contact_email}>`);
  console.log(`   Top Issue: ${lead.top_issue.issue}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════');
console.log('Now testing email generation for each lead...\n');

// Test email generation for each lead
async function testEmailGeneration() {
  const results = [];

  for (const lead of fakeLeads) {
    console.log(`📧 Generating email for ${lead.company_name}...`);

    try {
      const response = await fetch('http://localhost:3002/api/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: lead.url,
          strategy: 'problem-first',
          model: 'claude-haiku-4-5',
          lead: lead  // Pass full lead data
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`   ✅ SUCCESS`);
        console.log(`   Subject: ${result.email.subject}`);
        console.log(`   Body: ${result.email.body.substring(0, 100)}...`);
        console.log(`   Quality: ${result.email.validation_score}/100`);
        console.log(`   Cost: $${result.email.total_cost.toFixed(6)}`);
        console.log(`   Time: ${result.email.generation_time_ms}ms`);
        results.push({ lead: lead.company_name, success: true, result });
      } else {
        console.log(`   ❌ FAILED: ${result.error}`);
        results.push({ lead: lead.company_name, success: false, error: result.error });
      }

      console.log('');

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({ lead: lead.company_name, success: false, error: error.message });
      console.log('');
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    const avgCost = successful.reduce((sum, r) => sum + r.result.email.total_cost, 0) / successful.length;
    const avgTime = successful.reduce((sum, r) => sum + r.result.email.generation_time_ms, 0) / successful.length;
    const avgQuality = successful.reduce((sum, r) => sum + r.result.email.validation_score, 0) / successful.length;

    console.log(`\nAverage metrics:`);
    console.log(`  Cost: $${avgCost.toFixed(6)}`);
    console.log(`  Time: ${Math.round(avgTime)}ms`);
    console.log(`  Quality: ${Math.round(avgQuality)}/100`);
  }

  if (failed.length > 0) {
    console.log(`\nFailed tests:`);
    failed.forEach(f => {
      console.log(`  - ${f.lead}: ${f.error}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');

  return results;
}

// Run the test
testEmailGeneration().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
