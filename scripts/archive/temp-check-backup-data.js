import { readFile } from 'fs/promises';

async function checkBackupData() {
  const backupPath = './local-backups/analysis-engine/leads/children-family-dentistry-braces-of-hartford-2025-10-27-1761576866354.json';

  const data = JSON.parse(await readFile(backupPath, 'utf8'));

  console.log('\n📊 Backup Data Check:\n');
  console.log(`   Company: ${data.company_name}`);
  console.log(`   Tech Stack: ${data.tech_stack}`);
  console.log(`   Grade: ${data.website_grade} (${data.overall_score})`);
  console.log(`\n📸 Screenshots:`);
  console.log(`   Desktop: ${data.screenshot_desktop_path ? 'YES' : 'NO'}`);
  console.log(`   Mobile: ${data.screenshot_mobile_path ? 'YES' : 'NO'}`);
  console.log(`\n📄 Reports:`);
  console.log(`   Preview: ${data.preview_report_path || 'NOT GENERATED'}`);
  console.log(`   Full: ${data.full_report_path || 'NOT GENERATED'}`);

  // Check crawl metadata for techStack
  if (data.crawl_metadata?.pages?.[0]) {
    const homepage = data.crawl_metadata.pages[0];
    console.log(`\n🔍 Crawl Metadata (Homepage):`);
    console.log(`   URL: ${homepage.url}`);
    console.log(`   Has techStack: ${!!homepage.techStack}`);
    if (homepage.techStack) {
      console.log(`   CMS: ${homepage.techStack.cms || 'None'}`);
      console.log(`   Frameworks: ${homepage.techStack.frameworks?.join(', ') || 'None'}`);
    }
  }
}

checkBackupData();
