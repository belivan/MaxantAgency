/**
 * Test V3 Report with Much Larger Mobile Text
 */

import { generateHTMLReportV3 } from './analysis-engine/reports/exporters/html-exporter-v3-concise.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const testData = {
  company_name: 'Mobile Test Corp',
  url: 'https://www.example.com',
  industry: 'Technology',
  city: 'San Francisco',
  grade: 'B',
  overall_score: 75,

  design_score: 78,
  seo_score: 72,
  content_score: 76,
  social_score: 74,

  top_issue: 'Mobile page load speed needs improvement - currently 4.2 seconds',
  one_liner: 'A solid website with great content but needs mobile optimization',

  design_issues: [
    'Navigation menu is too small on mobile devices',
    'Text is difficult to read on small screens',
    'Buttons are too close together for touch'
  ],

  seo_issues: [
    'Missing meta descriptions on key pages',
    'No structured data implementation',
    'Images not optimized for web'
  ],

  quick_wins: [
    'Compress images to reduce load time by 40%',
    'Add meta descriptions to all pages',
    'Implement lazy loading for images',
    'Fix 8 broken internal links',
    'Add Google Analytics tracking'
  ],
  quick_wins_count: 5,

  analyzed_at: new Date().toISOString(),
  pages_analyzed: 10,
  analysis_time: 95,

  screenshot_desktop_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  screenshot_mobile_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

async function testLargeMobileText() {
  console.log('📱 TESTING MUCH LARGER MOBILE TEXT\n');
  console.log('Changes made:');
  console.log('  • Base font: 16px → 22-24px on mobile (nearly doubled)');
  console.log('  • Body text: 1.1-1.15rem for maximum readability');
  console.log('  • Headings: 1.5-2rem for clear hierarchy');
  console.log('  • Line height: 1.8-1.9 for better spacing');
  console.log('  • Touch targets: 44x44px minimum');
  console.log('  • No text smaller than 1rem on mobile\n');

  try {
    const html = await generateHTMLReportV3(testData, {});

    const filename = 'test-v3-mobile-large-text.html';
    await writeFile(filename, html);

    console.log(`✅ Report saved: ${filename}`);
    console.log(`   Size: ${(html.length / 1024).toFixed(1)} KB\n`);

    console.log('📱 TO TEST MOBILE VIEW:');
    console.log('1. Open test-v3-mobile-large-text.html');
    console.log('2. Press F12 → Toggle Device (Ctrl+Shift+M)');
    console.log('3. Select iPhone SE or any mobile device');
    console.log('4. Text should now be MUCH larger and easier to read!');

    console.log('\n🔍 What to check:');
    console.log('• All body text is large and readable');
    console.log('• No squinting needed to read anything');
    console.log('• Comfortable reading distance from phone');
    console.log('• Clear hierarchy between headings and body');
    console.log('• Easy to tap buttons and links');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLargeMobileText();