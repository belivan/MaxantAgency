/**
 * Direct API test to reproduce the Internal Server Error
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const ANALYSIS_API = 'http://localhost:3001';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testAPI() {
  console.log('\n🧪 TESTING ANALYSIS API DIRECTLY\n');

  // First, get a real prospect from the database
  console.log('1. Fetching a prospect from database...');
  const { data: prospects, error: fetchError } = await supabase
    .from('prospects')
    .select('id, company_name, website, industry')
    .not('website', 'is', null)
    .limit(1);

  if (fetchError) {
    console.error('❌ Failed to fetch prospect:', fetchError.message);
    return;
  }

  if (!prospects || prospects.length === 0) {
    console.log('⚠️  No prospects found in database. Creating a test prospect...');

    const { data: newProspect, error: insertError } = await supabase
      .from('prospects')
      .insert({
        company_name: 'Test Company',
        website: 'https://example.com',
        industry: 'demo',
        city: 'Test City',
        state: 'TS'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test prospect:', insertError.message);
      return;
    }

    prospects[0] = newProspect;
  }

  const prospect = prospects[0];
  console.log(`✅ Found prospect: ${prospect.company_name}`);
  console.log(`   ID: ${prospect.id}`);
  console.log(`   Website: ${prospect.website}\n`);

  // First, get or create a project
  console.log('2. Getting or creating a project...');
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1);

  let project_id;
  if (!projects || projects.length === 0) {
    console.log('   Creating a test project...');
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create project:', createError.message);
      return;
    }
    project_id = newProject.id;
    console.log(`   ✅ Created project: ${newProject.name}`);
  } else {
    project_id = projects[0].id;
    console.log(`   ✅ Found project: ${projects[0].name}`);
  }

  // Ensure the prospect is assigned to the project
  console.log('\n3. Assigning prospect to project...');
  const { data: existingAssignment, error: checkError } = await supabase
    .from('project_prospects')
    .select('*')
    .eq('project_id', project_id)
    .eq('prospect_id', prospect.id)
    .single();

  if (!existingAssignment) {
    const { data: assignment, error: assignError } = await supabase
      .from('project_prospects')
      .insert({
        project_id: project_id,
        prospect_id: prospect.id
      })
      .select()
      .single();

    if (assignError) {
      console.error('❌ Failed to assign prospect to project:', assignError.message);
      return;
    }
    console.log('   ✅ Prospect assigned to project');
  } else {
    console.log('   ✅ Prospect already assigned to project');
  }

  // Now test the analysis API
  console.log('\n4. Calling Analysis API...');
  console.log(`   POST ${ANALYSIS_API}/api/analyze`);
  console.log(`   Payload: { prospect_ids: ["${prospect.id}"], project_id: "${project_id}" }\n`);

  try {
    const response = await fetch(`${ANALYSIS_API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_ids: [prospect.id],
        project_id: project_id  // This is required!
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`);

    if (response.status === 500) {
      console.log('❌ GOT INTERNAL SERVER ERROR!');
      const text = await response.text();
      console.log('Response body:', text);
    } else if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('✅ Got SSE stream. Reading events...\n');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            console.log(line);
          }
        }
      }
    } else {
      const text = await response.text();
      console.log('Response:', text);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAPI().catch(console.error);
