/**
 * Demo: Business Intelligence Extractor
 *
 * This demo shows how to use the Business Intelligence Extractor
 * to analyze multiple pages from a website and extract business signals.
 */

import { extractBusinessIntelligence } from '../scrapers/business-intelligence-extractor.js';

console.log('🔍 Business Intelligence Extractor Demo\n');
console.log('=' .repeat(70));

// Simulate crawled pages from a fictional restaurant website
const examplePages = [
  // Homepage
  {
    url: 'https://joes-bistro.com',
    html: `
      <html>
        <head>
          <title>Joe's Bistro - Fine Dining Since 2015</title>
          <meta name="description" content="Award-winning restaurant in downtown">
        </head>
        <body>
          <header>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About</a>
              <a href="/menu">Menu</a>
              <a href="/contact">Contact</a>
            </nav>
          </header>
          <main>
            <h1>Welcome to Joe's Bistro</h1>
            <p>Serving our community since 2015 with passion and quality.</p>
            <script src="https://widget.intercom.io/widget/abc123"></script>
            <script src="https://js.stripe.com/v3/"></script>
          </main>
          <footer>
            <p>© 2015-2024 Joe's Bistro. All rights reserved.</p>
          </footer>
        </body>
      </html>
    `,
    isHomepage: true
  },

  // About page
  {
    url: 'https://joes-bistro.com/about',
    html: `
      <html>
        <head>
          <title>About Us - Joe's Bistro</title>
        </head>
        <body>
          <h1>Our Story</h1>
          <p>Founded by Chef Joe Martinez in 2015, Joe's Bistro has grown from a small
             family restaurant to an award-winning dining destination.</p>
          <p>Our team of 12 professionals is dedicated to bringing you the finest
             culinary experience in the city.</p>
          <p>We operate two locations: our flagship downtown restaurant and our
             newer location in the Marina district.</p>
          <div class="owner-bio">
            <h2>Meet the Chef</h2>
            <p><strong>Joe Martinez</strong>, Owner & Executive Chef</p>
            <p>Joe has over 20 years of experience in fine dining...</p>
          </div>
        </body>
      </html>
    `,
    isHomepage: false
  },

  // Team page
  {
    url: 'https://joes-bistro.com/our-team',
    html: `
      <html>
        <body>
          <h1>Meet Our Team</h1>
          <div class="team-member">
            <h3>Joe Martinez</h3>
            <p>Executive Chef</p>
          </div>
          <div class="team-member">
            <h3>Maria Lopez</h3>
            <p>Sous Chef</p>
          </div>
          <div class="team-member">
            <h3>David Chen</h3>
            <p>Pastry Chef</p>
          </div>
          <div class="team-member">
            <h3>Sarah Williams</h3>
            <p>General Manager</p>
          </div>
          <div class="team-member">
            <h3>Mike Johnson</h3>
            <p>Sommelier</p>
          </div>
        </body>
      </html>
    `,
    isHomepage: false
  },

  // Menu/Pricing page
  {
    url: 'https://joes-bistro.com/menu',
    html: `
      <html>
        <body>
          <h1>Our Menu</h1>

          <section class="menu-section">
            <h2>Appetizers</h2>
            <div class="menu-item">
              <span class="name">Oysters Rockefeller</span>
              <span class="price">$18</span>
            </div>
            <div class="menu-item">
              <span class="name">French Onion Soup</span>
              <span class="price">$12</span>
            </div>
          </section>

          <section class="menu-section">
            <h2>Entrees</h2>
            <div class="menu-item">
              <span class="name">Filet Mignon</span>
              <span class="price">$45</span>
            </div>
            <div class="menu-item">
              <span class="name">Pan-Seared Salmon</span>
              <span class="price">$38</span>
            </div>
            <div class="menu-item">
              <span class="name">Lobster Risotto</span>
              <span class="price">$52</span>
            </div>
          </section>

          <section class="pricing-note">
            <p>Private dining packages available from $500 - $5,000</p>
          </section>
        </body>
      </html>
    `,
    isHomepage: false
  },

  // Contact page
  {
    url: 'https://joes-bistro.com/contact',
    html: `
      <html>
        <body>
          <h1>Contact Us</h1>

          <section class="contact-info">
            <h2>Get in Touch</h2>
            <p><strong>Email:</strong> joe@joes-bistro.com</p>
            <p><strong>Phone:</strong> (555) 123-4567</p>
            <p><strong>General Inquiries:</strong> info@joes-bistro.com</p>
          </section>

          <section class="locations">
            <h2>Our Locations</h2>

            <div class="location">
              <h3>Downtown Location</h3>
              <p>123 Main Street<br>San Francisco, CA 94102</p>
            </div>

            <div class="location">
              <h3>Marina Location</h3>
              <p>456 Marina Blvd<br>San Francisco, CA 94123</p>
            </div>
          </section>

          <section class="booking">
            <h2>Make a Reservation</h2>
            <iframe src="https://calendly.com/joes-bistro/reservations"></iframe>
          </section>
        </body>
      </html>
    `,
    isHomepage: false
  },

  // Blog page
  {
    url: 'https://joes-bistro.com/blog',
    html: `
      <html>
        <body>
          <h1>Latest News</h1>

          <article>
            <h2>New Fall Menu Launches</h2>
            <time datetime="2024-10-10">October 10, 2024</time>
            <p>We're excited to announce our new fall menu featuring seasonal ingredients...</p>
          </article>

          <article>
            <h2>Award-Winning Wine List</h2>
            <time datetime="2024-09-15">September 15, 2024</time>
            <p>Wine Spectator has recognized our wine program with their Award of Excellence...</p>
          </article>

          <article>
            <h2>Michelin Recognition</h2>
            <time datetime="2024-08-22">August 22, 2024</time>
            <p>Joe's Bistro receives Michelin Bib Gourmand recognition...</p>
          </article>
        </body>
      </html>
    `,
    isHomepage: false
  }
];

console.log(`📄 Analyzing ${examplePages.length} pages from Joe's Bistro...\n`);

// Extract business intelligence
const businessIntel = extractBusinessIntelligence(examplePages);

// Display results
console.log('📊 BUSINESS INTELLIGENCE REPORT');
console.log('=' .repeat(70));

console.log('\n🏢 Company Size:');
console.log(`   Employee Count: ${businessIntel.companySize.employeeCount || 'Unknown'}`);
console.log(`   Location Count: ${businessIntel.companySize.locationCount || 'Unknown'}`);
console.log(`   Confidence: ${businessIntel.companySize.confidence}`);
console.log('   Signals:');
businessIntel.companySize.signals.forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n📅 Years in Business:');
console.log(`   Founded: ${businessIntel.yearsInBusiness.foundedYear || 'Unknown'}`);
console.log(`   Years Active: ${businessIntel.yearsInBusiness.estimatedYears || 'Unknown'}`);
console.log(`   Confidence: ${businessIntel.yearsInBusiness.confidence}`);
console.log('   Signals:');
businessIntel.yearsInBusiness.signals.forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n💰 Pricing Visibility:');
console.log(`   Pricing Visible: ${businessIntel.pricingVisibility.visible ? 'Yes' : 'No'}`);
if (businessIntel.pricingVisibility.priceRange.min) {
  console.log(`   Price Range: $${businessIntel.pricingVisibility.priceRange.min} - $${businessIntel.pricingVisibility.priceRange.max}`);
}
console.log(`   Confidence: ${businessIntel.pricingVisibility.confidence}`);
console.log('   Signals:');
businessIntel.pricingVisibility.signals.slice(0, 5).forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n📰 Content Freshness:');
console.log(`   Last Update: ${businessIntel.contentFreshness.lastUpdate || 'Unknown'}`);
console.log(`   Blog Active: ${businessIntel.contentFreshness.blogActive ? 'Yes' : 'No'}`);
console.log(`   Blog Posts: ${businessIntel.contentFreshness.postCount}`);
console.log(`   Confidence: ${businessIntel.contentFreshness.confidence}`);
console.log('   Signals:');
businessIntel.contentFreshness.signals.forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n👤 Decision Maker Accessibility:');
console.log(`   Direct Email: ${businessIntel.decisionMakerAccessibility.hasDirectEmail ? 'Yes' : 'No'}`);
console.log(`   Direct Phone: ${businessIntel.decisionMakerAccessibility.hasDirectPhone ? 'Yes' : 'No'}`);
console.log(`   Owner Name: ${businessIntel.decisionMakerAccessibility.ownerName || 'Unknown'}`);
console.log(`   Confidence: ${businessIntel.decisionMakerAccessibility.confidence}`);
console.log('   Signals:');
businessIntel.decisionMakerAccessibility.signals.forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n⭐ Premium Features:');
console.log(`   Features Detected: ${businessIntel.premiumFeatures.detected.length}`);
console.log(`   Budget Indicator: ${businessIntel.premiumFeatures.budgetIndicator}`);
if (businessIntel.premiumFeatures.detected.length > 0) {
  console.log('   Features:');
  businessIntel.premiumFeatures.detected.forEach(feature => {
    console.log(`     • ${feature.replace('_', ' ')}`);
  });
}
console.log('   Signals:');
businessIntel.premiumFeatures.signals.forEach(signal => {
  console.log(`     • ${signal}`);
});

console.log('\n📄 Page Type Distribution:');
Object.entries(businessIntel.pageTypes).forEach(([type, count]) => {
  if (count > 0) {
    console.log(`   ${type}: ${count}`);
  }
});

console.log('\n📈 Summary Metadata:');
console.log(`   Total Pages Analyzed: ${businessIntel.metadata.totalPagesAnalyzed}`);
console.log(`   Homepage Found: ${businessIntel.metadata.homepageFound ? 'Yes' : 'No'}`);
console.log(`   Analysis Timestamp: ${businessIntel.metadata.timestamp}`);

console.log('\n' + '=' .repeat(70));

// Lead Qualification Score
console.log('\n🎯 LEAD QUALIFICATION SUMMARY:');
console.log('=' .repeat(70));

let qualificationScore = 0;
const reasons = [];

// Company size scoring
if (businessIntel.companySize.employeeCount >= 10) {
  qualificationScore += 20;
  reasons.push('✅ Established team (10+ employees)');
} else if (businessIntel.companySize.employeeCount >= 5) {
  qualificationScore += 10;
  reasons.push('✓ Small team (5+ employees)');
}

// Years in business scoring
if (businessIntel.yearsInBusiness.estimatedYears >= 5) {
  qualificationScore += 15;
  reasons.push('✅ Established business (5+ years)');
} else if (businessIntel.yearsInBusiness.estimatedYears >= 2) {
  qualificationScore += 8;
  reasons.push('✓ Growing business (2+ years)');
}

// Pricing visibility scoring
if (businessIntel.pricingVisibility.visible) {
  qualificationScore += 10;
  reasons.push('✅ Transparent pricing');
}

// Content freshness scoring
if (businessIntel.contentFreshness.blogActive) {
  qualificationScore += 10;
  reasons.push('✅ Active content marketing');
}

// Decision maker accessibility scoring
if (businessIntel.decisionMakerAccessibility.ownerName) {
  qualificationScore += 15;
  reasons.push('✅ Owner identified');
}
if (businessIntel.decisionMakerAccessibility.hasDirectEmail) {
  qualificationScore += 10;
  reasons.push('✅ Direct email available');
}

// Premium features scoring
if (businessIntel.premiumFeatures.budgetIndicator === 'high') {
  qualificationScore += 20;
  reasons.push('✅ High-budget features detected');
} else if (businessIntel.premiumFeatures.budgetIndicator === 'medium') {
  qualificationScore += 10;
  reasons.push('✓ Some premium features');
}

console.log(`\nQualification Score: ${qualificationScore}/100`);
console.log('\nKey Factors:');
reasons.forEach(reason => console.log(`  ${reason}`));

let rating;
if (qualificationScore >= 80) rating = 'A - Excellent Lead';
else if (qualificationScore >= 60) rating = 'B - Good Lead';
else if (qualificationScore >= 40) rating = 'C - Average Lead';
else if (qualificationScore >= 20) rating = 'D - Low Priority';
else rating = 'F - Not Qualified';

console.log(`\n🏆 Lead Rating: ${rating}`);
console.log('=' .repeat(70));
