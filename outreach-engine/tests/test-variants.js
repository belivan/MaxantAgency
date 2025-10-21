/**
 * Test A/B variant generation
 */

const fakeLead = {
  id: 'variant-test-001',
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
  top_issue: {
    category: 'design',
    issue: 'Outdated homepage design from 2015',
    impact: 'high'
  },
  analysis_summary: 'Website has significant design issues with outdated styling and poor mobile responsiveness.'
};

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING A/B VARIANT GENERATION');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log(`Lead: ${fakeLead.company_name}`);
console.log(`Contact: ${fakeLead.contact_name}`);
console.log(`Top Issue: ${fakeLead.top_issue.issue}\n`);

console.log('Generating 3 subject lines + 2 body variants...\n');

async function testVariants() {
  try {
    const response = await fetch('http://localhost:3002/api/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: fakeLead.url,
        strategy: 'problem-first',
        generateVariants: true,  // ⭐ Enable A/B testing
        model: 'claude-haiku-3-5',
        lead: fakeLead
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ VARIANTS GENERATED!\n');

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('📧 SUBJECT LINE OPTIONS (Pick 1):');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      data.result.subjects.forEach((subject, i) => {
        const isRecommended = i === data.result.recommended.subject;
        console.log(`${isRecommended ? '⭐' : '  '} ${i + 1}. "${subject}"${isRecommended ? ' (AI RECOMMENDED)' : ''}`);
      });

      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('📝 BODY OPTIONS (Pick 1):');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      data.result.bodies.forEach((body, i) => {
        const isRecommended = i === data.result.recommended.body;
        const preview = body.substring(0, 120) + '...';
        console.log(`${isRecommended ? '⭐' : '  '} ${i + 1}. ${preview}${isRecommended ? ' (AI RECOMMENDED)' : ''}\n`);
      });

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('💡 AI RECOMMENDATION:');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      console.log(`Best Combination: Subject ${data.result.recommended.subject + 1} + Body ${data.result.recommended.body + 1}\n`);
      console.log(`Reasoning: ${data.result.reasoning}\n`);

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('📊 METRICS:');
      console.log('═══════════════════════════════════════════════════════════════════\n');

      console.log(`Total Cost: $${data.result.total_cost.toFixed(6)}`);
      console.log(`Generation Time: ${data.result.generation_time_ms}ms`);
      console.log(`Quality Score: ${data.email.validation_score}/100\n`);

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('✅ Now you can pick the best combination for A/B testing!');
      console.log('═══════════════════════════════════════════════════════════════════\n');

    } else {
      console.log('❌ FAILED:', data.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVariants();
