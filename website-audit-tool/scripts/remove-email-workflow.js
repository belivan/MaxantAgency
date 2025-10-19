#!/usr/bin/env node

/**
 * Remove Email Workflow Section
 * Removes all email generation workflow calls from analyzeWebsite()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const analyzerPath = path.join(__dirname, '../analyzer.js');

console.log('🔧 Removing email workflow from analyze Website()\n');

let content = fs.readFileSync(analyzerPath, 'utf8');
let lines = content.split('\n');

console.log(`📄 Current file: ${lines.length} lines\n`);

// Find and remove "Step 10: Generate email" section
const step10Start = lines.findIndex(l => l.includes('// Step 10: Generate email'));
if (step10Start !== -1) {
  console.log(`Found "Step 10: Generate email" at line ${step10Start + 1}`);

  // Find where this email section ends (before "Step 11" or before cost calculation)
  let step10End = -1;
  for (let i = step10Start + 1; i < lines.length; i++) {
    if (lines[i].includes('// Step') ||
        lines[i].includes('// Calculate cost breakdown') ||
        lines[i].includes('const modulesUsed = []')) {
      step10End = i;
      break;
    }
  }

  if (step10End !== -1) {
    console.log(`Email workflow ends at line ${step10End}`);
    const removed = step10End - step10Start;
    lines.splice(step10Start, removed);
    console.log(`✅ Removed ${removed} lines of email workflow\n`);
  }
}

// Remove any remaining references
let removedCount = 0;

// Remove email-related variables and their assignments
const emailPatterns = [
  /^\s*let email = generateEmail\(/,
  /^\s*const contactInfo = extractContactInfo\(/,
  /^\s*email = replacePlaceholders\(/,
  /^\s*const humanized = await humanizeEmailWithAI\(/,
  /^\s*const sanitized = sanitizeHumanizedEmail\(/,
  /^\s*qaReview = await qaReviewEmail\(/,
  /^\s*draftResult = await createDraft\(/,
  /^\s*const reasoning = await generateCritiqueReasoning\(/,
  /^\s*let qaReview = null;/,
  /^\s*let draftResult = null;/,
  /^\s*let critiqueReasoning = null;/,
];

lines = lines.filter(line => {
  for (const pattern of emailPatterns) {
    if (pattern.test(line)) {
      removedCount++;
      return false;
    }
  }
  return true;
});

console.log(`✅ Removed ${removedCount} additional email-related lines\n`);

// Remove email fields from result object
lines = lines.map(line => {
  if (line.includes('email: email,') ||
      line.includes('emailQA: qaReview') ||
      line.includes('draft: draftResult') ||
      line.includes('critiqueReasoning:')) {
    return '';
  }
  return line;
});

// Remove empty lines (more than 2 consecutive)
const finalContent = lines.join('\n').replace(/\n\n\n+/g, '\n\n');

fs.writeFileSync(analyzerPath, finalContent, 'utf8');

const finalLines = finalContent.split('\n');
console.log(`📄 Final file: ${finalLines.length} lines\n`);
console.log('✅ Email workflow removed!\n');
console.log('Next: node -c analyzer.js to verify syntax');
