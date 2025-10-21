/**
 * Test Suite for Business Intelligence Extractor
 *
 * Tests the extraction of business signals from multi-page HTML
 */

import { extractBusinessIntelligence, detectPageType } from '../scrapers/business-intelligence-extractor.js';
import * as cheerio from 'cheerio';

// Test counters
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🧪 Testing Business Intelligence Extractor\n');

// Test 1: Page Type Detection
console.log('1. Page Type Detection');

test('Detects About page from URL', () => {
  const html = '<html><head><title>About Us</title></head><body><h1>About Us</h1></body></html>';
  const $ = cheerio.load(html);
  const type = detectPageType('https://example.com/about-us', $);
  assert(type === 'about', `Expected 'about', got '${type}'`);
});

test('Detects Services page from URL', () => {
  const html = '<html><head><title>Our Services</title></head><body></body></html>';
  const $ = cheerio.load(html);
  const type = detectPageType('https://example.com/services', $);
  assert(type === 'services', `Expected 'services', got '${type}'`);
});

test('Detects Team page from URL patterns', () => {
  const html = '<html><head><title>Team</title></head><body></body></html>';
  const $ = cheerio.load(html);
  const type = detectPageType('https://example.com/our-team', $);
  assert(type === 'team', `Expected 'team', got '${type}'`);
});

test('Detects Blog page from content', () => {
  const html = '<html><head><title>Latest News and Articles</title></head><body><h1>Blog</h1></body></html>';
  const $ = cheerio.load(html);
  const type = detectPageType('https://example.com/posts', $);
  assert(type === 'blog', `Expected 'blog', got '${type}'`);
});

test('Returns "other" for unrecognized pages', () => {
  const html = '<html><head><title>Random Page</title></head><body></body></html>';
  const $ = cheerio.load(html);
  const type = detectPageType('https://example.com/random-123', $);
  assert(type === 'other', `Expected 'other', got '${type}'`);
});

// Test 2: Company Size Extraction
console.log('\n2. Company Size Extraction');

test('Extracts employee count from team page', () => {
  const pages = [
    {
      url: 'https://example.com/team',
      html: `
        <html><body>
          <div class="team-member">John Doe</div>
          <div class="team-member">Jane Smith</div>
          <div class="team-member">Bob Johnson</div>
          <div class="team-member">Alice Williams</div>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.employeeCount === 4, `Expected 4, got ${result.companySize.employeeCount}`);
  assert(result.companySize.confidence === 'high', `Expected 'high', got '${result.companySize.confidence}'`);
});

test('Extracts employee count from text mentions', () => {
  const pages = [
    {
      url: 'https://example.com/about',
      html: `
        <html><body>
          <p>Our team of 15 employees serves clients worldwide.</p>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.employeeCount >= 15, `Expected >= 15, got ${result.companySize.employeeCount}`);
  assert(result.companySize.signals.length > 0, 'Expected signals to be detected');
});

test('Extracts location count', () => {
  const pages = [
    {
      url: 'https://example.com/locations',
      html: `
        <html><body>
          <div class="location">New York Office</div>
          <div class="location">London Office</div>
          <div class="location">Tokyo Office</div>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.locationCount === 3, `Expected 3, got ${result.companySize.locationCount}`);
});

// Test 3: Years in Business
console.log('\n3. Years in Business Extraction');

test('Extracts founded year from copyright', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><footer>© 2015-2024 Example Company</footer></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.yearsInBusiness.foundedYear === 2015, `Expected 2015, got ${result.yearsInBusiness.foundedYear}`);
  assert(result.yearsInBusiness.estimatedYears >= 8, `Expected >= 8 years, got ${result.yearsInBusiness.estimatedYears}`);
});

test('Extracts "Since XXXX" mentions', () => {
  const pages = [
    {
      url: 'https://example.com/about',
      html: '<html><body><p>Serving our community since 2010</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.yearsInBusiness.foundedYear === 2010, `Expected 2010, got ${result.yearsInBusiness.foundedYear}`);
  assert(result.yearsInBusiness.signals.some(s => s.includes('since')), 'Expected "since" in signals');
});

test('Extracts from "X years of experience"', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><p>With over 20 years of experience in the industry...</p></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.yearsInBusiness.estimatedYears >= 19, `Expected >= 19 years`);
});

// Test 4: Pricing Visibility
console.log('\n4. Pricing Visibility Extraction');

test('Detects visible pricing', () => {
  const pages = [
    {
      url: 'https://example.com/pricing',
      html: `
        <html><body>
          <div class="pricing-table">
            <div class="package">Basic: $500</div>
            <div class="package">Pro: $1,500</div>
            <div class="package">Enterprise: $5,000</div>
          </div>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.pricingVisibility.visible === true, 'Expected pricing to be visible');
  assert(result.pricingVisibility.priceRange.min === 500, `Expected min 500, got ${result.pricingVisibility.priceRange.min}`);
  assert(result.pricingVisibility.priceRange.max === 5000, `Expected max 5000, got ${result.pricingVisibility.priceRange.max}`);
});

test('Detects price ranges', () => {
  const pages = [
    {
      url: 'https://example.com/services',
      html: '<html><body><p>Website design packages range from $2,000 - $10,000</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.pricingVisibility.visible === true, 'Expected pricing to be visible');
  assert(result.pricingVisibility.signals.some(s => s.includes('range')), 'Expected range mention in signals');
});

test('Returns false when no pricing found', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><p>Contact us for a quote</p></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.pricingVisibility.visible === false, 'Expected no visible pricing');
});

// Test 5: Content Freshness
console.log('\n5. Content Freshness Extraction');

test('Detects blog activity', () => {
  const pages = [
    {
      url: 'https://example.com/blog',
      html: `
        <html><body>
          <article>
            <h2>Latest Post</h2>
            <time datetime="2024-10-15">October 15, 2024</time>
          </article>
          <article>
            <h2>Previous Post</h2>
            <time datetime="2024-09-20">September 20, 2024</time>
          </article>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.contentFreshness.blogActive === true, 'Expected blog to be active');
  assert(result.contentFreshness.postCount >= 2, `Expected >= 2 posts, got ${result.contentFreshness.postCount}`);
});

test('Detects last update date', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><footer>Last updated: January 15, 2024</footer></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.contentFreshness.lastUpdate !== null, 'Expected last update date to be found');
});

test('Detects current copyright year', () => {
  const currentYear = new Date().getFullYear();
  const pages = [
    {
      url: 'https://example.com',
      html: `<html><body><footer>© ${currentYear} Company</footer></body></html>`,
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.contentFreshness.signals.some(s => s.includes(currentYear.toString())), 'Expected current year in signals');
});

// Test 6: Decision Maker Accessibility
console.log('\n6. Decision Maker Accessibility Extraction');

test('Detects direct email addresses', () => {
  const pages = [
    {
      url: 'https://example.com/contact',
      html: '<html><body><p>Email: john@example.com or contact@example.com</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.decisionMakerAccessibility.hasDirectEmail === true, 'Expected direct email to be found');
  assert(result.decisionMakerAccessibility.signals.length > 0, 'Expected email signals');
});

test('Detects phone numbers', () => {
  const pages = [
    {
      url: 'https://example.com/contact',
      html: '<html><body><p>Call us: (555) 123-4567</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.decisionMakerAccessibility.hasDirectPhone === true, 'Expected phone to be found');
});

test('Extracts owner name from About page', () => {
  const pages = [
    {
      url: 'https://example.com/about',
      html: '<html><body><p>Founded by John Smith in 2015, our company...</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.decisionMakerAccessibility.ownerName !== null, 'Expected owner name to be found');
  assert(result.decisionMakerAccessibility.ownerName.includes('John'), 'Expected name to include "John"');
});

test('Identifies owner email addresses', () => {
  const pages = [
    {
      url: 'https://example.com/contact',
      html: '<html><body><p>Email the CEO: ceo@example.com</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.decisionMakerAccessibility.signals.some(s => s.toLowerCase().includes('ceo') || s.toLowerCase().includes('decision')),
         'Expected CEO/decision maker mention in signals');
});

// Test 7: Premium Features
console.log('\n7. Premium Features Detection');

test('Detects live chat widgets', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><script src="https://widget.intercom.io/widget/abc123"></script></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.premiumFeatures.detected.includes('live_chat'), 'Expected live_chat to be detected');
  assert(result.premiumFeatures.budgetIndicator !== 'low', 'Expected higher budget indicator');
});

test('Detects booking systems', () => {
  const pages = [
    {
      url: 'https://example.com/book',
      html: '<html><body><iframe src="https://calendly.com/schedule"></iframe></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.premiumFeatures.detected.includes('booking_system'), 'Expected booking_system to be detected');
});

test('Detects e-commerce features', () => {
  const pages = [
    {
      url: 'https://example.com/shop',
      html: `
        <html><body>
          <button class="add-to-cart">Add to Cart</button>
          <div class="shopping-cart"></div>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.premiumFeatures.detected.includes('ecommerce'), 'Expected ecommerce to be detected');
});

test('Detects multiple premium features', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: `
        <html><body>
          <script src="https://js.stripe.com/v3/"></script>
          <script src="https://widget.intercom.io/widget/abc"></script>
          <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
          <div class="member-login"></div>
        </body></html>
      `,
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.premiumFeatures.detected.length >= 3, `Expected >= 3 features, got ${result.premiumFeatures.detected.length}`);
  assert(result.premiumFeatures.budgetIndicator === 'medium' || result.premiumFeatures.budgetIndicator === 'high',
         'Expected medium or high budget indicator');
});

// Test 8: Multi-Page Aggregation
console.log('\n8. Multi-Page Aggregation');

test('Aggregates data from multiple pages', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><footer>© 2020-2024 Example Co</footer></body></html>',
      isHomepage: true
    },
    {
      url: 'https://example.com/about',
      html: '<html><body><p>Founded by Jane Doe with a team of 10 professionals</p></body></html>',
      isHomepage: false
    },
    {
      url: 'https://example.com/services',
      html: '<html><body><p>Packages starting at $1,000</p></body></html>',
      isHomepage: false
    },
    {
      url: 'https://example.com/contact',
      html: '<html><body><p>Email: jane@example.com | Phone: (555) 555-5555</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);

  // Check all categories have data
  assert(result.yearsInBusiness.foundedYear === 2020, 'Expected year from homepage');
  assert(result.companySize.employeeCount >= 10, 'Expected employee count from About page');
  assert(result.pricingVisibility.visible === true, 'Expected pricing from Services page');
  assert(result.decisionMakerAccessibility.hasDirectEmail === true, 'Expected email from Contact page');
  assert(result.decisionMakerAccessibility.ownerName !== null, 'Expected owner name from About page');
  assert(result.metadata.totalPagesAnalyzed === 4, 'Expected 4 pages analyzed');
});

test('Counts page types correctly', () => {
  const pages = [
    { url: 'https://example.com', html: '<html><body></body></html>', isHomepage: true },
    { url: 'https://example.com/about', html: '<html><body></body></html>', isHomepage: false },
    { url: 'https://example.com/services', html: '<html><body></body></html>', isHomepage: false },
    { url: 'https://example.com/team', html: '<html><body></body></html>', isHomepage: false },
    { url: 'https://example.com/contact', html: '<html><body></body></html>', isHomepage: false },
    { url: 'https://example.com/blog', html: '<html><body></body></html>', isHomepage: false }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.pageTypes.about === 1, 'Expected 1 about page');
  assert(result.pageTypes.services === 1, 'Expected 1 services page');
  assert(result.pageTypes.team === 1, 'Expected 1 team page');
  assert(result.pageTypes.contact === 1, 'Expected 1 contact page');
  assert(result.pageTypes.blog === 1, 'Expected 1 blog page');
});

// Test 9: Edge Cases
console.log('\n9. Edge Cases');

test('Handles empty pages array', () => {
  const result = extractBusinessIntelligence([]);
  assert(result.metadata.totalPagesAnalyzed === 0, 'Expected 0 pages');
  assert(result.companySize.confidence === 'none', 'Expected no confidence');
});

test('Handles null input', () => {
  const result = extractBusinessIntelligence(null);
  assert(result.metadata.totalPagesAnalyzed === 0, 'Expected 0 pages');
});

test('Handles malformed HTML gracefully', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><div>Unclosed div</body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result !== null, 'Expected result even with malformed HTML');
});

test('Filters out unrealistic prices (years)', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><footer>© 2024 Company</footer></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  // Should not detect $2024 as a price
  assert(result.pricingVisibility.priceRange.max !== 2024, 'Should not detect year as price');
});

test('Ignores spam/generic emails', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><p>Email: noreply@example.com or donotreply@example.com</p></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  // Should filter out noreply emails
  assert(!result.decisionMakerAccessibility.signals.some(s => s.includes('noreply')),
         'Should filter noreply emails');
});

// Test 10: Confidence Levels
console.log('\n10. Confidence Levels');

test('Sets high confidence with multiple signals', () => {
  const pages = [
    {
      url: 'https://example.com/team',
      html: `
        <html><body>
          <div class="team-member">Person 1</div>
          <div class="team-member">Person 2</div>
          <div class="team-member">Person 3</div>
        </body></html>
      `,
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.confidence === 'high', 'Expected high confidence with team page data');
});

test('Sets medium confidence with limited signals', () => {
  const pages = [
    {
      url: 'https://example.com/about',
      html: '<html><body><p>We have 5 employees</p></body></html>',
      isHomepage: false
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.confidence === 'medium', 'Expected medium confidence with text-only mention');
});

test('Sets low confidence with minimal data', () => {
  const pages = [
    {
      url: 'https://example.com',
      html: '<html><body><p>Welcome to our website</p></body></html>',
      isHomepage: true
    }
  ];

  const result = extractBusinessIntelligence(pages);
  assert(result.companySize.confidence === 'low', 'Expected low confidence with no size data');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️ Some tests failed.');
  process.exit(1);
}
