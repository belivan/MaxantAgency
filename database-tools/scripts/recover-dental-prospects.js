/**
 * Recovery Script for Dental Prospects
 *
 * This script recovers the 20 dental prospects from the test run:
 * 1. Creates the test project in database
 * 2. Inserts all 20 prospects from backup files
 * 3. Links prospects to project via project_prospects table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test project details
const TEST_PROJECT = {
  id: '6024ee94-aeab-48a6-ad2e-3b814d23f798',
  name: 'Hartford Dental Offices Test',
  client_name: 'Test Client',
  description: 'Test prospecting run for Hartford, CT dental offices',
  status: 'active',
  icp_brief: {
    count: 20,
    industry: 'Healthcare - Dentistry',
    location: { city: 'Hartford', state: 'CT', country: 'USA' },
    exclusions: [
      'Large dental chains',
      'Hospital-affiliated dental clinics',
      'Dental laboratories',
      'Dental suppliers'
    ],
    size_range: { max_employees: 40, min_employees: 3 },
    business_type: 'Dentist Office',
    target_description: 'Local dentist offices in Hartford, CT - small to medium practices with good reviews',
    additional_criteria: { min_rating: 4, has_reviews: true }
  }
};

const RUN_ID = '403059c0-18fe-4db6-b585-459288f47da3';
const BACKUP_BASE = 'C:\\Users\\anton\\Desktop\\MaxantAgency\\local-backups\\prospecting-engine';

console.log('\n' + '='.repeat(70));
console.log('🔧 DENTAL PROSPECTS RECOVERY SCRIPT');
console.log('='.repeat(70));
console.log(`\nProject ID: ${TEST_PROJECT.id}`);
console.log(`Run ID: ${RUN_ID}\n`);

/**
 * Step 1: Create the test project
 */
async function createTestProject() {
  console.log('1️⃣  Creating test project...');

  try {
    // Check if project already exists
    const { data: existing, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', TEST_PROJECT.id)
      .single();

    if (existing) {
      console.log('   ✅ Project already exists:', existing.name);
      return existing;
    }

    // Create new project
    const { data, error } = await supabase
      .from('projects')
      .insert(TEST_PROJECT)
      .select()
      .single();

    if (error) {
      console.log('   ❌ Failed to create project:', error.message);
      throw error;
    }

    console.log('   ✅ Project created:', data.name);
    return data;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    throw err;
  }
}

/**
 * Step 2: Load all backup files for our run
 */
function loadBackupFiles() {
  console.log('\n2️⃣  Loading backup files...');

  const backups = [];

  // Load from "uploaded" directory
  const uploadedDir = path.join(BACKUP_BASE, 'prospects');
  if (fs.existsSync(uploadedDir)) {
    const files = fs.readdirSync(uploadedDir)
      .filter(f => f.endsWith('.json') && f.includes('2025-10-26'));

    for (const file of files) {
      const filePath = path.join(uploadedDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (content.run_id === RUN_ID) {
        backups.push({ file, path: filePath, data: content, status: 'uploaded' });
      }
    }
  }

  // Load from "failed-uploads" directory
  const failedDir = path.join(BACKUP_BASE, 'failed-uploads');
  if (fs.existsSync(failedDir)) {
    const files = fs.readdirSync(failedDir)
      .filter(f => f.endsWith('.json') && f.includes('2025-10-26'));

    for (const file of files) {
      const filePath = path.join(failedDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (content.run_id === RUN_ID) {
        backups.push({ file, path: filePath, data: content, status: 'failed' });
      }
    }
  }

  console.log(`   ✅ Found ${backups.length} backup files for run ${RUN_ID}`);
  console.log(`      Uploaded: ${backups.filter(b => b.status === 'uploaded').length}`);
  console.log(`      Failed: ${backups.filter(b => b.status === 'failed').length}`);

  return backups;
}

/**
 * Step 3: Insert prospects into database
 */
async function insertProspects(backups) {
  console.log('\n3️⃣  Inserting prospects into database...');

  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  for (const backup of backups) {
    const prospectData = backup.data.data || backup.data;

    try {
      // Check if prospect already exists
      let existingProspect = null;

      // Try to find by database_id (if marked as uploaded)
      if (backup.data.database_id) {
        const { data } = await supabase
          .from('prospects')
          .select('id, company_name')
          .eq('id', backup.data.database_id)
          .single();

        existingProspect = data;
      }

      // If not found by ID, try by google_place_id
      if (!existingProspect && prospectData.google_place_id) {
        const { data } = await supabase
          .from('prospects')
          .select('id, company_name')
          .eq('google_place_id', prospectData.google_place_id)
          .single();

        existingProspect = data;
      }

      if (existingProspect) {
        console.log(`   ⏭️  ${prospectData.company_name} - Already exists (${existingProspect.id})`);
        results.skipped++;
        // Store the existing ID for linking later
        backup.prospectId = existingProspect.id;
      } else {
        // Insert new prospect
        const insertData = {
          company_name: prospectData.company_name,
          industry: prospectData.industry,
          website: prospectData.website,
          website_status: prospectData.website_status || 'active',
          city: prospectData.city,
          state: prospectData.state,
          address: prospectData.address,
          contact_email: prospectData.contact_email,
          contact_phone: prospectData.contact_phone,
          contact_name: prospectData.contact_name,
          description: prospectData.description,
          services: prospectData.services,
          google_place_id: prospectData.google_place_id,
          google_rating: prospectData.google_rating,
          google_review_count: prospectData.google_review_count,
          most_recent_review_date: prospectData.most_recent_review_date,
          social_profiles: prospectData.social_profiles,
          social_metadata: prospectData.social_metadata,
          icp_match_score: prospectData.icp_match_score,
          is_relevant: prospectData.is_relevant,
          icp_brief_snapshot: prospectData.icp_brief_snapshot,
          status: prospectData.status || 'ready_for_analysis',
          run_id: prospectData.run_id,
          source: prospectData.source || 'prospecting-engine',
          discovery_cost: prospectData.discovery_cost,
          discovery_time_ms: prospectData.discovery_time_ms,
          models_used: prospectData.models_used,
          prompts_snapshot: prospectData.prompts_snapshot
        };

        const { data: inserted, error } = await supabase
          .from('prospects')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.log(`   ❌ ${prospectData.company_name} - Failed: ${error.message}`);
          results.errors++;
        } else {
          console.log(`   ✅ ${prospectData.company_name} - Inserted (${inserted.id})`);
          results.inserted++;
          backup.prospectId = inserted.id;
        }
      }
    } catch (err) {
      console.log(`   ❌ ${prospectData.company_name} - Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log(`\n   Summary:`);
  console.log(`     Inserted: ${results.inserted}`);
  console.log(`     Skipped (already exist): ${results.skipped}`);
  console.log(`     Errors: ${results.errors}`);

  return backups;
}

/**
 * Step 4: Link prospects to project
 */
async function linkProspectsToProject(projectId, backups) {
  console.log('\n4️⃣  Linking prospects to project...');

  const results = {
    linked: 0,
    skipped: 0,
    errors: 0
  };

  for (const backup of backups) {
    if (!backup.prospectId) {
      console.log(`   ⚠️  ${backup.data.company_name || 'Unknown'} - No prospect ID, skipping`);
      continue;
    }

    const prospectData = backup.data.data || backup.data;

    try {
      // Check if link already exists
      const { data: existingLink } = await supabase
        .from('project_prospects')
        .select('id')
        .eq('project_id', projectId)
        .eq('prospect_id', backup.prospectId)
        .single();

      if (existingLink) {
        console.log(`   ⏭️  ${prospectData.company_name} - Already linked`);
        results.skipped++;
      } else {
        // Create link
        const linkData = {
          project_id: projectId,
          prospect_id: backup.prospectId,
          run_id: RUN_ID,
          icp_brief_snapshot: prospectData.icp_brief_snapshot,
          prompts_snapshot: prospectData.prompts_snapshot,
          model_selections_snapshot: prospectData.models_used,
          relevance_reasoning: `ICP match score: ${prospectData.icp_match_score}/100`,
          discovery_cost_usd: prospectData.discovery_cost,
          discovery_time_ms: prospectData.discovery_time_ms
        };

        const { error } = await supabase
          .from('project_prospects')
          .insert(linkData);

        if (error) {
          console.log(`   ❌ ${prospectData.company_name} - Link failed: ${error.message}`);
          results.errors++;
        } else {
          console.log(`   ✅ ${prospectData.company_name} - Linked to project`);
          results.linked++;
        }
      }
    } catch (err) {
      console.log(`   ❌ ${prospectData.company_name} - Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log(`\n   Summary:`);
  console.log(`     Linked: ${results.linked}`);
  console.log(`     Skipped (already linked): ${results.skipped}`);
  console.log(`     Errors: ${results.errors}`);
}

/**
 * Step 5: Verify final state
 */
async function verifyRecovery(projectId) {
  console.log('\n5️⃣  Verifying recovery...');

  try {
    // Count prospects in database
    const { count: prospectCount } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', RUN_ID);

    console.log(`   Prospects in database: ${prospectCount}`);

    // Count project links
    const { count: linkCount } = await supabase
      .from('project_prospects')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    console.log(`   Project links: ${linkCount}`);

    // Get sample prospects
    const { data: sampleProspects } = await supabase
      .from('prospects')
      .select('company_name, city, google_rating, icp_match_score')
      .eq('run_id', RUN_ID)
      .limit(5);

    if (sampleProspects && sampleProspects.length > 0) {
      console.log(`\n   Sample prospects:`);
      sampleProspects.forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.company_name} (${p.city}) - Rating: ${p.google_rating}, ICP: ${p.icp_match_score}/100`);
      });
    }

    console.log('\n   ✅ Recovery verification complete!');

    if (prospectCount === 20 && linkCount === 20) {
      console.log('   🎉 All 20 prospects recovered successfully!');
    } else {
      console.log(`   ⚠️  Expected 20 prospects and 20 links, found ${prospectCount} and ${linkCount}`);
    }
  } catch (err) {
    console.log('   ❌ Verification error:', err.message);
  }
}

/**
 * Main recovery process
 */
async function recoverProspects() {
  try {
    // Step 1: Create project
    const project = await createTestProject();

    // Step 2: Load backups
    const backups = loadBackupFiles();

    if (backups.length === 0) {
      console.log('\n❌ No backup files found for this run. Cannot recover.\n');
      return;
    }

    // Step 3: Insert prospects
    await insertProspects(backups);

    // Step 4: Link to project
    await linkProspectsToProject(project.id, backups);

    // Step 5: Verify
    await verifyRecovery(project.id);

    console.log('\n' + '='.repeat(70));
    console.log('✅ RECOVERY COMPLETE');
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ RECOVERY FAILED');
    console.log('='.repeat(70));
    console.log(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

// Run recovery
recoverProspects();
