/**
 * NOTION SCHEMA SETUP
 *
 * Automatically adds missing properties to Notion database
 * Run this once to ensure your Notion database has all required properties
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Define all properties we want in the Notion database
 */
const REQUIRED_PROPERTIES = {
  // Existing properties
  'Company': {
    title: {}
  },
  'Subject': {
    rich_text: {}
  },
  'Body': {
    rich_text: {}
  },
  'Website': {
    url: {}
  },
  'Status': {
    select: {
      options: [
        { name: 'Pending', color: 'yellow' },
        { name: 'Ready', color: 'blue' },
        { name: 'Approved', color: 'green' },
        { name: 'Sent', color: 'purple' },
        { name: 'Rejected', color: 'red' },
        { name: 'Failed', color: 'red' }
      ]
    }
  },
  'Type': {
    select: {
      options: [
        { name: 'Email', color: 'blue' },
        { name: 'Social DM', color: 'pink' }
      ]
    }
  },
  'Platform': {
    select: {
      options: [
        { name: 'Email', color: 'blue' },
        { name: 'Instagram', color: 'pink' },
        { name: 'Facebook', color: 'blue' },
        { name: 'LinkedIn', color: 'blue' },
        { name: 'Twitter', color: 'gray' }
      ]
    }
  },
  'Strategy': {
    select: {
      options: [
        // Email strategies
        { name: 'Compliment Sandwich', color: 'green' },
        { name: 'Problem First', color: 'orange' },
        { name: 'Problem Agitation', color: 'red' },
        { name: 'Industry Insight', color: 'purple' },
        // Social DM strategies
        { name: 'Value First', color: 'blue' },
        { name: 'Compliment Question', color: 'green' },
        { name: 'Casual Introduction', color: 'pink' },
        { name: 'Quick Win', color: 'yellow' }
      ]
    }
  },
  'Grade': {
    select: {
      options: [
        { name: 'A', color: 'green' },
        { name: 'B', color: 'blue' },
        { name: 'C', color: 'yellow' },
        { name: 'D', color: 'orange' },
        { name: 'F', color: 'red' }
      ]
    }
  },
  'Industry': {
    multi_select: {
      options: [
        { name: 'Restaurant', color: 'orange' },
        { name: 'Legal Services', color: 'blue' },
        { name: 'Dentistry', color: 'green' },
        { name: 'Healthcare', color: 'red' },
        { name: 'Real Estate', color: 'purple' },
        { name: 'Retail', color: 'pink' },
        { name: 'Professional Services', color: 'gray' }
      ]
    }
  },
  'Score': {
    number: {
      format: 'number'
    }
  },
  'Cost': {
    number: {
      format: 'dollar'
    }
  },

  // NEW properties to add
  'Contact Email': {
    email: {}
  },
  'Contact Name': {
    rich_text: {}
  },
  'Website Grade': {
    select: {
      options: [
        { name: 'A', color: 'green' },
        { name: 'B', color: 'blue' },
        { name: 'C', color: 'yellow' },
        { name: 'D', color: 'orange' },
        { name: 'F', color: 'red' }
      ]
    }
  },
  'Top Issue': {
    rich_text: {}
  },
  'City': {
    rich_text: {}
  },
  'AI Model': {
    select: {
      options: [
        { name: 'claude-haiku-3-5', color: 'blue' },
        { name: 'claude-sonnet-4-5', color: 'purple' }
      ]
    }
  },
  'Generation Time (ms)': {
    number: {
      format: 'number'
    }
  },
  'Email ID': {
    rich_text: {}
  },

  // Social DM specific properties
  'Character Count': {
    number: {
      format: 'number'
    }
  },
  'Platform Limit': {
    number: {
      format: 'number'
    }
  },
  'Social Profile': {
    url: {}
  },
  'Sent Via': {
    select: {
      options: [
        { name: 'Manual', color: 'yellow' },
        { name: 'Automated', color: 'green' },
        { name: 'Pending', color: 'gray' }
      ]
    }
  },

  'Created At': {
    date: {}
  },

  // A/B TESTING VARIANT OPTIONS
  'Has Variants': {
    checkbox: {}
  },
  'Subject Variant 1': {
    rich_text: {}
  },
  'Subject Variant 2': {
    rich_text: {}
  },
  'Subject Variant 3': {
    rich_text: {}
  },
  'Body Variant 1': {
    rich_text: {}
  },
  'Body Variant 2': {
    rich_text: {}
  },
  'Body Variant 3': {
    rich_text: {}
  },
  'AI Recommendation': {
    rich_text: {}
  },
  'Variant Reasoning': {
    rich_text: {}
  }
};

/**
 * Get current database schema
 */
async function getCurrentSchema() {
  try {
    const database = await notion.databases.retrieve({
      database_id: DATABASE_ID
    });

    console.log('\n📋 Current Notion Database Schema:');
    console.log(`   Title: ${database.title[0]?.plain_text || 'Untitled'}`);

    const properties = database.properties || {};
    console.log(`   Properties: ${Object.keys(properties).length}`);
    console.log('');

    return properties;
  } catch (error) {
    throw new Error(`Failed to retrieve database: ${error.message}`);
  }
}

/**
 * Add missing properties to database
 */
async function updateDatabaseSchema(dryRun = true) {
  try {
    console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '🚀 LIVE MODE'} - ${dryRun ? 'Checking' : 'Updating'} database schema...\n`);

    // Get current schema
    const currentProperties = await getCurrentSchema();
    const currentPropertyNames = Object.keys(currentProperties);

    // Find missing properties
    const missingProperties = Object.keys(REQUIRED_PROPERTIES).filter(
      propName => !currentPropertyNames.includes(propName)
    );

    if (missingProperties.length === 0) {
      console.log('✅ All properties already exist! Nothing to add.\n');
      return { added: 0, existing: currentPropertyNames.length };
    }

    console.log(`📊 Found ${missingProperties.length} missing properties:\n`);
    missingProperties.forEach((prop, i) => {
      console.log(`   ${i + 1}. ${prop} (${Object.keys(REQUIRED_PROPERTIES[prop])[0]})`);
    });
    console.log('');

    if (dryRun) {
      console.log('⚠️  DRY RUN - No changes made');
      console.log('💡 Run with dryRun=false to actually add these properties\n');
      return { added: 0, existing: currentPropertyNames.length, missing: missingProperties };
    }

    // Build update payload with only new properties
    const propertiesToAdd = {};
    missingProperties.forEach(propName => {
      propertiesToAdd[propName] = REQUIRED_PROPERTIES[propName];
    });

    console.log('🔄 Adding properties to Notion database...\n');

    const response = await notion.databases.update({
      database_id: DATABASE_ID,
      properties: propertiesToAdd
    });

    console.log(`✅ Successfully added ${missingProperties.length} properties!\n`);

    // Verify by fetching updated schema
    const updatedProperties = await getCurrentSchema();
    const updatedCount = Object.keys(updatedProperties).length;

    console.log(`📊 Database now has ${updatedCount} total properties\n`);

    return {
      added: missingProperties.length,
      existing: currentPropertyNames.length,
      total: updatedCount
    };

  } catch (error) {
    throw new Error(`Failed to update database: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔧 NOTION DATABASE SCHEMA SETUP');
  console.log('═══════════════════════════════════════════════════════════════════');

  try {
    // First, do a dry run
    const dryRunResult = await updateDatabaseSchema(true);

    // If there are missing properties, ask to continue
    if (dryRunResult.missing && dryRunResult.missing.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('⚠️  READY TO ADD PROPERTIES');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('\nTo actually add these properties, run:');
      console.log('  node integrations/notion-schema-setup.js --live\n');
    }

    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running in live mode
const isLive = process.argv.includes('--live');

if (isLive) {
  console.log('\n⚠️  RUNNING IN LIVE MODE - WILL MODIFY NOTION DATABASE\n');
  updateDatabaseSchema(false).then(() => {
    console.log('✅ Done!\n');
  }).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
} else {
  main();
}

export { updateDatabaseSchema, getCurrentSchema, REQUIRED_PROPERTIES };
