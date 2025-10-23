import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import { autoGenerateReport } from './reports/auto-report-generator.js';

// Use the analysis result from the E2E test
const mockAnalysis = {
  id: 'test-123',
  company_name: 'Example Corporation',
  industry: 'Technology',
  url: 'https://example.com',
  grade: 'F',
  overall_score: 39.8,
  design_score_desktop: 30,
  design_score_mobile: 72,
  seo_score: 55,
  content_score: 10,
  social_score: 5,
  accessibility_score: 90,
  analyzed_at: new Date().toISOString(),

  design_issues_desktop: [
    { title: 'Poor visual hierarchy', severity: 'high' },
    { title: 'Insufficient whitespace', severity: 'medium' }
  ],
  design_issues_mobile: [
    { title: 'Small touch targets', severity: 'high' }
  ],
  seo_issues: [
    { title: 'Missing meta descriptions', severity: 'medium' }
  ],
  content_issues: [
    { title: 'Minimal content', severity: 'high' }
  ],
  social_issues: [
    { title: 'No social media presence', severity: 'high' }
  ],
  accessibility_issues: [],
  
  quick_wins: [
    { title: 'Add LinkedIn page' },
    { title: 'Add social icons' }
  ],

  lead_priority: 47,
  priority_tier: 'cold',
  budget_likelihood: 'low',
  
  tech_stack: 'Unknown',
  has_blog: false,
  social_platforms_present: [],
  is_mobile_friendly: true,
  has_https: true,
  
  crawl_metadata: { pages_analyzed: [{ url: '/', title: 'Example' }] }
};

console.log('Testing synthesis with manual report generation...');
console.log('USE_AI_SYNTHESIS:', process.env.USE_AI_SYNTHESIS);

autoGenerateReport(mockAnalysis, {
  format: 'markdown',
  saveToDatabase: false
}).then(result => {
  console.log('\nReport Result:');
  console.log('  Success:', result.success);
  console.log('  Synthesis used:', result.synthesis?.used);
  console.log('  Consolidated issues:', result.synthesis?.consolidatedIssuesCount);
  console.log('  Local path:', result.local_path);
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
