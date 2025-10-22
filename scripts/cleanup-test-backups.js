#!/usr/bin/env node

/**
 * Cleanup Test Backups
 *
 * Removes all test backups created during automated testing
 */

import { readdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LEADS_DIR = join(__dirname, 'local-backups', 'analysis-engine', 'leads');
const FAILED_DIR = join(__dirname, 'local-backups', 'analysis-engine', 'failed-uploads');

// Test company names to look for
const TEST_COMPANIES = [
  'Anthropic Test',
  'OpenAI Test',
  'Google Test',
  'Forced Fail Test',
  'Old Format Test',
  'Automated Fail Test',
  'Test Company'
];

async function cleanupDirectory(dir, dirName) {
  if (!existsSync(dir)) {
    console.log(`⏭️  Skipping ${dirName} (directory doesn't exist)`);
    return 0;
  }

  const files = await readdir(dir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  let deleted = 0;

  for (const file of jsonFiles) {
    try {
      const filepath = join(dir, file);
      const content = await readFile(filepath, 'utf-8');
      const backup = JSON.parse(content);

      // Check if this is a test backup
      const isTest = TEST_COMPANIES.some(testName =>
        backup.company_name?.toLowerCase().includes(testName.toLowerCase()) ||
        file.toLowerCase().includes('test')
      );

      if (isTest) {
        await unlink(filepath);
        console.log(`   ✅ Deleted: ${file} (${backup.company_name})`);
        deleted++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }
  }

  return deleted;
}

async function cleanup() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  CLEANUP TEST BACKUPS                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Scanning for test backups...\n');

  console.log('📂 Leads directory:');
  const leadsDeleted = await cleanupDirectory(LEADS_DIR, 'leads');

  console.log('\n📂 Failed uploads directory:');
  const failedDeleted = await cleanupDirectory(FAILED_DIR, 'failed-uploads');

  const total = leadsDeleted + failedDeleted;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('CLEANUP SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Deleted from leads:         ${leadsDeleted}`);
  console.log(`Deleted from failed-uploads: ${failedDeleted}`);
  console.log(`Total deleted:              ${total}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (total > 0) {
    console.log(`✅ Cleaned up ${total} test backup(s)\n`);
  } else {
    console.log('ℹ️  No test backups found to clean up\n');
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
