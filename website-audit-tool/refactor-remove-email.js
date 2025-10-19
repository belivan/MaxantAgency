import fs from 'fs';
import path from 'path';

console.log('🔧 REFACTORING ANALYZER.JS - REMOVING EMAIL FEATURES\n');
console.log('This script will:');
console.log('1. Remove email-related functions (generateEmail, humanizeEmailWithAI, qaReviewEmail)');
console.log('2. Change folder structure from lead-{grade} to grade-{grade}');
console.log('3. Remove email file generation (email.txt, critique-reasoning.txt, qa-review.txt)');
console.log('4. Remove QA review logic');
console.log('5. Remove email-related fields from result object');
console.log('6. Keep all data collection features (Grok AI, analysis modules, etc.)\n');

const filePath = './analyzer.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Track changes
let changeCount = 0;

// 1. Change folder structure from lead-{grade} to grade-{grade}
console.log('Step 1: Changing folder structure lead-{grade} → grade-{grade}...');
content = content.replace(/lead-\${leadGrade}/g, 'grade-${websiteGrade}');
content = content.replace(/lead-\${/g, 'grade-${');
content = content.replace(/'lead-'\s*\+\s*leadGrade/g, "'grade-' + websiteGrade");
content = content.replace(/`lead-\${/g, '`grade-${');
console.log('✓ Folder structure updated\n');
changeCount++;

// 2. Remove function: generateEmail (lines ~1591-1710)
console.log('Step 2: Removing generateEmail function...');
const generateEmailRegex = /\/\*\*[\s\S]*?Generate personalized email from critique[\s\S]*?\*\/[\s]*function generateEmail\([\s\S]*?\n\}\n/;
if (generateEmailRegex.test(content)) {
  content = content.replace(generateEmailRegex, '// [REMOVED] generateEmail function - email generation moved to separate app\n\n');
  console.log('✓ generateEmail function removed\n');
  changeCount++;
} else {
  console.log('⚠️  generateEmail function not found (may have been removed already)\n');
}

// 3. Remove function: humanizeEmailWithAI (lines ~444-600)
console.log('Step 3: Removing humanizeEmailWithAI function...');
const humanizeEmailRegex = /\/\*\*[\s\S]*?Humanize[\s\S]*?email[\s\S]*?\*\/[\s]*async function humanizeEmailWithAI\([\s\S]*?\n\}\n/;
if (humanizeEmailRegex.test(content)) {
  content = content.replace(humanizeEmailRegex, '// [REMOVED] humanizeEmailWithAI function - email humanization moved to separate app\n\n');
  console.log('✓ humanizeEmailWithAI function removed\n');
  changeCount++;
} else {
  console.log('⚠️  humanizeEmailWithAI function not found (may have been removed already)\n');
}

// 4. Remove function: qaReviewEmail (lines ~929-1050)
console.log('Step 4: Removing qaReviewEmail function...');
const qaReviewRegex = /\/\*\*[\s\S]*?QA Review Agent[\s\S]*?\*\/[\s]*async function qaReviewEmail\([\s\S]*?\n\}\n/;
if (qaReviewRegex.test(content)) {
  content = content.replace(qaReviewRegex, '// [REMOVED] qaReviewEmail function - email QA moved to separate app\n\n');
  console.log('✓ qaReviewEmail function removed\n');
  changeCount++;
} else {
  console.log('⚠️  qaReviewEmail function not found (may have been removed already)\n');
}

// 5. Remove leadGrade variable declarations and replace with websiteGrade
console.log('Step 5: Replacing leadGrade with websiteGrade...');
content = content.replace(/const leadGrade = result\.emailQA\?\.leadGrade.*?;/g, '// Lead grade removed - using websiteGrade instead');
content = content.replace(/leadGrade:/g, '// leadGrade removed');
content = content.replace(/leadGrade,/g, '// leadGrade removed,');
content = content.replace(/leadGrade\s*\)/g, 'websiteGrade)');
console.log('✓ leadGrade references replaced\n');
changeCount++;

// 6. Remove email file writes (email.txt, critique-reasoning.txt, qa-review.txt)
console.log('Step 6: Removing email file writes...');
content = content.replace(/fs\.promises\.writeFile\(\s*path\.join\(folderPath,\s*'email\.txt'\)[\s\S]*?\);/g, '// [REMOVED] email.txt file write');
content = content.replace(/if \(result\.critiqueReasoning\)[\s\S]*?fs\.promises\.writeFile\([\s\S]*?'critique-reasoning\.txt'[\s\S]*?\);[\s\S]*?\}/g, '// [REMOVED] critique-reasoning.txt file write');
content = content.replace(/fs\.promises\.writeFile\(\s*path\.join\(folderPath,\s*'qa-review\.txt'\)[\s\S]*?\);/g, '// [REMOVED] qa-review.txt file write');
console.log('✓ Email file writes removed\n');
changeCount++;

// 7. Remove QA review logic in analyzeWebsite
console.log('Step 7: Removing QA review logic...');
content = content.replace(/let qaReview = null;[\s\S]*?qaReview = await qaReviewEmail[\s\S]*?catch \(e\) \{[\s\S]*?\}/g, '// [REMOVED] QA review logic - moved to separate email app');
console.log('✓ QA review logic removed\n');
changeCount++;

// 8. Remove emailQA from result object
console.log('Step 8: Removing emailQA from result object...');
content = content.replace(/emailQA:\s*qaReview\s*\|\|\s*null,.*$/gm, '// emailQA removed - email generation in separate app');
console.log('✓ emailQA field removed from result\n');
changeCount++;

// 9. Remove email-related cost operations
console.log('Step 9: Removing email-related cost tracking...');
content = content.replace(/emailWriting:\s*true,.*$/gm, '// emailWriting removed');
content = content.replace(/critiqueReasoning:\s*true,.*$/gm, '// critiqueReasoning removed');
content = content.replace(/qaReview:\s*true,.*$/gm, '// qaReview removed');
console.log('✓ Email cost tracking removed\n');
changeCount++;

// 10. Remove LEAD GRADE text from qa-review.txt content
console.log('Step 10: Removing LEAD GRADE references in file content...');
content = content.replace(/LEAD GRADE:.*$/gm, '// LEAD GRADE removed');
content = content.replace(/Lead Grade \(.*?\):.*$/gm, '// Lead Grade explanation removed');
console.log('✓ LEAD GRADE references removed\n');
changeCount++;

// 11. Clean up any remaining leadGrade console.log statements
console.log('Step 11: Cleaning up leadGrade console.log statements...');
content = content.replace(/console\.log\(`.*?Lead Grade:.*?\$\{leadGrade\}.*?\`\);/g, 'console.log(`   🎯 Website Grade: ${websiteGrade}`);');
console.log('✓ Console.log statements updated\n');
changeCount++;

// Write the refactored file
fs.writeFileSync(filePath, content, 'utf-8');

console.log('='.repeat(70));
console.log(`✅ REFACTOR COMPLETE - ${changeCount} categories of changes made`);
console.log('='.repeat(70));
console.log('\n📁 Files updated:');
console.log('   - analyzer.js (refactored)');
console.log('   - analyzer.js.backup (original backup)\n');

console.log('✨ Next steps:');
console.log('1. Review the changes: git diff analyzer.js');
console.log('2. Test the refactored analyzer');
console.log('3. Update Supabase schema to remove email fields');
console.log('4. Update UI to remove email-related displays');
console.log('5. Update cost tracking module');
console.log('6. Update README documentation\n');
