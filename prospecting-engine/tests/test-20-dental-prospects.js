/**
 * Test: Generate 20 Dental Prospects using Claude Haiku 4.5
 *
 * Creates a project and generates 20 dental prospects using Claude Haiku 4.5 for all AI operations:
 * - Query understanding
 * - Website extraction
 * - Relevance checking
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generateDentalProspects() {
  console.log('\n' + '='.repeat(70));
  console.log('🦷 DENTAL PROSPECTS GENERATION - 20 COMPANIES');
  console.log('='.repeat(70));
  console.log('\n📋 Target: Small to medium dental offices in Hartford, CT');
  console.log('🤖 AI Model: Claude Haiku 4.5 (all operations)\n');

  // ICP Brief - Tuned for dental offices
  const icpBrief = {
    business_type: "Dentist Office",
    industry: "Healthcare - Dentistry",
    target_description: "Local dentist offices in Hartford, CT - small to medium practices with good reviews",
    location: {
      city: "Hartford",
      state: "CT",
      country: "USA"
    },
    size_range: {
      min_employees: 3,
      max_employees: 40
    },
    additional_criteria: {
      min_rating: 4.0,
      has_reviews: true
    },
    exclusions: [
      "Large dental chains",
      "Hospital-affiliated dental clinics",
      "Dental laboratories",
      "Dental suppliers"
    ],
    count: 20
  };

  // For the prospecting API, we need to normalize this to the simple format
  const prospectingBrief = {
    industry: icpBrief.industry,
    city: `${icpBrief.location.city}, ${icpBrief.location.state}`,
    target: icpBrief.target_description,
    count: icpBrief.count
  };

  console.log('📊 ICP Brief:');
  console.log(JSON.stringify(icpBrief, null, 2));
  console.log('\n');

  // Step 1: Create a project for this prospecting campaign
  console.log('📁 Creating project...\n');

  const projectData = {
    name: 'Hartford Dental Offices - Claude Haiku 4.5',
    description: 'Prospecting campaign for small to medium dental offices in Hartford, CT using Claude Haiku 4.5',
    status: 'active',
    icp_brief: icpBrief
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (projectError) {
    throw new Error(`Failed to create project: ${projectError.message}`);
  }

  console.log(`✅ Project created: "${project.name}" (ID: ${project.id})`);
  console.log('\n');

  // Pipeline options with Claude Haiku 4.5 for all operations
  const options = {
    model: 'claude-haiku-4-5',           // Text-based AI (query understanding, relevance)
    visionModel: 'claude-haiku-4-5',     // Vision-based AI (website extraction)
    projectId: project.id,               // Link prospects to this project
    minRating: icpBrief.additional_criteria.min_rating,
    verifyWebsites: true,                // Verify URLs work
    scrapeWebsites: true,                // Extract website data
    findSocial: true,                    // Find social profiles
    scrapeSocial: true,                  // Scrape social metadata
    checkRelevance: true,                // ICP relevance scoring
    filterIrrelevant: false              // Keep all for review (show scores)
  };

  console.log('⚙️  Pipeline Options:');
  console.log(JSON.stringify(options, null, 2));
  console.log('\n');

  console.log('🚀 Starting prospecting...\n');
  console.log('='.repeat(70));

  const startTime = Date.now();

  try {
    // Call the prospecting API endpoint
    const response = await fetch('http://localhost:3010/api/prospect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brief: prospectingBrief,
        options: options
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Process Server-Sent Events (SSE) stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResults = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          // Log progress events
          if (data.type === 'started') {
            console.log('\n✅ Pipeline started');
          } else if (data.type === 'step_start') {
            console.log(`\n🔄 STEP ${data.step}: ${data.message}`);
          } else if (data.type === 'step_complete') {
            console.log(`✅ ${data.message}`);
          } else if (data.type === 'company_processed') {
            console.log(`   📊 ${data.company}: ${data.status}`);
            if (data.icpScore !== undefined) {
              console.log(`      ICP Score: ${data.icpScore}/100`);
            }
          } else if (data.type === 'error') {
            console.error(`   ⚠️  Error: ${data.error}`);
          } else if (data.type === 'complete') {
            finalResults = data.results;
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('✅ PROSPECTING COMPLETE!');
    console.log('='.repeat(70));

    if (finalResults) {
      console.log('\n📊 RESULTS SUMMARY:\n');
      console.log(`   Companies Found:           ${finalResults.found}`);
      console.log(`   Prospects Verified:        ${finalResults.verified || 0}`);
      console.log(`   Prospects Saved:           ${finalResults.saved}`);
      console.log(`   Prospects Skipped:         ${finalResults.skipped || 0}`);
      console.log(`   Failed:                    ${finalResults.failed || 0}`);
      console.log(`   Filtered (Inactive):       ${finalResults.filteredInactive || 0}`);
      console.log(`   Success Rate:              ${((finalResults.saved / finalResults.found) * 100).toFixed(1)}%`);
      console.log(`   Total Cost:                $${finalResults.cost || '0.00'}`);
      console.log(`   Cost per Prospect:         $${finalResults.saved > 0 ? (finalResults.cost / finalResults.saved).toFixed(4) : '0.0000'}`);
      console.log(`   Duration:                  ${duration}s (~${(duration / 60).toFixed(1)} min)`);
      console.log('');

      // Show saved prospects
      if (finalResults.prospects && finalResults.prospects.length > 0) {
        console.log('📋 GENERATED PROSPECTS:\n');
        finalResults.prospects.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.company_name}`);
          console.log(`      Website: ${p.website || 'N/A'}`);
          console.log(`      Location: ${p.city}, ${p.state}`);
          console.log(`      Rating: ${p.google_rating ? p.google_rating + '/5.0' : 'N/A'}`);
          console.log(`      Phone: ${p.contact_phone || 'N/A'}`);
          console.log(`      Email: ${p.contact_email || 'N/A'}`);
          if (p.icp_match_score !== null) {
            console.log(`      ICP Match: ${p.icp_match_score}/100`);
          }
          console.log('');
        });
      }

      console.log('='.repeat(70));
      console.log('✅ TEST PASSED!');
      console.log('='.repeat(70));
      console.log('\n💡 Next steps:');
      console.log(`   Project ID: ${project.id}`);
      console.log(`   Project Name: ${project.name}`);
      console.log('   1. Review prospects in Command Center UI');
      console.log('   2. Run analysis on selected prospects');
      console.log('   3. Generate outreach emails\n');

    } else {
      throw new Error('No results received from pipeline');
    }

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(70));
    console.error(`\n${error.message}\n`);

    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the test
generateDentalProspects().catch(error => {
  console.error('\n❌ Script crashed:', error.message);
  process.exit(1);
});
