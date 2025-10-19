# Data Extraction Audit - Current vs. Required for 2025 Personalization

**Date:** October 2025
**Purpose:** Identify gaps in current data collection to enable research-based personalization

---

## Research Requirements

Based on our 2025 research, effective personalization requires:

1. **Prospect-specific role and responsibilities**
2. **Recent company achievements or news**
3. **Company leadership information (founder, CEO, key contacts)**
4. **Industry-specific challenges they're facing**
5. **Content they've shared/published**
6. **Social media presence and engagement**

---

## Current Data Extraction

### ✅ What We're Extracting Well

**Company Information:**
- Company name (from title/domain)
- Website URL
- Industry detection (via keywords)
- Business type (ecommerce, local, saas, agency, service, general)

**Contact Information:**
- Emails (from mailto links, structured data, body text)
- Phone numbers (from text patterns)
- Contact page URLs
- Email confidence scoring
- Generic vs. specific email detection

**Technical Metrics:**
- Page title and meta description
- H1 tags
- Page load time
- Image count
- Link count
- Contact form presence
- CTA buttons
- Live chat detection
- Portfolio/work section detection
- Portfolio item count (clickable links)
- Testimonials presence

**Mobile Analysis:**
- Mobile vs desktop differences
- Click-to-call link detection
- Mobile menu presence
- CTA button sizes and tappability
- Above-fold content analysis

**SEO Data** (if module enabled):
- Sitemap existence
- Robots.txt
- Structured data
- Image alt tags
- Canonical tags

**Visual Data** (if module enabled):
- Design quality analysis
- Color schemes
- Layout analysis
- Screenshot analysis

---

## ❌ Major Gaps for 2025 Personalization

### 1. Company News & Achievements (CRITICAL)

**What We Need:**
- Recent blog posts or news articles
- Company milestones (funding, expansions, awards)
- Recent press mentions
- Product launches or updates
- Team growth announcements

**Current Status:** ❌ Not extracting

**Why It Matters:**
- Research shows referencing recent achievements increases reply rates by 32%
- Demonstrates genuine research and interest
- Provides natural conversation starters
- Shows message is not a template

**Example Personalization:**
```
❌ Generic: "I looked at your website..."
✅ With news: "Congrats on the Series A funding announcement last month!
   I checked out your website and noticed..."
```

---

### 2. Leadership & Team Information (CRITICAL)

**What We Need:**
- Founder/CEO name and background
- Key team members (CTO, VP Sales, etc.)
- Team member titles and roles
- LinkedIn profiles for decision-makers
- Team bios and expertise
- Years in business / founder experience

**Current Status:** ⚠️ Partial
- Extracting names from "About/Team/Founder" text
- Basic pattern matching for names
- Very limited - often misses or gets wrong person

**Why It Matters:**
- Need to address THE RIGHT PERSON (not generic info@)
- Decision-maker titles help tailor messaging
- Founder backstory creates connection points
- LinkedIn outreach requires specific profiles

**Example Personalization:**
```
❌ Generic: "Hi there, I'm reaching out about your website..."
✅ With leadership: "Hi Sarah, saw you founded the company in 2018 after
   leaving Google. I checked out your website and noticed..."
```

---

### 3. Published Content & Thought Leadership (HIGH PRIORITY)

**What We Need:**
- Blog post titles and topics
- Recent content themes
- Whitepapers or resources offered
- Newsletter sign-ups
- Podcast or video content
- Social media posts (Twitter, LinkedIn)

**Current Status:** ❌ Not extracting

**Why It Matters:**
- Shows what topics/challenges they care about
- Provides conversation hooks ("Loved your post on...")
- Indicates their expertise areas
- Shows engagement level with audience

**Example Personalization:**
```
❌ Generic: "I can help improve your website..."
✅ With content: "Read your recent blog post on scaling customer support -
   great insights! I noticed your website could better showcase that expertise..."
```

---

### 4. Social Media Profiles & Engagement (HIGH PRIORITY)

**What We Need:**
- LinkedIn company page URL
- LinkedIn founder/key employee profiles
- Instagram business handle
- Twitter/X handle
- Facebook page
- YouTube channel
- Follower counts (gauge reach/maturity)
- Recent post topics

**Current Status:** ❌ Not extracting systematically
- Contact module finds some links but doesn't parse social URLs
- No structured social media extraction
- Missing engagement metrics

**Why It Matters:**
- Multi-channel outreach requires these profiles
- LinkedIn connection requests need profile URLs
- Instagram DMs need handles
- Follower count indicates business size/success
- Recent posts show current focus areas

**Example Use:**
```
Current: Find email, send email, hope for response
Better: Find email + LinkedIn + Instagram →
        Send email Day 1 →
        LinkedIn connect Day 2 →
        Instagram follow Day 3 →
        LinkedIn DM Day 9 →
        Instagram DM Day 15
```

---

### 5. Business Specifics & Challenges (MEDIUM PRIORITY)

**What We Need:**
- Target audience/customer type mentioned
- Problems they solve (their value prop)
- Geographic service area
- Pricing transparency (shows for/hides from)
- Customer count or size indicators
- Industry certifications or partnerships
- Competitors mentioned
- Pain points expressed in content

**Current Status:** ⚠️ Very limited
- Industry detection gives general category
- Some business type detection (local, ecommerce, etc.)
- Missing specific challenges and positioning

**Why It Matters:**
- Tailor outreach to THEIR customer problems
- Reference specific pain points in your pitch
- Understand if they're B2B vs. B2C
- Know if they're local/regional/national/global

**Example Personalization:**
```
❌ Generic: "Your website needs improvement..."
✅ With specifics: "I see you're targeting enterprise SaaS companies -
   your homepage could do more to address their long sales cycle concerns..."
```

---

### 6. Contact Context & Intent Signals (MEDIUM PRIORITY)

**What We Need:**
- Job postings (especially for web/marketing roles)
- "We're hiring" indicators
- Recent site redesign indicators
- "Coming soon" or "Under construction" pages
- Error pages or broken links
- Site freshness (last update date)
- Domain age
- Technology stack (shows technical sophistication)

**Current Status:** ❌ Not extracting

**Why It Matters:**
- Hiring web/marketing staff = high intent for our services
- Recent redesign = likely not interested yet
- Old site = higher likelihood they need help
- Broken parts = easy conversation starter
- Tech stack helps qualify if they need technical help

**Example Personalization:**
```
❌ Generic: "Would you be interested in web design services?"
✅ With intent: "Noticed you're hiring a digital marketing manager -
   perfect timing to make sure your site converts the traffic they'll drive..."
```

---

### 7. Competitive Intelligence (LOW PRIORITY - FUTURE)

**What We Need:**
- Direct competitors mentioned on site
- "Compare us to..." pages
- Competitor analysis from web search
- Market positioning statements
- Unique selling propositions

**Current Status:** ⚠️ Partial (competitor module exists but limited)

**Why It Matters:**
- Understand their competitive landscape
- Reference what competitors are doing better
- Position services relative to their market

---

## Extraction Priority Matrix

### Phase 2A: Essential for Effective Personalization (DO NOW)

1. **Company News & Recent Content** ⭐⭐⭐⭐⭐
   - Blog post extraction
   - News/announcement section scraping
   - Last update date detection

2. **Leadership & Team Information** ⭐⭐⭐⭐⭐
   - About page deep scraping
   - Team page scraping
   - Founder/CEO identification
   - LinkedIn profile finding

3. **Social Media Profile Discovery** ⭐⭐⭐⭐⭐
   - LinkedIn company page URL
   - Instagram handle
   - Twitter/X handle
   - Systematic footer/header link extraction

### Phase 2B: Valuable for Personalization (DO SOON)

4. **Business Context & Value Proposition** ⭐⭐⭐⭐
   - Service descriptions
   - Target market indicators
   - Pricing information visibility
   - Geographic reach

5. **Intent Signals** ⭐⭐⭐⭐
   - Job postings detection
   - "Hiring" page scraping
   - Site freshness indicators
   - Broken link detection

### Phase 2C: Nice-to-Have Enhancements (FUTURE)

6. **Advanced Content Analysis** ⭐⭐⭐
   - Content topic classification
   - Tone and voice analysis
   - Audience sophistication level

7. **External Data Sources** ⭐⭐⭐
   - LinkedIn company data API
   - News API for press mentions
   - Domain age/registration info
   - Technology detection (BuiltWith, Wappalyzer)

---

## Proposed New Data Structure

```javascript
// Current structure (simplified)
{
  url: "https://example.com",
  companyName: "Example Corp",
  title: "Example Corp | Web Design",
  bodyText: "Welcome to our site...",
  contact: {
    email: "john@example.com",
    phone: "(555) 123-4567"
  }
}

// Proposed enhanced structure
{
  url: "https://example.com",
  companyName: "Example Corp",

  // NEW: Company intelligence
  companyInfo: {
    yearFounded: 2018,
    teamSize: "15-50 employees",
    location: "San Francisco, CA",
    businessType: "B2B SaaS",
    targetMarket: "Enterprise companies",
    valueProposition: "Simplify project management for distributed teams"
  },

  // NEW: Leadership & team
  team: {
    founder: {
      name: "Sarah Johnson",
      title: "Founder & CEO",
      linkedIn: "https://linkedin.com/in/sarahjohnson",
      bio: "Former Google PM, started company in 2018..."
    },
    keyContacts: [
      {
        name: "Mike Chen",
        title: "VP of Sales",
        email: "mike@example.com",
        linkedIn: "https://linkedin.com/in/mikechen"
      }
    ],
    teamPageUrl: "https://example.com/about/team"
  },

  // NEW: Recent news & content
  content: {
    recentBlogPosts: [
      {
        title: "How We Scaled to 10,000 Users",
        url: "https://example.com/blog/scaling",
        date: "2025-09-15",
        summary: "Lessons learned from rapid growth..."
      }
    ],
    recentNews: [
      {
        headline: "Example Corp Raises $5M Series A",
        source: "TechCrunch",
        date: "2025-08-20",
        url: "https://techcrunch.com/..."
      }
    ],
    lastContentUpdate: "2025-10-01"
  },

  // NEW: Social media presence
  socialMedia: {
    linkedIn: {
      companyPage: "https://linkedin.com/company/example-corp",
      foundersProfile: "https://linkedin.com/in/sarahjohnson",
      followerCount: 2500
    },
    instagram: {
      handle: "@examplecorp",
      url: "https://instagram.com/examplecorp",
      followerCount: 1200
    },
    twitter: {
      handle: "@examplecorp",
      url: "https://twitter.com/examplecorp",
      followerCount: 850
    }
  },

  // NEW: Intent signals
  intentSignals: {
    isHiring: true,
    hiringRoles: ["Marketing Manager", "Senior Developer"],
    jobsPageUrl: "https://example.com/careers",
    recentRedesign: false,
    siteAge: "7 years",
    lastMajorUpdate: "2024-06-15",
    hasBrokenLinks: false,
    hasUnderConstructionPages: false
  },

  // EXISTING: Contact info (enhanced)
  contact: {
    emails: [
      {
        address: "john@example.com",
        type: "specific",
        confidence: 0.9,
        foundOn: "About page"
      }
    ],
    phones: ["(555) 123-4567"],
    contactPageUrl: "https://example.com/contact"
  },

  // EXISTING: Technical analysis
  technicalAnalysis: {
    title: "Example Corp | Web Design",
    metaDescription: "...",
    h1Tags: ["Welcome to Example Corp"],
    loadTime: 2100,
    // ... rest of existing data
  }
}
```

---

## Implementation Plan

### Phase 2A: Core Personalization Data (Week 1-2)

**Goal:** Extract the minimum data needed for effective 2025 personalization

**New Modules to Create:**

1. **`modules/company-intel.js`**
   - Extract company founding info, location, size
   - Detect business model (B2B, B2C, hybrid)
   - Identify target market from content
   - Find value proposition statements

2. **`modules/team-scraper.js`**
   - Deep scrape /about, /team, /leadership pages
   - Extract founder/CEO name and bio
   - Find key team members with titles
   - Detect LinkedIn profiles in bios
   - Parse years of experience

3. **`modules/content-scraper.js`**
   - Find and scrape blog URLs
   - Extract recent post titles and dates
   - Detect news/announcements sections
   - Find resource/download offers
   - Calculate content freshness

4. **`modules/social-finder.js`**
   - Systematic search for social media links
   - Parse LinkedIn company page URLs
   - Extract Instagram handles
   - Find Twitter/X handles
   - Detect YouTube channels
   - Validate and normalize URLs

**Enhanced Existing Modules:**

5. **Update `modules/contact.js`**
   - Better name extraction with titles
   - LinkedIn profile URL extraction
   - Role/title detection
   - Confidence scoring for decision-makers

6. **Update `modules/crawler.js`**
   - Prioritize /about, /team, /blog, /news pages
   - Follow pagination on blog pages
   - Detect and scrape careers/jobs pages

---

### Phase 2B: Intent & Context Data (Week 3)

**Goal:** Add signals that indicate timing and fit

**New Modules:**

7. **`modules/intent-detector.js`**
   - Scan for job postings
   - Detect "We're hiring" language
   - Find careers page
   - Check for recent redesign indicators
   - Detect site age and freshness
   - Find broken links (quick check)

8. **`modules/business-context.js`**
   - Extract service descriptions
   - Identify pricing page and transparency
   - Detect geographic service area
   - Find customer testimonials with details
   - Parse case study outcomes

---

### Phase 2C: External Data (Week 4 - Optional)

**Goal:** Enrich with data beyond the website

**External Integrations:**

9. **LinkedIn Company API** (if available)
   - Company size
   - Industry classification
   - Recent posts
   - Employee count

10. **News API** (optional)
    - Press mentions
    - Funding announcements
    - Major milestones

11. **Domain Intelligence** (optional)
    - Domain age (WHOIS)
    - Technology stack (BuiltWith API)
    - Traffic estimates (SimilarWeb API)

---

## Technical Approach

### 1. Multi-Page Crawler Enhancement

Update crawler to prioritize pages with personalization data:

```javascript
const PRIORITY_PAGES = {
  CRITICAL: ['/about', '/team', '/leadership', '/founders', '/our-story'],
  HIGH: ['/blog', '/news', '/press', '/careers', '/jobs'],
  MEDIUM: ['/contact', '/services', '/pricing', '/case-studies'],
  LOW: ['/privacy', '/terms', '/sitemap']
};
```

### 2. Targeted Selectors

Create specific selectors for each data type:

```javascript
// Team member extraction
const TEAM_SELECTORS = [
  '.team-member',
  '.staff-profile',
  '[class*="employee"]',
  '[class*="team-card"]'
];

// Social media link patterns
const SOCIAL_PATTERNS = {
  linkedIn: /linkedin\.com\/company\/([^\/\s]+)/,
  instagram: /instagram\.com\/([^\/\s]+)/,
  twitter: /(?:twitter|x)\.com\/([^\/\s]+)/
};

// Blog post patterns
const BLOG_SELECTORS = [
  'article',
  '.blog-post',
  '.post-card',
  '[class*="article-"]'
];
```

### 3. Structured Data First

Prioritize structured data (JSON-LD) before regex:

```javascript
// Check for structured data
const orgData = findStructuredData(page, 'Organization');
if (orgData) {
  company.foundingDate = orgData.foundingDate;
  company.founder = orgData.founder?.name;
  company.address = orgData.address;
}
```

### 4. Fallback Chain

Use multiple extraction methods with fallbacks:

```javascript
// Example: Founder name extraction chain
const founderName =
  findInStructuredData() ||        // 1. JSON-LD
  findInAboutPage() ||              // 2. About page
  findInTeamPage() ||               // 3. Team page
  findInFooter() ||                 // 4. Footer copyright
  null;                             // 5. Not found
```

### 5. Confidence Scoring

Score each extracted data point:

```javascript
{
  founderName: "Sarah Johnson",
  confidence: 0.95,  // High confidence (from structured data)
  source: "JSON-LD",
  foundOn: "https://example.com/about"
}
```

---

## Testing Strategy

### Test Sites by Category

**Simple Sites (Good for Testing):**
- Personal portfolios
- Local businesses
- Restaurants

**Medium Complexity:**
- Small agencies
- SaaS companies
- E-commerce stores

**Complex Sites:**
- Enterprise companies
- News publications
- Large marketplaces

### Test Cases

For each extraction module, test:

1. **Happy path:** Data exists and is well-structured
2. **Partial data:** Some fields missing
3. **No data:** Page doesn't have this info
4. **Malformed data:** Data exists but poorly formatted
5. **Multiple sources:** Data in multiple locations (which to prioritize?)

---

## Success Metrics

### Extraction Quality

- **Coverage:** % of sites where we find each data type
- **Accuracy:** % of extracted data that's correct (manual validation)
- **Confidence:** Average confidence score per data type

### Personalization Impact

- **Before enhancement:** Email open/reply rates with current data
- **After enhancement:** Email open/reply rates with new personalization
- **Target improvement:** +20-30% reply rate with better personalization

---

## Next Steps

1. **Create Phase 2A branch** for new extraction modules
2. **Start with social media finder** (easiest, high impact)
3. **Then team scraper** (critical for addressing right person)
4. **Then content scraper** (news/blog for conversation hooks)
5. **Test on 20-30 diverse websites**
6. **Iterate based on extraction success rates**
7. **Once extraction is solid, move to Phase 3 (prompt refinement)**

---

## Questions to Resolve

1. **External APIs:** Should we use paid APIs (LinkedIn, news) or stay with free web scraping?
2. **Rate limiting:** How to handle slow page loads and large sites?
3. **Storage:** Store in database immediately (Phase 4) or wait until extraction is solid?
4. **Validation:** Manual validation process for new extraction?
5. **Fallbacks:** What to do when data isn't found? Skip personalization or use generic?

---

**Next Document:** [04-enhanced-extraction-implementation.md](04-enhanced-extraction-implementation.md)
