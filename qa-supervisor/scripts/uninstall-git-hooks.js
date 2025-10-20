#!/usr/bin/env node

/**
 * Git Hooks Uninstaller
 *
 * Removes pre-commit hook
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const gitHooksDir = path.join(projectRoot, '.git', 'hooks');
const preCommitPath = path.join(gitHooksDir, 'pre-commit');
const backupPath = path.join(gitHooksDir, 'pre-commit.backup');

try {
  // Check if hook exists
  if (!fs.existsSync(preCommitPath)) {
    console.log('ℹ️  No pre-commit hook found');
    process.exit(0);
  }

  // Remove hook
  fs.unlinkSync(preCommitPath);
  console.log('✅ Pre-commit hook removed');

  // Restore backup if it exists
  if (fs.existsSync(backupPath)) {
    fs.renameSync(backupPath, preCommitPath);
    console.log('✅ Previous hook restored from backup');
  }

  process.exit(0);

} catch (error) {
  console.error('❌ Failed to uninstall hook:', error.message);
  process.exit(1);
}
