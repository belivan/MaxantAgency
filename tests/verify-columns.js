/**
 * Verify Missing Columns Migration
 * Checks if the has_blog, content_insights, page_title, and meta_description columns exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyColumns() {
  console.log('🔍 Verifying leads table columns...\n');
  console.log('═'.repeat(60));

  try {
    // Try to insert a test record with all the columns
    const testData = {
      company_name: 'Column Test Company',
      url: `https://column-test-${Date.now()}.com`,
      industry: 'test',
      project_id: '00000000-0000-0000-0000-000000000000', // Will fail but that's ok
      website_grade: 'A',
      overall_score: 100,
      design_score: 100,
      seo_score: 100,
      content_score: 100,
      social_score: 100,
      has_blog: true,
      content_insights: { test: true },
      page_title: 'Test Page Title',
      meta_description: 'Test Meta Description'
    };

    console.log('Testing column existence with insert (will fail on FK but columns should be recognized)...\n');

    const { data, error } = await supabase
      .from('leads')
      .insert(testData)
      .select();

    if (error) {
      // Check if error is about foreign key (expected) or missing columns (problem)
      if (error.message.includes('Could not find')) {
        console.error('❌ COLUMN MISSING ERROR:');
        console.error(error.message);
        console.error('\nThe migration may not have run successfully.');
        return false;
      } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
        console.log('✅ All columns exist! (FK error is expected for this test)\n');
        console.log('Error message:', error.message);
        console.log('\nColumns verified:');
        console.log('  ✓ has_blog');
        console.log('  ✓ content_insights');
        console.log('  ✓ page_title');
        console.log('  ✓ meta_description');
        return true;
      } else {
        console.error('❌ Unexpected error:', error.message);
        return false;
      }
    } else {
      console.log('✅ Test record inserted successfully (unexpected!)');
      console.log('Record ID:', data[0].id);
      
      // Clean up test record
      await supabase.from('leads').delete().eq('id', data[0].id);
      console.log('✓ Test record cleaned up');
      return true;
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    console.log('\n' + '═'.repeat(60));
  }
}

verifyColumns()
  .then(success => {
    if (success) {
      console.log('\n✅ Migration verification complete - columns exist!');
      process.exit(0);
    } else {
      console.log('\n❌ Migration verification failed - columns may be missing');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Verification error:', error);
    process.exit(1);
  });
