import { readFile, writeFile } from 'fs/promises';

const promptFiles = [
  'analysis-engine/config/prompts/web-design/content-analysis.json',
  'analysis-engine/config/prompts/web-design/design-critique.json',
  'analysis-engine/config/prompts/web-design/desktop-visual-analysis.json',
  'analysis-engine/config/prompts/web-design/industry-critique.json',
  'analysis-engine/config/prompts/report-synthesis/issue-deduplication.json',
  'analysis-engine/config/prompts/report-synthesis/executive-insights-generator.json',
  'analysis-engine/config/prompts/web-design/mobile-visual-analysis.json',
  'analysis-engine/config/prompts/web-design/seo-analysis.json',
  'analysis-engine/config/prompts/lead-qualification/lead-priority-scorer.json',
  'analysis-engine/config/prompts/benchmarking/visual-strengths-extractor.json',
  'analysis-engine/config/prompts/benchmarking/technical-strengths-extractor.json',
  'analysis-engine/config/prompts/benchmarking/social-strengths-extractor.json',
  'analysis-engine/config/prompts/benchmarking/accessibility-strengths-extractor.json',
  'analysis-engine/config/prompts/web-design/unified-visual-analysis.json',
  'analysis-engine/config/prompts/web-design/unified-technical-analysis.json',
  'analysis-engine/config/prompts/web-design/social-analysis.json',
  'analysis-engine/config/prompts/web-design/accessibility-analysis.json',
  'analysis-engine/config/prompts/benchmark-matching/find-best-comparison.json',
  'analysis-engine/config/prompts/grading/ai-comparative-grader.json'
];

console.log(`Found ${promptFiles.length} prompt files\n`);

let updated = 0;
let skipped = 0;

for (const file of promptFiles) {
  const content = await readFile(file, 'utf8');
  const config = JSON.parse(content);

  const oldModel = config.model;

  // Update to Claude Haiku 4.5 (latest, supports vision and text)
  config.model = 'claude-haiku-4-5';

  // Write back
  await writeFile(file, JSON.stringify(config, null, 2), 'utf8');

  if (oldModel !== config.model) {
    console.log(`✅ ${file}`);
    console.log(`   ${oldModel} → ${config.model}`);
    updated++;
  } else {
    console.log(`⏭️  ${file} (already Haiku)`);
    skipped++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Total: ${promptFiles.length}`);
console.log(`\n✅ All prompts now use Claude Haiku 3.5!`);
