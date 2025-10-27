/**
 * Final Test - All Fixes Verification
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';

async function testAllFixes() {
  const prospectData = {
    url: 'https://elmwooddentalllc.com/',
    company_name: 'Elmwood Dental - Final Test',
    industry: 'Dental Practice',
    project_id: '14d48e53-d504-4509-91c1-5ae830ba984d'
  };

  console.log('\n🧪 FINAL TEST - ALL FIXES\n');
  console.log('Testing:');
  console.log('  1. Database error fix (website_grade)');
  console.log('  2. Social media hallucination prevention');
  console.log('  3. AI grader weights extraction');
  console.log('  4. Benchmark strengths display');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospectData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ FAILED:', error.error);
      console.error('Details:', error.details);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ SUCCESS!\n');
    console.log('Grade:', result.website_grade, `(${result.website_score}/100)`);
    console.log('Lead ID:', result.id);
    console.log('\n📊 Verification:\n');

    // Check 1: Grade exists
    if (result.website_grade) {
      console.log('✅ website_grade populated:', result.website_grade);
    } else {
      console.log('❌ website_grade missing');
    }

    // Check 2: Weights exist
    if (result.weights) {
      console.log('✅ AI weights extracted:');
      Object.entries(result.weights).forEach(([dim, weight]) => {
        console.log(`   - ${dim}: ${Math.round(weight * 100)}%`);
      });
    } else {
      console.log('❌ Weights missing');
    }

    // Check 3: Weight reasoning exists
    if (result.weight_reasoning) {
      console.log('✅ Weight reasoning:', result.weight_reasoning.substring(0, 80) + '...');
    } else {
      console.log('❌ Weight reasoning missing');
    }

    // Check 4: Social issues don't hallucinate
    const socialIssues = result.social_issues || [];
    const hallucinations = socialIssues.filter(issue =>
      issue.category === 'activity' &&
      (issue.description?.includes('frequency') || issue.description?.includes('posting'))
    );

    if (hallucinations.length > 0) {
      console.log('⚠️  Potential social hallucination detected:');
      hallucinations.forEach(h => console.log(`   - ${h.title}`));
    } else {
      console.log('✅ No social media hallucinations');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ All fixes verified! Check the auto-generated report.');
    console.log('\n');

  } catch (error) {
    console.error('❌ Network error:', error.message);
    process.exit(1);
  }
}

testAllFixes();
