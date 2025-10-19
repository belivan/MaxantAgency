/**
 * Complete Email Code Removal Script
 * This script removes ALL email generation code from analyzer.js
 */

const fs = require('fs');
const path = require('path');

const ANALYZER_PATH = path.join(__dirname, 'analyzer.js');
const BACKUP_PATH = path.join(__dirname, 'analyzer.js.backup');

console.log('🔧 Starting comprehensive email code removal...\n');

// Read the file
let content = fs.readFileSync(ANALYZER_PATH, 'utf8');
let originalLength = content.length;

// Step 1: Remove imports
console.log('Step 1: Removing email-related imports...');
content = content.replace(
  /import \{ createDraft \} from '\.\/modules\/drafts-gmail\.js';\n/g,
  ''
);
content = content.replace(
  /import \{ sanitizeHumanizedEmail, replacePlaceholders \} from '\.\/modules\/email-sanitizer\.js';\n/g,
  ''
);
console.log('✓ Removed email imports\n');

// Step 2: Remove function definitions by finding start and end
console.log('Step 2: Removing function definitions...');

// Helper to remove a function definition
function removeFunction(content, functionName) {
  // Find the function comment and declaration
  const commentRegex = new RegExp(`/\\*\\*[^]*?\\*/\\s*(?:async )?function ${functionName}\\([^)]*\\) \\{`, 'g');
  const match = commentRegex.exec(content);

  if (!match) {
    console.log(`  ⚠ Function ${functionName} not found`);
    return content;
  }

  const startIndex = match.index;

  // Find the closing brace by counting braces
  let braceCount = 1;
  let i = match.index + match[0].length;

  while (i < content.length && braceCount > 0) {
    if (content[i] === '{' && content[i-1] !== "'" && content[i+1] !== "'") {
      braceCount++;
    } else if (content[i] === '}' && content[i-1] !== "'" && content[i+1] !== "'") {
      braceCount--;
    }
    i++;
  }

  // Remove the function including trailing newlines
  const beforeFunc = content.substring(0, startIndex);
  const afterFunc = content.substring(i).replace(/^\n+/, '\n\n');

  console.log(`  ✓ Removed ${functionName} (${i - startIndex} chars)`);
  return beforeFunc + afterFunc;
}

// Remove all email functions
content = removeFunction(content, 'extractContactInfo');
content = removeFunction(content, 'humanizeEmailWithAI');
content = removeFunction(content, 'generateCritiqueReasoning');
content = removeFunction(content, 'qaReviewEmail');
content = removeFunction(content, 'generateEmail');

console.log('');

// Step 3: Remove email generation workflow from analyzeWebsite
console.log('Step 3: Removing email generation workflow...');

// Remove Step 10: Generate email section
content = content.replace(
  /\s*\/\/ Step 10: Generate email[\s\S]*?\/\/ Add result/m,
  '\n\n        // Add result'
);

console.log('✓ Removed email generation workflow\n');

// Step 4: Update folder structure (leadGrade -> websiteGrade)
console.log('Step 4: Updating folder structure...');
content = content.replace(
  /const leadGrade = result\.emailQA\?\.leadGrade.*?\n.*?const folderPath = path\.join\(__dirname, 'analysis-results', `lead-\$\{leadGrade\}`/s,
  "const folderPath = path.join(__dirname, 'analysis-results', `grade-${websiteGrade}`"
);
console.log('✓ Updated folder structure to use websiteGrade\n');

// Step 5: Remove email file writes
console.log('Step 5: Removing email file writes...');
content = content.replace(
  /\s*\/\/ 3\. Save email content[\s\S]*?\/\/ 4\. Save client info/m,
  '\n\n    // 3. Save client info'
);
console.log('✓ Removed email file writes\n');

// Step 6: Remove leadGrade from clientInfo
console.log('Step 6: Removing leadGrade from client info...');
content = content.replace(
  /leadGrade: leadGrade,\n/g,
  ''
);
console.log('✓ Removed leadGrade from clientInfo\n');

// Step 7: Remove email fields from result object
console.log('Step 7: Removing email fields from result object...');
content = content.replace(/email: email,\n/g, '');
content = content.replace(/emailQA: qaReview.*?,\n/g, '');
content = content.replace(/draft: draftResult,\n/g, '');
content = content.replace(/critiqueReasoning: reasoning,\n/g, '');
content = content.replace(/result\.critiqueReasoning = reasoning;\n/g, '');
console.log('✓ Removed email fields from result\n');

// Step 8: Remove email operations from cost breakdown
console.log('Step 8: Removing email operations from cost breakdown...');
content = content.replace(/cheapModel: '.*?',\n/g, '');
content = content.replace(/emailWriting: true,.*?\n/g, '');
content = content.replace(/critiqueReasoning: true,.*?\n/g, '');
content = content.replace(/qaReview: true,.*?\n/g, '');
console.log('✓ Removed email operations from cost breakdown\n');

// Step 9: Remove any remaining extractContactInfo calls
console.log('Step 9: Removing extractContactInfo calls...');
content = content.replace(/const contactInfo = extractContactInfo\(.*?\);\n/g, '');
console.log('✓ Removed extractContactInfo calls\n');

// Calculate reduction
const newLength = content.length;
const reduction = originalLength - newLength;
const reductionPercent = ((reduction / originalLength) * 100).toFixed(1);

console.log('═══════════════════════════════════════════════');
console.log(`📊 SUMMARY:`);
console.log(`   Original size: ${originalLength} chars`);
console.log(`   New size: ${newLength} chars`);
console.log(`   Removed: ${reduction} chars (${reductionPercent}%)`);
console.log('═══════════════════════════════════════════════\n');

// Write the modified content
fs.writeFileSync(ANALYZER_PATH, content);
console.log('✅ analyzer.js has been refactored!\n');

// Verify syntax
const { execSync } = require('child_process');
try {
  execSync('node -c analyzer.js', { cwd: __dirname, stdio: 'pipe' });
  console.log('✅ Syntax validation: PASSED\n');
} catch (error) {
  console.log('❌ Syntax validation: FAILED');
  console.log('   Error:', error.message);
  console.log('\n⚠️  Restoring from backup...');
  fs.copyFileSync(BACKUP_PATH, ANALYZER_PATH);
  console.log('✅ Restored analyzer.js from backup');
  process.exit(1);
}

console.log('🎉 Refactoring complete!');
