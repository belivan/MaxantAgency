/**
 * Test Script - End-to-End Synthesis + QA Pipeline
 * 
 * Tests that synthesis and QA validation work together
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../'); // Go up to MaxantAgency root
dotenv.config({ path: join(projectRoot, '.env') });

import { runReportSynthesis } from './report-synthesis.js';
import { validateReportQuality, generateQAReport } from './qa-validator.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('   TESTING SYNTHESIS + QA PIPELINE');
console.log('═══════════════════════════════════════════════════════════\n');

// Mock analysis data (minimal for testing)
const mockData = {
  companyName: 'Test Company',
  industry: 'Technology',
  grade: 'B',
  overallScore: 75,
  url: 'https://test.com',
  issuesByModule: {
    desktop: [
      { title: 'Desktop Issue 1', severity: 'high', description: 'Test issue', category: 'design' }
    ],
    mobile: [
      { title: 'Mobile Issue 1', severity: 'medium', description: 'Test issue', category: 'ux' }
    ],
    seo: [
      { title: 'SEO Issue 1', severity: 'high', description: 'Missing meta', category: 'metadata' }
    ],
    content: [],
    social: [],
    accessibility: []
  },
  quickWins: [
    { title: 'Quick Win 1', effort: 'low', impact: 'high' }
  ],
  leadScoring: {
    lead_priority: 75,
    priority_tier: 'hot',
    budget_likelihood: 'high'
  },
  topIssue: {
    title: 'Critical SEO Issue',
    description: 'Missing metadata'
  },
  techStack: 'WordPress',
  hasBlog: true,
  socialPlatforms: ['LinkedIn', 'Twitter'],
  isMobileFriendly: true,
  hasHttps: true,
  crawlPages: [
    {
      url: '/',
      fullUrl: 'https://test.com/',
      title: 'Home',
      metadata: { title: 'Test Home' },
      analyzed_for: { desktop: true, mobile: true },
      screenshot_paths: {
        desktop: '/screenshots/home-desktop.png',
        mobile: '/screenshots/home-mobile.png'
      }
    }
  ]
};

async function testPipeline() {
  console.log('⚠️  Note: This test uses real AI calls (GPT-5) which may take 30-60 seconds.\n');
  
  try {
    // Step 1: Run synthesis
    console.log('Step 1: Running Report Synthesis...\n');
    console.log('   [This may take up to 60 seconds for AI processing]\n');
    
    const synthesisResults = await runReportSynthesis(mockData);
    
    console.log('\n✓ Synthesis Complete');
    console.log(`  - Consolidated Issues: ${synthesisResults.consolidatedIssues?.length || 0}`);
    console.log(`  - Executive Summary: ${synthesisResults.executiveSummary ? 'Generated' : 'Missing'}`);
    console.log(`  - Screenshot References: ${synthesisResults.screenshotReferences?.length || 0}`);
    console.log(`  - Synthesis Errors: ${synthesisResults.errors?.length || 0}`);
    
    // Step 2: Run QA validation
    console.log('\n\nStep 2: Running QA Validation...\n');
    const qaValidation = validateReportQuality(synthesisResults);
    
    // Step 3: Generate report
    console.log('\n\nStep 3: Generating QA Report...\n');
    const qaReport = generateQAReport(qaValidation);
    console.log(qaReport);
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✓ Synthesis Pipeline: ${synthesisResults.errors.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✓ QA Validation: ${qaValidation.status !== 'ERROR' ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Quality Score: ${qaValidation.qualityScore}/100`);
    console.log(`✓ Status: ${qaValidation.status}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (synthesisResults.errors.length > 0) {
      console.error('Synthesis Errors:');
      synthesisResults.errors.forEach(err => {
        console.error(`  - ${err.stage}: ${err.message}`);
      });
    }
    
    process.exit(qaValidation.status === 'ERROR' ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Pipeline Test Failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testPipeline();
