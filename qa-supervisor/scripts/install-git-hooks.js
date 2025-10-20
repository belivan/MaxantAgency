#!/usr/bin/env node

/**
 * Git Hooks Installer
 *
 * Installs pre-commit hook that runs QA checks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const gitHooksDir = path.join(projectRoot, '.git', 'hooks');
const preCommitPath = path.join(gitHooksDir, 'pre-commit');

// Pre-commit hook content
const preCommitHook = `#!/bin/sh
#
# Pre-commit hook for QA Supervisor
# Runs quick security checks before allowing commit
#

echo "🔒 Running pre-commit QA checks..."
echo ""

cd qa-supervisor && npm run qa:pre-commit

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Pre-commit checks failed!"
  echo "Fix the issues or use 'git commit --no-verify' to skip."
  exit 1
fi

echo ""
echo "✅ Pre-commit checks passed!"
exit 0
`;

// Install hook
try {
  // Check if .git directory exists
  if (!fs.existsSync(gitHooksDir)) {
    console.log('❌ .git/hooks directory not found');
    console.log('   Make sure you are in a git repository');
    process.exit(1);
  }

  // Check if pre-commit already exists
  if (fs.existsSync(preCommitPath)) {
    console.log('⚠️  Pre-commit hook already exists');
    console.log('   Backing up to pre-commit.backup');

    const backupPath = path.join(gitHooksDir, 'pre-commit.backup');
    fs.copyFileSync(preCommitPath, backupPath);
  }

  // Write hook
  fs.writeFileSync(preCommitPath, preCommitHook, { mode: 0o755 });

  console.log('✅ Pre-commit hook installed successfully!');
  console.log('');
  console.log('The hook will run automatically before each commit.');
  console.log('To skip the hook, use: git commit --no-verify');
  console.log('');
  console.log('Hook location:', preCommitPath);

  process.exit(0);

} catch (error) {
  console.error('❌ Failed to install hook:', error.message);
  process.exit(1);
}
