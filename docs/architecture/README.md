# Analysis Engine Scrapers

This directory contains web scraping and data extraction modules for the Analysis Engine.

## Modules

### 1. `html-parser.js`

Parses HTML content to extract SEO, content, social media, and structural data.

**Key Functions:**
- `parseHTML(html, url)` - Main parser that extracts all data
- `extractSEOData($, url)` - SEO metadata, headings, Open Graph, Twitter Cards
- `extractContentData($)` - Content analysis, word count, blog posts, CTAs
- `extractSocialData($)` - Social media links and presence
- `getContentSummary(parsedData)` - Human-readable content summary

**Usage:**
```javascript
import { parseHTML } from './scrapers/html-parser.js';

const html = '<html>...</html>';
const data = parseHTML(html, 'https://example.com');

console.log(data.seo.title);
console.log(data.content.wordCount);
console.log(data.social.platformsPresent);
```

### 2. `screenshot-capture.js`

Captures website screenshots using Playwright for visual analysis.

**Features:**
- Full-page screenshots
- Viewport configuration
- Error handling
- Image optimization

### 3. `business-intelligence-extractor.js`

**NEW**: Intelligently parses HTML from multiple crawled pages to extract comprehensive business signals for lead qualification.

## Business Intelligence Extractor

### Overview

The Business Intelligence Extractor analyzes multiple pages from a website to build a complete business profile. It goes beyond simple parsing to extract actionable intelligence about:

- **Company Size**: Employee count, locations, team structure
- **Years in Business**: Founded date, business age, stability indicators
- **Pricing Visibility**: Public pricing, price ranges, transparency
- **Content Freshness**: Blog activity, last updates, marketing investment
- **Decision Maker Accessibility**: Direct contact info, owner/CEO identification
- **Premium Features**: Expensive tools indicating budget (live chat, booking systems, CRM)

### Architecture

```
extractBusinessIntelligence(crawledPages)
    ↓
Detect Page Types (About, Services, Team, Contact, etc.)
    ↓
Extract Signals from Each Page Type
    ↓
Aggregate Signals Across All Pages
    ↓
Calculate Confidence Levels
    ↓
Return Comprehensive Business Profile
```

### Key Features

#### 1. Adaptive Page Type Detection

Automatically identifies page types from URL patterns and content:

```javascript
detectPageType('https://example.com/about-us', $)
// Returns: 'about'

detectPageType('https://example.com/our-team', $)
// Returns: 'team'
```

Supported page types:
- `about` - Company information
- `services` - Service offerings
- `team` - Team members, employee bios
- `contact` - Contact information
- `pricing` - Pricing packages
- `portfolio` - Work samples, case studies
- `blog` - Blog posts, news articles
- `locations` - Multiple office/store locations
- `testimonials` - Client reviews
- `other` - Unrecognized pages

#### 2. Company Size Extraction

**Sources:**
- Team member cards/sections on Team pages
- Text mentions: "team of 15", "12 employees"
- Location listings
- About page descriptions

**Output:**
```javascript
{
  employeeCount: 12,
  locationCount: 2,
  signals: [
    'Mentions "12 professionals"',
    'Team page shows 5 members',
    '2 locations found on Locations page'
  ],
  confidence: 'high'  // high, medium, low, none
}
```

#### 3. Years in Business

**Sources:**
- Copyright year ranges: `© 2015-2024`
- Text patterns: "Since 2015", "Est. 2015", "Founded in 2015"
- Experience claims: "20 years of experience"

**Output:**
```javascript
{
  estimatedYears: 9,
  foundedYear: 2015,
  signals: [
    'Copyright © 2015-2024',
    'Mentions: "since 2015"'
  ],
  confidence: 'high'
}
```

#### 4. Pricing Visibility

**Sources:**
- Dollar amounts in text: `$1,000`, `$50-100`
- Pricing tables and package cards
- Menu prices (for restaurants)
- Service rate listings

**Features:**
- Filters out unrealistic prices (e.g., year numbers)
- Detects price ranges
- Identifies pricing transparency

**Output:**
```javascript
{
  visible: true,
  priceRange: { min: 50, max: 5000 },
  signals: [
    'Price range: $500 - $5,000 on pricing',
    'Price found: $1,200 on services'
  ],
  confidence: 'medium'
}
```

#### 5. Content Freshness

**Sources:**
- Blog post dates (from `<time datetime>` tags)
- "Last updated" mentions
- Copyright year (indicates site maintenance)
- Article publication dates

**Output:**
```javascript
{
  lastUpdate: '2024-10-15',
  blogActive: true,
  postCount: 12,
  signals: [
    'Most recent content: 5 days ago',
    'Blog last post 2 weeks ago',
    'Copyright updated to 2024'
  ],
  confidence: 'high'
}
```

#### 6. Decision Maker Accessibility

**Sources:**
- Email addresses (direct vs. generic)
- Phone numbers
- Owner/CEO names from About/Team pages
- Contact forms (less direct)

**Features:**
- Distinguishes owner emails (ceo@, founder@) from generic (info@, contact@)
- Filters spam addresses (noreply@, donotreply@)
- Extracts names from email addresses
- Identifies decision maker bios

**Output:**
```javascript
{
  hasDirectEmail: true,
  hasDirectPhone: true,
  ownerName: 'John Smith',
  signals: [
    'Decision maker email found: john@example.com',
    '1 phone number found',
    'About page mentions: John Smith'
  ],
  confidence: 'high'
}
```

#### 7. Premium Features Detection

**Detectable Features:**
- **Live Chat**: Intercom, Drift, Tawk.to, Zendesk
- **Booking Systems**: Calendly, Acuity, Schedulicity
- **E-commerce**: Shopify, WooCommerce, cart systems
- **Member Portals**: Login areas, client dashboards
- **CRM Integrations**: HubSpot, Salesforce, Pipedrive
- **Email Marketing**: Mailchimp, ConvertKit, Klaviyo
- **Payment Processors**: Stripe, PayPal, Square

**Budget Indicator:**
- `high` - 4+ premium features
- `medium` - 1-3 premium features
- `low` - 0 premium features

**Output:**
```javascript
{
  detected: ['live_chat', 'booking_system', 'payment_processor'],
  signals: [
    'live chat detected: intercom',
    'booking system detected: calendly',
    'payment processor detected: stripe'
  ],
  budgetIndicator: 'medium'
}
```

### Usage

#### Basic Usage

```javascript
import { extractBusinessIntelligence } from './scrapers/business-intelligence-extractor.js';

// Crawled pages from your web crawler
const crawledPages = [
  {
    url: 'https://example.com',
    html: '<html>...</html>',
    isHomepage: true
  },
  {
    url: 'https://example.com/about',
    html: '<html>...</html>',
    isHomepage: false
  },
  // ... more pages
];

const businessIntel = extractBusinessIntelligence(crawledPages);

console.log(businessIntel.companySize);
console.log(businessIntel.yearsInBusiness);
console.log(businessIntel.pricingVisibility);
console.log(businessIntel.contentFreshness);
console.log(businessIntel.decisionMakerAccessibility);
console.log(businessIntel.premiumFeatures);
console.log(businessIntel.pageTypes);
```

#### Integration with Web Crawler

```javascript
import { crawlWebsite } from './crawler.js';
import { extractBusinessIntelligence } from './scrapers/business-intelligence-extractor.js';

// Step 1: Crawl website
const pages = await crawlWebsite('https://example.com', {
  maxPages: 30,
  depth: 2
});

// Step 2: Extract business intelligence
const businessIntel = extractBusinessIntelligence(pages);

// Step 3: Use for lead qualification
const score = calculateLeadScore(businessIntel);
const rating = getLeadRating(score);

console.log(`Lead Rating: ${rating}`);
```

#### Lead Qualification Example

```javascript
function calculateLeadScore(businessIntel) {
  let score = 0;

  // Company size scoring
  if (businessIntel.companySize.employeeCount >= 10) {
    score += 20;
  } else if (businessIntel.companySize.employeeCount >= 5) {
    score += 10;
  }

  // Years in business scoring
  if (businessIntel.yearsInBusiness.estimatedYears >= 5) {
    score += 15;
  }

  // Pricing visibility
  if (businessIntel.pricingVisibility.visible) {
    score += 10;
  }

  // Content freshness
  if (businessIntel.contentFreshness.blogActive) {
    score += 10;
  }

  // Decision maker accessibility
  if (businessIntel.decisionMakerAccessibility.ownerName) {
    score += 15;
  }
  if (businessIntel.decisionMakerAccessibility.hasDirectEmail) {
    score += 10;
  }

  // Premium features
  if (businessIntel.premiumFeatures.budgetIndicator === 'high') {
    score += 20;
  } else if (businessIntel.premiumFeatures.budgetIndicator === 'medium') {
    score += 10;
  }

  return score;
}

function getLeadRating(score) {
  if (score >= 80) return 'A - Excellent Lead';
  if (score >= 60) return 'B - Good Lead';
  if (score >= 40) return 'C - Average Lead';
  if (score >= 20) return 'D - Low Priority';
  return 'F - Not Qualified';
}
```

### Configuration

The extractor reads settings from `../config/scraper-config.json`:

```json
{
  "business_intelligence": {
    "page_type_detection": {
      "patterns": {
        "about": ["about", "about-us", "who-we-are"],
        "services": ["services", "what-we-do", "solutions"],
        "team": ["team", "staff", "employees"],
        "contact": ["contact", "contact-us"],
        "pricing": ["pricing", "plans", "packages"],
        "portfolio": ["portfolio", "work", "projects"],
        "blog": ["blog", "news", "articles"],
        "locations": ["locations", "offices", "branches"],
        "testimonials": ["testimonials", "reviews", "clients"]
      }
    }
  }
}
```

### Testing

```bash
# Run comprehensive test suite
cd analysis-engine
node tests/test-business-intelligence-extractor.js

# Run interactive demo
node tests/demo-business-intelligence-extractor.js
```

**Test Coverage:**
- ✅ 35 tests covering all extraction functions
- ✅ Page type detection
- ✅ Company size extraction
- ✅ Years in business calculation
- ✅ Pricing visibility detection
- ✅ Content freshness analysis
- ✅ Decision maker identification
- ✅ Premium features detection
- ✅ Multi-page aggregation
- ✅ Edge cases and error handling
- ✅ Confidence level calculation

### Output Schema

```typescript
interface BusinessIntelligence {
  companySize: {
    employeeCount: number | null;
    locationCount: number | null;
    signals: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
  };

  yearsInBusiness: {
    estimatedYears: number | null;
    foundedYear: number | null;
    signals: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
  };

  pricingVisibility: {
    visible: boolean;
    priceRange: { min: number | null; max: number | null };
    signals: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
  };

  contentFreshness: {
    lastUpdate: string | null; // ISO date
    blogActive: boolean;
    postCount: number;
    signals: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
  };

  decisionMakerAccessibility: {
    hasDirectEmail: boolean;
    hasDirectPhone: boolean;
    ownerName: string | null;
    signals: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
  };

  premiumFeatures: {
    detected: string[]; // ['live_chat', 'booking_system', ...]
    signals: string[];
    budgetIndicator: 'high' | 'medium' | 'low' | 'unknown';
  };

  pageTypes: {
    about: number;
    services: number;
    team: number;
    contact: number;
    pricing: number;
    portfolio: number;
    blog: number;
    locations: number;
    testimonials: number;
    other: number;
  };

  metadata: {
    totalPagesAnalyzed: number;
    homepageFound: boolean;
    timestamp: string; // ISO timestamp
  };
}
```

### Confidence Levels

Each extraction category includes a confidence level:

- **high**: Multiple reliable signals from dedicated pages (e.g., Team page with member cards)
- **medium**: Text-based mentions or single sources (e.g., "team of 10" on About page)
- **low**: No clear signals found, but some context available
- **none**: No data found

Use confidence levels to:
- Weight different signals in lead scoring
- Determine if manual verification is needed
- Filter out unreliable data

### Best Practices

1. **Crawl Strategy**: Always crawl ALL level-1 navigation pages (About, Services, Contact, Team) for complete business intelligence.

2. **Page Sampling**: For level-2+ pages, 50% sampling is usually sufficient while keeping costs down.

3. **Data Validation**: Check confidence levels before using extracted data for automated decisions.

4. **Signal Tracking**: Use the `signals` arrays to understand HOW data was extracted (helpful for debugging).

5. **Aggregation**: More pages = better accuracy. Aim for 10-30 pages per site.

6. **Error Handling**: The extractor gracefully handles malformed HTML, missing pages, and null inputs.

### Performance

- **Speed**: ~50-100ms per page (pure parsing, no network calls)
- **Memory**: Minimal - processes one page at a time
- **Scalability**: Handles 100+ pages without issues

### Limitations

- **Language**: Currently optimized for English websites
- **Accuracy**: Depends on page structure and content quality
- **False Positives**: May detect prices in unrelated contexts (filtered where possible)
- **Name Extraction**: Basic pattern matching, not NER (Named Entity Recognition)

### Future Enhancements

Potential improvements:
- [ ] Multi-language support (detect and parse non-English text)
- [ ] Advanced NER for more accurate owner name extraction
- [ ] Social media follower count extraction
- [ ] Employee LinkedIn profile linking
- [ ] Revenue estimations from public data
- [ ] Technology stack detection (beyond premium features)
- [ ] Industry classification
- [ ] Competitor identification

---

## Development

### Adding New Signal Types

1. Create extraction function in `business-intelligence-extractor.js`
2. Add to main `extractBusinessIntelligence()` aggregation
3. Update output schema
4. Write tests in `test-business-intelligence-extractor.js`
5. Update this README

### Testing Your Changes

```bash
# Run specific test
node tests/test-business-intelligence-extractor.js

# Run demo with example data
node tests/demo-business-intelligence-extractor.js

# Validate against real website
node -e "
import { extractBusinessIntelligence } from './scrapers/business-intelligence-extractor.js';
// Add your test code here
"
```

---

**Built for MaxantAgency Analysis Engine v2.0**
