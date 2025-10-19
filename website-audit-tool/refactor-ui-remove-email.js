import fs from 'fs';

console.log('🎨 REFACTORING UI - REMOVING EMAIL FEATURES\n');
console.log('This script will:');
console.log('1. Remove email-related agent cards (Agents 7, 8, 9)');
console.log('2. Update workflow from 11 steps to 8 steps');
console.log('3. Change folder references from lead-{grade} to grade-{grade}');
console.log('4. Remove Lead Grade displays, keep Website Grade only');
console.log('5. Update cost estimates\n');

// ============================================================================
// PART 1: Update index.html
// ============================================================================

console.log('Step 1: Updating index.html...');

const htmlPath = './public/index.html';
let html = fs.readFileSync(htmlPath, 'utf-8');

// 1.1: Remove Agent 7 (Email Writing)
html = html.replace(/\s*<!-- Agent 7: Email Writing -->[\s\S]*?<\/div>\n(?=\s*<!-- Agent 8|<\/div>\n\s*<div class="workflow-summary">)/m, '');
console.log('✓ Removed Agent #7 (Email Writing)');

// 1.2: Remove Agent 8 (Critique Reasoning)
html = html.replace(/\s*<!-- Agent 8: Critique Reasoning -->[\s\S]*?<\/div>\n(?=\s*<!-- Agent 9|<\/div>\n\s*<div class="workflow-summary">)/m, '');
console.log('✓ Removed Agent #8 (Critique Reasoning)');

// 1.3: Remove Agent 9 (QA Review)
html = html.replace(/\s*<!-- Agent 9: QA Review.*?-->[\s\S]*?<\/div>\n(?=\s*<\/div>\n\s*<div class="workflow-summary">)/m, '');
console.log('✓ Removed Agent #9 (QA Review)');

// 1.4: Update workflow title from "11 Steps" to "8 Steps"
html = html.replace(/How It Works \(11 Steps\)/g, 'How It Works (8 Steps)');
console.log('✓ Updated workflow from 11 steps to 8 steps');

// 1.5: Remove email-related workflow items
html = html.replace(/\s*<li><strong>Write Email<\/strong>.*?<\/li>/g, '');
html = html.replace(/\s*<li><strong>Explain Reasoning<\/strong>.*?<\/li>/g, '');
html = html.replace(/\s*<li><strong>QA Review<\/strong>.*?<\/li>/g, '');
html = html.replace(/\s*<li><strong>Calculate Grades<\/strong>.*?Lead Grade.*?<\/li>/g, '');
console.log('✓ Removed email-related workflow steps');

// 1.6: Update folder references from lead- to grade-
html = html.replace(/lead-A\//g, 'grade-A/');
html = html.replace(/lead-B\//g, 'grade-B/');
html = html.replace(/lead-C\//g, 'grade-C/');
html = html.replace(/lead-D\//g, 'grade-D/');
html = html.replace(/lead-F\//g, 'grade-F/');
html = html.replace(/Lead Grade in folders/g, 'Website Grade in folders');
console.log('✓ Updated folder references: lead-{grade}/ → grade-{grade}/');

// 1.7: Remove "Dual Grading" section with Lead Grade explanation
html = html.replace(/\s*<div class="dual-grading">[\s\S]*?<\/div><!-- End dual-grading -->\s*/m, '');
console.log('✓ Removed Dual Grading section (Lead Grade vs Website Grade)');

// 1.8: Remove "Lead Grade (A-F) ⭐ PRIMARY" mentions
html = html.replace(/Lead Grade \(A-F\) ⭐ PRIMARY/g, 'Website Grade (A-F)');
html = html.replace(/Lead Grade/g, 'Website Grade');
console.log('✓ Replaced Lead Grade with Website Grade');

// 1.9: Update cost estimates (remove email operations)
// The ALWAYS_RUNS_COST will be updated in app.js
html = html.replace(/\$0\.024/g, '$0.016'); // Remove ~$0.008 from email ops
console.log('✓ Updated cost estimates');

// Write updated HTML
fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('✅ index.html updated\n');

// ============================================================================
// PART 2: Update app.js
// ============================================================================

console.log('Step 2: Updating app.js...');

const jsPath = './public/app.js';
let js = fs.readFileSync(jsPath, 'utf-8');

// 2.1: Update ALWAYS_RUNS_COST (remove email operations: $0.015 + $0.001 + $0.001 + $0.001 = $0.018 → $0.015)
js = js.replace(/const ALWAYS_RUNS_COST = 0\.018;/g, 'const ALWAYS_RUNS_COST = 0.015;  // Grok AI only (email ops removed)');
console.log('✓ Updated ALWAYS_RUNS_COST from $0.018 to $0.015');

// 2.2: Update ALWAYS_RUNS_COST comment
js = js.replace(/\/\/ Grok AI \+ Email Writing \+ Critique Reasoning \+ QA Review/g, '// Grok AI extraction only');
console.log('✓ Updated ALWAYS_RUNS_COST comment');

// 2.3: Remove email-related progress messages
js = js.replace(/case 'generating_email':[\s\S]*?break;/m, '// [REMOVED] generating_email progress - moved to separate app');
js = js.replace(/case 'email_generated':[\s\S]*?break;/m, '// [REMOVED] email_generated progress - moved to separate app');
console.log('✓ Removed email generation progress messages');

// 2.4: Remove Lead Grade display from results
js = js.replace(/Lead Grade: \$\{result\.leadGrade\}/g, '// Lead Grade removed');
js = js.replace(/\$\{result\.leadGrade\}/g, '${result.websiteGrade}');
console.log('✓ Replaced Lead Grade with Website Grade in results display');

// Write updated JS
fs.writeFileSync(jsPath, js, 'utf-8');
console.log('✅ app.js updated\n');

console.log('='.repeat(70));
console.log('✅ UI REFACTOR COMPLETE');
console.log('='.repeat(70));
console.log('\n📁 Files updated:');
console.log('   - public/index.html (removed 3 agent cards, updated references)');
console.log('   - public/app.js (updated costs, removed email progress)\n');

console.log('✨ Changes made:');
console.log('   ✓ Removed Agent #7 (Email Writing)');
console.log('   ✓ Removed Agent #8 (Critique Reasoning)');
console.log('   ✓ Removed Agent #9 (QA Review)');
console.log('   ✓ Updated workflow: 11 steps → 8 steps');
console.log('   ✓ Updated folders: lead-{grade}/ → grade-{grade}/');
console.log('   ✓ Removed Lead Grade, kept Website Grade');
console.log('   ✓ Updated cost from $0.024 to $0.016 per analysis\n');
