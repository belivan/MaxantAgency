/**
 * Migrate prompts from flat files to folder-based structure
 *
 * Before: config/prompts/web-design/desktop-visual-analysis.json
 * After:  config/prompts/web-design/desktop-visual-analysis/base.json
 */

import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'config', 'prompts', 'web-design');

const PROMPT_FILES = [
  'desktop-visual-analysis.json',
  'mobile-visual-analysis.json',
  'unified-visual-analysis.json',
  'seo-analysis.json',
  'content-analysis.json',
  'unified-technical-analysis.json',
  'social-analysis.json',
  'accessibility-analysis.json'
];

async function migratePrompts() {
  console.log('\n🔄 Migrating prompts to folder-based structure...\n');

  for (const promptFile of PROMPT_FILES) {
    const oldPath = path.join(PROMPTS_DIR, promptFile);
    const promptName = promptFile.replace('.json', '');
    const newDir = path.join(PROMPTS_DIR, promptName);
    const newPath = path.join(newDir, 'base.json');

    try {
      // Check if old file exists
      const exists = await fs.access(oldPath).then(() => true).catch(() => false);

      if (!exists) {
        console.log(`⏭️  ${promptFile} - Already migrated or doesn't exist`);
        continue;
      }

      // Check if already migrated
      const dirExists = await fs.access(newDir).then(() => true).catch(() => false);

      if (dirExists) {
        console.log(`✅ ${promptName}/ - Already migrated`);
        continue;
      }

      // Create new directory
      await fs.mkdir(newDir, { recursive: true });

      // Move file to base.json
      const content = await fs.readFile(oldPath, 'utf-8');
      await fs.writeFile(newPath, content);

      // Keep backup of original
      const backupPath = path.join(PROMPTS_DIR, `${promptFile}.backup`);
      await fs.copyFile(oldPath, backupPath);

      // Remove original
      await fs.unlink(oldPath);

      console.log(`✅ ${promptName}/ - Migrated successfully`);
      console.log(`   ${oldPath}`);
      console.log(`   → ${newPath}`);
      console.log(`   (backup: ${backupPath})`);

    } catch (error) {
      console.error(`❌ ${promptFile} - Failed:`, error.message);
    }
  }

  console.log('\n✅ Migration complete!\n');
  console.log('Next steps:');
  console.log('1. Test that analyzers still work');
  console.log('2. If everything works, delete .backup files');
  console.log('3. Commit the new folder structure to git\n');
}

migratePrompts().catch(console.error);
