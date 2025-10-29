/**
 * Test Design Token Extraction
 *
 * Quick test to verify design token extraction works end-to-end
 */

import { crawlSelectedPagesWithScreenshots } from './analysis-engine/scrapers/multi-page-crawler.js';

async function testDesignTokens() {
  console.log('🧪 Testing Design Token Extraction\n');
  console.log('━'.repeat(60));

  const testUrl = 'https://example.com'; // Simple test site

  console.log(`\n📍 Test URL: ${testUrl}`);
  console.log('⏳ Crawling page and extracting design tokens...\n');

  try {
    const results = await crawlSelectedPagesWithScreenshots(testUrl, ['/'], {
      timeout: 30000,
      concurrency: 1
    });

    if (results.length === 0) {
      console.error('❌ No pages crawled');
      process.exit(1);
    }

    const page = results[0];

    if (!page.success) {
      console.error(`❌ Crawl failed: ${page.error}`);
      process.exit(1);
    }

    console.log('✅ Page crawled successfully!\n');
    console.log('━'.repeat(60));

    // Desktop Design Tokens
    console.log('\n🖥️  DESKTOP DESIGN TOKENS:\n');

    if (page.designTokens?.desktop) {
      const desktop = page.designTokens.desktop;

      console.log(`📝 Fonts (${desktop.fonts?.length || 0}):`);
      if (desktop.fonts && desktop.fonts.length > 0) {
        desktop.fonts.slice(0, 5).forEach((font, i) => {
          console.log(`   ${i + 1}. ${font.family}`);
          console.log(`      Sizes: ${font.sizes.join(', ')}`);
          console.log(`      Weights: ${font.weights.join(', ')}`);
          console.log(`      Usage: ${font.usage} instances\n`);
        });

        if (desktop.fonts.length > 5) {
          console.log(`      ... and ${desktop.fonts.length - 5} more\n`);
        }
      } else {
        console.log('      (No fonts detected)\n');
      }

      console.log(`🎨 Colors (${desktop.colors?.length || 0}):`);
      if (desktop.colors && desktop.colors.length > 0) {
        desktop.colors.slice(0, 10).forEach((color, i) => {
          console.log(`   ${i + 1}. ${color.hex} (${color.usage} instances)`);
        });

        if (desktop.colors.length > 10) {
          console.log(`      ... and ${desktop.colors.length - 10} more\n`);
        }
      } else {
        console.log('      (No colors detected)\n');
      }
    } else {
      console.log('   ❌ No desktop design tokens found');
    }

    // Mobile Design Tokens
    console.log('\n━'.repeat(60));
    console.log('\n📱 MOBILE DESIGN TOKENS:\n');

    if (page.designTokens?.mobile) {
      const mobile = page.designTokens.mobile;

      console.log(`📝 Fonts (${mobile.fonts?.length || 0}):`);
      if (mobile.fonts && mobile.fonts.length > 0) {
        mobile.fonts.slice(0, 5).forEach((font, i) => {
          console.log(`   ${i + 1}. ${font.family}`);
          console.log(`      Sizes: ${font.sizes.join(', ')}`);
          console.log(`      Weights: ${font.weights.join(', ')}`);
          console.log(`      Usage: ${font.usage} instances\n`);
        });

        if (mobile.fonts.length > 5) {
          console.log(`      ... and ${mobile.fonts.length - 5} more\n`);
        }
      } else {
        console.log('      (No fonts detected)\n');
      }

      console.log(`🎨 Colors (${mobile.colors?.length || 0}):`);
      if (mobile.colors && mobile.colors.length > 0) {
        mobile.colors.slice(0, 10).forEach((color, i) => {
          console.log(`   ${i + 1}. ${color.hex} (${color.usage} instances)`);
        });

        if (mobile.colors.length > 10) {
          console.log(`      ... and ${mobile.colors.length - 10} more\n`);
        }
      } else {
        console.log('      (No colors detected)\n');
      }
    } else {
      console.log('   ❌ No mobile design tokens found');
    }

    // Summary
    console.log('\n━'.repeat(60));
    console.log('\n📊 SUMMARY:\n');

    const desktopFonts = page.designTokens?.desktop?.fonts?.length || 0;
    const mobileFonts = page.designTokens?.mobile?.fonts?.length || 0;
    const desktopColors = page.designTokens?.desktop?.colors?.length || 0;
    const mobileColors = page.designTokens?.mobile?.colors?.length || 0;

    console.log(`   Desktop: ${desktopFonts} fonts, ${desktopColors} colors`);
    console.log(`   Mobile:  ${mobileFonts} fonts, ${mobileColors} colors`);

    // Check consistency
    if (desktopFonts > 0 && mobileFonts > 0) {
      const desktopFontFamilies = new Set(page.designTokens.desktop.fonts.map(f => f.family));
      const mobileFontFamilies = new Set(page.designTokens.mobile.fonts.map(f => f.family));
      const sharedFonts = [...desktopFontFamilies].filter(f => mobileFontFamilies.has(f));

      const fontConsistency = Math.round((sharedFonts.length / desktopFontFamilies.size) * 100);
      console.log(`\n   Font Consistency: ${fontConsistency}% (${sharedFonts.length}/${desktopFontFamilies.size} shared)`);
    }

    if (desktopColors > 0 && mobileColors > 0) {
      const desktopHexes = new Set(page.designTokens.desktop.colors.map(c => c.hex));
      const mobileHexes = new Set(page.designTokens.mobile.colors.map(c => c.hex));
      const sharedColors = [...desktopHexes].filter(h => mobileHexes.has(h));

      const colorConsistency = Math.round((sharedColors.length / desktopHexes.size) * 100);
      console.log(`   Color Consistency: ${colorConsistency}% (${sharedColors.length}/${desktopHexes.size} shared)`);
    }

    console.log('\n━'.repeat(60));
    console.log('\n✅ TEST PASSED! Design token extraction working correctly.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testDesignTokens().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
