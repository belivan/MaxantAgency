import { scoreLeadPriority } from './analyzers/lead-scorer.js';

console.log('Testing lead scorer...\n');

const testData = {
  company_name: 'Test Coffee Shop',
  industry: 'Coffee Shop',
  url: 'https://testcoffee.com',
  city: 'Seattle',
  state: 'WA',
  website_grade: 'C',
  overall_score: 68,
  design_score: 70,
  seo_score: 65,
  content_score: 70,
  social_score: 60,
  tech_stack: 'WordPress',
  page_load_time: 2500,
  is_mobile_friendly: true,
  has_https: true,
  design_issues: [],
  quick_wins: ['Add CTA button', 'Fix mobile menu'],
  top_issue: { title: 'Missing CTA', description: 'No clear call to action' },
  social_platforms_present: ['instagram', 'facebook'],
  contact_email: 'info@testcoffee.com',
  years_in_business: 5,
  founded_year: 2020,
  employee_count: 8,
  location_count: 1,
  pricing_visible: true,
  blog_active: false
};

try {
  const result = await scoreLeadPriority(testData);

  console.log('✅ Lead Scorer Test Result:\n');
  console.log('Priority:', result.lead_priority);
  console.log('Tier:', result.priority_tier);
  console.log('Budget:', result.budget_likelihood);
  console.log('Fit Score:', result.fit_score);
  console.log('\nDimension Scores:');
  console.log('  Quality Gap:', result.quality_gap_score, '/25');
  console.log('  Budget:', result.budget_score, '/25');
  console.log('  Urgency:', result.urgency_score, '/20');
  console.log('  Industry Fit:', result.industry_fit_score, '/15');
  console.log('  Company Size:', result.company_size_score, '/10');
  console.log('  Engagement:', result.engagement_score, '/5');
  console.log('\nReasoning:', result.lead_priority_reasoning?.substring(0, 200) + '...');

  console.log('\n✅ Lead scorer is working!');
} catch (error) {
  console.error('\n❌ Lead scorer failed:');
  console.error(error.message);
  console.error(error.stack);
}

process.exit(0);
