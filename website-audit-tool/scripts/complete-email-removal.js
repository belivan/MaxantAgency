#!/usr/bin/env node

/**
 * COMPLETE Email Code Removal Script
 *
 * This script performs the refactor that was documented but never executed.
 * Removes ~435 lines of email-related code from analyzer.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const analyzerPath = path.join(__dirname, '../analyzer.js');

console.log('🔧 COMPLETE EMAIL CODE REMOVAL\n');
console.log('This will remove ~435 lines of email-related code from analyzer.js');
console.log('='.repeat(60));

// Read the file
let content = fs.readFileSync(analyzerPath, 'utf8');
const originalLength = content.split('\n').length;

console.log(`\n📄 Original file: ${originalLength} lines\n`);

// Step 1: Remove imports
console.log('Step 1: Removing email-related imports...');
content = content.replace(/import { createDraft } from '.\/modules\/drafts-gmail\.js';\n/g, '');
content = content.replace(/import { sanitizeHumanizedEmail, replacePlaceholders } from '.\/modules\/email-sanitizer\.js';\n/g, '');
console.log('✅ Removed email imports');

// Step 2: Remove helper functions (work backwards from end of file)
console.log('\nStep 2: Removing email function definitions...');

// Remove generateEmail() function (lines 1613-1747)
const generateEmailRegex = /\/\/ ═+\n\/\/ EMAIL TEMPLATE GENERATION[\s\S]*?function generateEmail\([\s\S]*?\n}\n/;
if (generateEmailRegex.test(content)) {
  content = content.replace(generateEmailRegex, '');
  console.log('✅ Removed generateEmail() function');
} else {
  console.log('⚠️  generateEmail() function not found (may already be removed)');
}

// Remove qaReviewEmail() function (lines 951-1058)
const qaReviewRegex = /\/\/ ═+\n\/\/ QA REVIEW AGENT[\s\S]*?async function qaReviewEmail\([\s\S]*?\n}\n/;
if (qaReviewRegex.test(content)) {
  content = content.replace(qaReviewRegex, '');
  console.log('✅ Removed qaReviewEmail() function');
} else {
  console.log('⚠️  qaReviewEmail() function not found');
}

// Remove generateCritiqueReasoning() function (lines 885-932)
const critiqueReasoningRegex = /\/\/ ═+\n\/\/ CRITIQUE REASONING AGENT[\s\S]*?async function generateCritiqueReasoning\([\s\S]*?\n}\n/;
if (critiqueReasoningRegex.test(content)) {
  content = content.replace(critiqueReasoningRegex, '');
  console.log('✅ Removed generateCritiqueReasoning() function');
} else {
  console.log('⚠️  generateCritiqueReasoning() function not found');
}

// Remove humanizeEmailWithAI() function (lines 466-878)
const humanizeRegex = /\/\/ ═+\n\/\/ EMAIL HUMANIZATION AGENT[\s\S]*?async function humanizeEmailWithAI\([\s\S]*?\n}\n/;
if (humanizeRegex.test(content)) {
  content = content.replace(humanizeRegex, '');
  console.log('✅ Removed humanizeEmailWithAI() function');
} else {
  console.log('⚠️  humanizeEmailWithAI() function not found');
}

// Remove extractContactInfo() function (lines 416-460)
const extractContactRegex = /\/\/ ═+\n\/\/ EXTRACT CONTACT INFO[\s\S]*?function extractContactInfo\([\s\S]*?\n}\n/;
if (extractContactRegex.test(content)) {
  content = content.replace(extractContactRegex, '');
  console.log('✅ Removed extractContactInfo() function');
} else {
  console.log('⚠️  extractContactInfo() function not found');
}

// Step 3: Fix folder structure (lead-${grade} → grade-${websiteGrade})
console.log('\nStep 3: Fixing folder structure...');

// Find the section with leadGrade and folder creation
content = content.replace(
  /\/\/ ═+\n\s*\/\/ FOLDER ORGANIZATION: Use LEAD GRADE \(from QA Agent\)\n\s*\/\/ ═+\n\s*const leadGrade = result\.emailQA\?\.leadGrade.*?\n\s*const folderPath = path\.join\(__dirname, 'analysis-results', `lead-\$\{leadGrade\}`,/,
  `// ${'═'.repeat(67)}\n    // FOLDER ORGANIZATION: Use WEBSITE GRADE (Data Completeness)\n    // ${'═'.repeat(67)}\n    const folderPath = path.join(__dirname, 'analysis-results', \`grade-\${websiteGrade}\`,`
);

// Fix console.log with folder path
content = content.replace(/lead-\$\{leadGrade\}/g, 'grade-${websiteGrade}');

console.log('✅ Changed folder structure from lead-${grade} to grade-${websiteGrade}');

// Step 4: Remove email file writes (lines 209-261)
console.log('\nStep 4: Removing email file writes...');

const emailFileWritesRegex = /\/\/ 3\. Save email content\n\s*if \(result\.email\) \{[\s\S]*?\/\/ 3c\. Save QA review.*?\n\s*\}\n\s*\}/;
if (emailFileWritesRegex.test(content)) {
  content = content.replace(emailFileWritesRegex, '');
  console.log('✅ Removed email.txt, critique-reasoning.txt, qa-review.txt file writes');
} else {
  console.log('⚠️  Email file write section not found');
}

// Step 5: Remove email workflow in analyzeWebsite function
console.log('\nStep 5: Removing email generation workflow...');

// Remove "Step 10: Generate email" section
content = content.replace(/\/\/ Step 10: Generate email\n\s*sendProgress\(\{[\s\S]*?\}\);\n\n\s*let email = generateEmail\([\s\S]*?\n/g, '');

// Remove contactInfo extraction
content = content.replace(/\/\/ Extract contact info from the main website analysis.*?\n\s*const contactInfo = extractContactInfo\(combinedAnalysis\);\n/g, '');

// Remove placeholder replacement block
content = content.replace(/\/\/ Replace placeholders BEFORE humanization.*?\n\s*const domain = new URL\(url\)\.hostname;[\s\S]*?email = replacePlaceholders\(email,[\s\S]*?\}\);\n/g, '');

// Remove humanization block
content = content.replace(/\/\/ Optionally humanize the email with AI.*?\n\s*if \(!options\.skipHumanize\) \{[\s\S]*?\n\s*\}\n/g, '');

// Remove sanitizer block
content = content.replace(/\/\/ Apply sanitizer if enabled.*?\n\s*if \(useSanitizer && sanitizerMode === 'full'\) \{[\s\S]*?\n\s*\}\n/g, '');

// Remove QA Review block
content = content.replace(/\/\/ QA Review Agent - Validate email quality before saving\n\s*let qaReview = null;\n\s*if \(!options\.skipQA && email\) \{[\s\S]*?\n\s*\}\n/g, '');

// Remove draft creation block
content = content.replace(/\/\/ Create Gmail draft if enabled.*?\n\s*let draftResult = null;\n\s*if \(options\.saveToDrafts.*?\) \{[\s\S]*?\n\s*\}\n/g, '');

// Remove email template generated message
content = content.replace(/sendProgress\(\{\s*type: 'step',\s*step: 'email_generated',[\s\S]*?Email template generated.*?\}\);\n/g, '');

// Remove critique reasoning generation
content = content.replace(/\/\/ Generate critique reasoning.*?\n\s*let critiqueReasoning = null;\n\s*if \(critique &&[\s\S]*?\n\s*\}\n/g, '');

console.log('✅ Removed email generation workflow');

// Step 6: Remove email fields from result object
console.log('\nStep 6: Removing email fields from result object...');

content = content.replace(/,?\s*email: email,?\n/g, '\n');
content = content.replace(/,?\s*emailQA: qaReview \|\| null,?\n/g, '\n');
content = content.replace(/,?\s*draft: draftResult,?\n/g, '\n');
content = content.replace(/,?\s*critiqueReasoning: critiqueReasoning,?\n/g, '\n');
content = content.replace(/,?\s*leadGrade: leadGrade,?\n/g, '\n');
content = content.replace(/,?\s*result\.leadGrade = leadGrade;?\n/g, '\n');

console.log('✅ Removed email fields from result object');

// Step 7: Remove email operations from cost tracking
console.log('\nStep 7: Removing email operations from cost breakdown...');

content = content.replace(/,?\s*emailWriting: true,?\n/g, '\n');
content = content.replace(/,?\s*critiqueReasoning: true,?\n/g, '\n');
content = content.replace(/,?\s*qaReview: true,?\n/g, '\n');

console.log('✅ Removed email cost tracking operations');

// Step 8: Remove emailSent field
content = content.replace(/,?\s*emailSent:.*?,?\n/g, '\n');

// Step 9: Clean up extra blank lines (more than 2 consecutive)
content = content.replace(/\n\n\n+/g, '\n\n');

console.log('✅ Cleaned up formatting');

// Write the updated file
fs.writeFileSync(analyzerPath, content, 'utf8');

const newLength = content.split('\n').length;
const linesRemoved = originalLength - newLength;

console.log('\n' + '='.repeat(60));
console.log('✅ EMAIL CODE REMOVAL COMPLETE\n');
console.log(`Original: ${originalLength} lines`);
console.log(`New:      ${newLength} lines`);
console.log(`Removed:  ${linesRemoved} lines (${((linesRemoved / originalLength) * 100).toFixed(1)}%)\n`);

console.log('Next steps:');
console.log('1. Run: node -c analyzer.js (verify syntax)');
console.log('2. Run: node scripts/test-codebase-integrity.js (verify all tests pass)');
console.log('3. Test analyze a website to ensure it works\n');
