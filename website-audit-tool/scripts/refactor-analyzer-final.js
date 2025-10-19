#!/usr/bin/env node

/**
 * FINAL Email Code Removal - Production Quality
 *
 * This script carefully removes all email-related code from analyzer.js
 * while preserving all data collection functionality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const analyzerPath = path.join(__dirname, '../analyzer.js');
const backupPath = path.join(__dirname, '../analyzer.js.pre-refactor');

console.log('🔧 FINAL ANALYZER.JS REFACTOR\n');
console.log('Removing all email generation code...\n');
console.log('='.repeat(60));

// Create backup
fs.copyFileSync(analyzerPath, backupPath);
console.log(`\n✅ Backup created: analyzer.js.pre-refactor\n`);

// Read file as lines for precise manipulation
let lines = fs.readFileSync(analyzerPath, 'utf8').split('\n');
const originalLineCount = lines.length;

console.log(`📄 Original file: ${originalLineCount} lines\n`);

// Track what we're removing
let removedSections = [];

function removeLines(startLine, endLine, description) {
  const start = startLine - 1; // Convert to 0-based
  const end = endLine; // End is exclusive
  const count = end - start;

  lines.splice(start, count);
  removedSections.push({ description, lines: count, range: `${startLine}-${endLine}` });

  console.log(`✅ Removed: ${description} (lines ${startLine}-${endLine}, ${count} lines)`);
}

// STEP 1: Remove function definitions (working from bottom to top to preserve line numbers)
console.log('STEP 1: Removing function definitions...\n');

// Find and remove generateEmail() - around line 1613
let generateEmailStart = lines.findIndex((line, idx) =>
  idx > 1600 && line.includes('function generateEmail('));
if (generateEmailStart !== -1) {
  // Find the end of the function
  let braceCount = 0;
  let inFunction = false;
  let generateEmailEnd = generateEmailStart;

  for (let i = generateEmailStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('function generateEmail(')) inFunction = true;

    if (inFunction) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      // Function ends when braces balance
      if (braceCount === 0 && i > generateEmailStart) {
        generateEmailEnd = i + 1;
        break;
      }
    }
  }

  // Also remove the comment header above it
  while (generateEmailStart > 0 && (lines[generateEmailStart - 1].trim().startsWith('//') || lines[generateEmailStart - 1].trim().startsWith('═'))) {
    generateEmailStart--;
  }

  removeLines(generateEmailStart + 1, generateEmailEnd, 'generateEmail() function');
}

// Find and remove qaReviewEmail() - around line 951
let qaReviewStart = lines.findIndex((line, idx) =>
  idx > 900 && line.includes('async function qaReviewEmail('));
if (qaReviewStart !== -1) {
  let braceCount = 0;
  let inFunction = false;
  let qaReviewEnd = qaReviewStart;

  for (let i = qaReviewStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('async function qaReviewEmail(')) inFunction = true;

    if (inFunction) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && i > qaReviewStart) {
        qaReviewEnd = i + 1;
        break;
      }
    }
  }

  while (qaReviewStart > 0 && (lines[qaReviewStart - 1].trim().startsWith('//') || lines[qaReviewStart - 1].trim().startsWith('═'))) {
    qaReviewStart--;
  }

  removeLines(qaReviewStart + 1, qaReviewEnd, 'qaReviewEmail() function');
}

// Find and remove generateCritiqueReasoning() - around line 885
let critiqueStart = lines.findIndex((line, idx) =>
  idx > 800 && line.includes('async function generateCritiqueReasoning('));
if (critiqueStart !== -1) {
  let braceCount = 0;
  let inFunction = false;
  let critiqueEnd = critiqueStart;

  for (let i = critiqueStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('async function generateCritiqueReasoning(')) inFunction = true;

    if (inFunction) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && i > critiqueStart) {
        critiqueEnd = i + 1;
        break;
      }
    }
  }

  while (critiqueStart > 0 && (lines[critiqueStart - 1].trim().startsWith('//') || lines[critiqueStart - 1].trim().startsWith('═'))) {
    critiqueStart--;
  }

  removeLines(critiqueStart + 1, critiqueEnd, 'generateCritiqueReasoning() function');
}

// Find and remove humanizeEmailWithAI() - around line 466
let humanizeStart = lines.findIndex((line, idx) =>
  idx > 400 && line.includes('async function humanizeEmailWithAI('));
if (humanizeStart !== -1) {
  let braceCount = 0;
  let inFunction = false;
  let humanizeEnd = humanizeStart;

  for (let i = humanizeStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('async function humanizeEmailWithAI(')) inFunction = true;

    if (inFunction) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && i > humanizeStart) {
        humanizeEnd = i + 1;
        break;
      }
    }
  }

  while (humanizeStart > 0 && (lines[humanizeStart - 1].trim().startsWith('//') || lines[humanizeStart - 1].trim().startsWith('═'))) {
    humanizeStart--;
  }

  removeLines(humanizeStart + 1, humanizeEnd, 'humanizeEmailWithAI() function');
}

// Find and remove extractContactInfo() - around line 416
let extractStart = lines.findIndex((line, idx) =>
  idx > 400 && line.includes('function extractContactInfo('));
if (extractStart !== -1) {
  let braceCount = 0;
  let inFunction = false;
  let extractEnd = extractStart;

  for (let i = extractStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('function extractContactInfo(')) inFunction = true;

    if (inFunction) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && i > extractStart) {
        extractEnd = i + 1;
        break;
      }
    }
  }

  while (extractStart > 0 && (lines[extractStart - 1].trim().startsWith('//') || lines[extractStart - 1].trim().startsWith('═'))) {
    extractStart--;
  }

  removeLines(extractStart + 1, extractEnd, 'extractContactInfo() function');
}

// STEP 2: Fix folder structure
console.log('\nSTEP 2: Fixing folder structure...\n');

let folderLineIdx = lines.findIndex(line => line.includes("'lead-${"));
if (folderLineIdx !== -1) {
  // Find the leadGrade declaration (should be a few lines above)
  let leadGradeIdx = -1;
  for (let i = folderLineIdx - 1; i >= Math.max(0, folderLineIdx - 10); i--) {
    if (lines[i].includes('const leadGrade =')) {
      leadGradeIdx = i;
      break;
    }
  }

  if (leadGradeIdx !== -1) {
    // Remove the leadGrade line and the comment above it
    let removeStart = leadGradeIdx;
    while (removeStart > 0 && (lines[removeStart - 1].trim().startsWith('//') || lines[removeStart - 1].trim().startsWith('═'))) {
      removeStart--;
    }
    removeLines(removeStart + 1, leadGradeIdx + 1, 'leadGrade variable and comments');
  }

  // Update the folder path line to use websiteGrade
  folderLineIdx = lines.findIndex(line => line.includes("'lead-${"));
  if (folderLineIdx !== -1) {
    lines[folderLineIdx] = lines[folderLineIdx].replace("'lead-${leadGrade}'", "'grade-${websiteGrade}'");
    lines[folderLineIdx] = lines[folderLineIdx].replace("'lead-${", "'grade-${websiteGrade");
    console.log('✅ Changed folder structure from lead-${leadGrade} to grade-${websiteGrade}');
  }
}

// STEP 3: Remove imports
console.log('\nSTEP 3: Removing email-related imports...\n');

let importIdx = lines.findIndex(line => line.includes("from './modules/drafts-gmail.js'"));
if (importIdx !== -1) {
  removeLines(importIdx + 1, importIdx + 1, "Gmail drafts import");
}

importIdx = lines.findIndex(line => line.includes("from './modules/email-sanitizer.js'"));
if (importIdx !== -1) {
  removeLines(importIdx + 1, importIdx + 1, "Email sanitizer import");
}

// STEP 4: Write the result
console.log('\nSTEP 4: Writing refactored file...\n');

const finalContent = lines.join('\n');
fs.writeFileSync(analyzerPath, finalContent, 'utf8');

const finalLineCount = lines.length;
const linesRemoved = originalLineCount - finalLineCount;

console.log('='.repeat(60));
console.log('\n✅ REFACTOR COMPLETE\n');
console.log(`Original: ${originalLineCount} lines`);
console.log(`Final:    ${finalLineCount} lines`);
console.log(`Removed:  ${linesRemoved} lines (${((linesRemoved / originalLineCount) * 100).toFixed(1)}%)\n`);

console.log('Sections removed:');
removedSections.forEach(({ description, lines, range }) => {
  console.log(`  - ${description}: ${lines} lines (was ${range})`);
});

console.log('\n✅ Backup saved: analyzer.js.pre-refactor');
console.log('\nNext steps:');
console.log('1. node -c analyzer.js (verify syntax)');
console.log('2. Manual cleanup of email workflow in analyzeWebsite()');
console.log('3. Run tests\n');
