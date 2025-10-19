# Social Media Content Generation - Data Requirements

## Current Leads Table Analysis

### ✅ What You Already Have (Great for Social!)

**Company Intelligence:**
- `company_name` - Brand name
- `industry` - Industry context
- `location` - Local/regional content
- `founding_year` - Anniversary content potential
- `company_description` - Brand story
- `value_proposition` - Core messaging
- `target_audience` - Who to speak to
- `services` - What to promote

**Social Profiles:**
- `social_profiles` (JSONB) - LinkedIn, Instagram, Facebook URLs
- Can analyze their existing content

**Content Intelligence:**
- `has_active_blog` - Content marketing activity
- `recent_blog_posts` - Recent topics they care about
- `last_content_update` - Content freshness

**Team Info:**
- `team_info` (JSONB) - Founder/team for humanizing content

**Business Intel:**
- `website_score` - Quality indicator
- `critiques_*` - Pain points/opportunities
- `tech_stack` - Technical capabilities

---

## 🎯 What I NEED for Social Media Content

### 1. **Recent Achievements & Milestones** (CRITICAL)

```sql
-- Add to leads table:
recent_achievements JSONB

-- Expected structure:
{
  "awards": [
    {
      "name": "Best Local Restaurant 2024",
      "source": "City Magazine",
      "date": "2024-09-15",
      "description": "Voted best in category"
    }
  ],
  "milestones": [
    {
      "type": "anniversary",
      "description": "15 years in business",
      "date": "2024-06-01"
    },
    {
      "type": "expansion",
      "description": "Opened 2nd location",
      "date": "2024-08-20"
    }
  ],
  "certifications": [
    {
      "name": "Organic Certified",
      "issuer": "USDA",
      "date": "2024-01-10"
    }
  ],
  "partnerships": [
    {
      "partner": "Local Farm Co-op",
      "type": "supplier",
      "announced": "2024-05-12"
    }
  ]
}
```

**Why:** Achievements = engagement gold. Perfect for LinkedIn announcements, Instagram stories, Facebook community posts.

---

### 2. **Customer Social Proof** (CRITICAL)

```sql
-- Add to leads table:
customer_testimonials JSONB

-- Expected structure:
{
  "reviews": [
    {
      "author": "Sarah M.",
      "rating": 5,
      "text": "Amazing service! Best experience ever.",
      "date": "2024-09-28",
      "platform": "Google",
      "verified": true
    }
  ],
  "case_studies": [
    {
      "customer": "Local Corp",
      "problem": "Needed better website",
      "solution": "Redesign + SEO",
      "result": "50% more leads",
      "metrics": {"leads_increase": "50%", "conversion_up": "25%"}
    }
  ],
  "success_metrics": {
    "total_customers": 500,
    "average_rating": 4.8,
    "repeat_customer_rate": "85%"
  }
}
```

**Why:** Testimonials for Instagram quotes, case studies for LinkedIn thought leadership, metrics for Facebook ads.

---

### 3. **Visual Content Metadata** (IMPORTANT)

```sql
-- Add to leads table:
visual_assets JSONB

-- Expected structure:
{
  "brand_colors": {
    "primary": "#FF5722",
    "secondary": "#2196F3",
    "accent": "#FFC107"
  },
  "logo_url": "https://...",
  "product_images": [
    {
      "url": "https://...",
      "description": "Signature dish - pasta carbonara",
      "tags": ["food", "italian", "bestseller"]
    }
  ],
  "team_photos": [
    {
      "url": "https://...",
      "people": ["Chef Marco", "Owner Lisa"],
      "context": "Kitchen team"
    }
  ],
  "location_images": [
    {
      "url": "https://...",
      "description": "Outdoor patio seating"
    }
  ],
  "brand_style": "modern, minimalist, friendly"
}
```

**Why:** Instagram needs images, Facebook needs visuals, LinkedIn needs professional photos. Can't create posts without knowing what visual assets exist.

---

### 4. **Recent Company News** (IMPORTANT)

```sql
-- Add to leads table:
company_news JSONB

-- Expected structure:
{
  "press_releases": [
    {
      "title": "Restaurant launches new vegan menu",
      "date": "2024-09-15",
      "summary": "Expanding to serve plant-based customers",
      "url": "https://..."
    }
  ],
  "team_updates": [
    {
      "type": "new_hire",
      "name": "Chef Maria Rodriguez",
      "role": "Head Pastry Chef",
      "date": "2024-08-01",
      "bio": "15 years experience from NYC"
    }
  ],
  "new_services": [
    {
      "service": "Catering",
      "launched": "2024-07-01",
      "description": "Now offering corporate catering"
    }
  ],
  "events": [
    {
      "name": "Wine Tasting Night",
      "date": "2024-10-30",
      "type": "promotional",
      "description": "Monthly wine pairing event"
    }
  ]
}
```

**Why:** Fresh news = fresh content. LinkedIn loves announcements, Facebook loves events, Instagram loves behind-the-scenes.

---

### 5. **Brand Voice & Personality** (NICE TO HAVE)

```sql
-- Add to leads table:
brand_voice JSONB

-- Expected structure:
{
  "tone": "friendly, professional, approachable",
  "personality_traits": ["authentic", "community-focused", "innovative"],
  "voice_examples": [
    "We don't just serve food, we create experiences",
    "15 years of bringing families together"
  ],
  "avoid": ["overly formal", "corporate jargon", "pushy sales"],
  "emoji_usage": "moderate",
  "hashtag_strategy": ["#LocalEats", "#PhillyFood", "#FarmToTable"]
}
```

**Why:** Consistent brand voice across platforms. LinkedIn is more professional, Instagram more casual - need to know their style.

---

### 6. **Community & Local Involvement** (NICE TO HAVE)

```sql
-- Add to leads table:
community_involvement JSONB

-- Expected structure:
{
  "charity_partnerships": [
    {
      "organization": "Local Food Bank",
      "type": "monthly_donation",
      "started": "2023-01-01",
      "description": "Donate 100 meals monthly"
    }
  ],
  "local_events": [
    {
      "event": "Philly Restaurant Week",
      "participation": "2024-09-15 to 2024-09-30",
      "special_offering": "Prix fixe menu"
    }
  ],
  "sponsorships": [
    {
      "sponsored": "Little League Team",
      "type": "youth_sports",
      "year": 2024
    }
  ]
}
```

**Why:** Community content performs AMAZINGLY on Facebook and LinkedIn. Shows values, builds local brand.

---

### 7. **Product/Service Highlights** (IMPORTANT)

```sql
-- Add to leads table:
offerings_detail JSONB

-- Expected structure:
{
  "featured_products": [
    {
      "name": "Signature Carbonara",
      "category": "pasta",
      "description": "Made with farm-fresh eggs",
      "price": "$18",
      "bestseller": true,
      "dietary_tags": ["vegetarian"],
      "customer_favorite": true
    }
  ],
  "seasonal_offerings": [
    {
      "name": "Pumpkin Ravioli",
      "season": "fall",
      "available": "Sept-Nov",
      "new": true
    }
  ],
  "service_features": [
    {
      "feature": "Online Ordering",
      "description": "Order for pickup or delivery",
      "benefit": "Skip the wait"
    }
  ],
  "unique_selling_points": [
    "Only restaurant in Philly with wood-fired pizza oven from Naples",
    "Organic ingredients sourced from local farms within 50 miles"
  ]
}
```

**Why:** Need specifics to create compelling "Why buy from us" posts. Instagram loves product shots, LinkedIn loves unique value props.

---

### 8. **Existing Social Media Performance** (NICE TO HAVE)

```sql
-- Add to leads table:
social_media_analytics JSONB

-- Expected structure:
{
  "linkedin": {
    "followers": 1250,
    "engagement_rate": "3.2%",
    "top_performing_content": [
      {
        "type": "company_update",
        "topic": "new_hire",
        "engagement": 145
      }
    ],
    "post_frequency": "2x per week",
    "best_posting_time": "Tuesday 9am"
  },
  "instagram": {
    "followers": 3400,
    "engagement_rate": "5.8%",
    "top_hashtags": ["#PhillyEats", "#FoodPorn"],
    "top_performing_content": [
      {
        "type": "photo",
        "topic": "food_styling",
        "likes": 520
      }
    ]
  },
  "facebook": {
    "followers": 2100,
    "page_likes": 1950,
    "engagement_rate": "4.1%",
    "top_performing_content": [
      {
        "type": "event",
        "topic": "wine_tasting",
        "reach": 3200
      }
    ]
  }
}
```

**Why:** Learn what works for them already. Double down on what performs, avoid what doesn't.

---

### 9. **Industry Trends & Thought Leadership** (NICE TO HAVE)

```sql
-- Add to leads table:
industry_position JSONB

-- Expected structure:
{
  "expertise_areas": [
    "sustainable_sourcing",
    "farm_to_table",
    "italian_cuisine_authenticity"
  ],
  "trending_topics_relevant": [
    {
      "topic": "zero-waste-restaurants",
      "relevance": "We compost 90% of waste",
      "authority_level": "practicing"
    }
  ],
  "thought_leadership_opportunities": [
    "Can speak about sustainable restaurant operations",
    "Expert in Italian wine pairings"
  ],
  "industry_affiliations": [
    "Member of Sustainable Restaurant Association"
  ]
}
```

**Why:** LinkedIn LOVES thought leadership. Position them as experts, not just businesses.

---

### 10. **Content Calendar Context** (NICE TO HAVE)

```sql
-- Add to leads table:
content_calendar_hooks JSONB

-- Expected structure:
{
  "seasonal_relevance": [
    {
      "season": "fall",
      "opportunities": ["pumpkin_menu", "harvest_celebration", "thanksgiving_catering"]
    }
  ],
  "upcoming_holidays": [
    {
      "holiday": "Valentine's Day",
      "relevance": "high",
      "angle": "romantic_dinner_promotion"
    }
  ],
  "anniversaries": [
    {
      "type": "business_anniversary",
      "date": "2025-06-15",
      "years": 16
    }
  ],
  "recurring_events": [
    {
      "event": "Wine Wednesday",
      "frequency": "weekly",
      "day": "Wednesday"
    }
  ]
}
```

**Why:** Timely content performs better. Know when to post about what.

---

## 📊 Priority Ranking

### CRITICAL (Must Have):
1. ✅ **Recent Achievements** - Awards, milestones, partnerships
2. ✅ **Customer Testimonials** - Reviews, case studies, success metrics
3. ✅ **Recent Company News** - Press releases, new services, events

### IMPORTANT (Should Have):
4. ✅ **Visual Assets Metadata** - Brand colors, images, logo
5. ✅ **Product/Service Highlights** - Featured offerings, USPs

### NICE TO HAVE (Enhances Quality):
6. ⚪ Brand Voice & Personality
7. ⚪ Community Involvement
8. ⚪ Social Media Analytics
9. ⚪ Industry Position
10. ⚪ Content Calendar Hooks

---

## 🛠️ Implementation for Your Analysis Tool

Your separate analysis tool should scrape/analyze and populate:

### From Website Scraping:
- Recent blog posts → Recent company news
- Awards/certifications displayed → Recent achievements
- Testimonials section → Customer testimonials
- Product pages → Product/Service highlights
- About page → Brand voice, company description
- Team page → Team info (already have this)
- Events calendar → Company news events

### From Social Media Scraping:
- Instagram posts → Visual assets, brand style
- Facebook page → Events, community involvement
- LinkedIn → Company updates, achievements
- Review sites (Google, Yelp) → Customer testimonials

### From AI Analysis:
- Analyze existing social posts → Brand voice, tone
- Analyze blog content → Industry expertise, thought leadership
- Analyze visual style → Brand colors, visual preferences
- Analyze reviews → Common praise points

---

## 📝 SQL Migration for Leads Table

```sql
-- Add social media content fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS recent_achievements JSONB,
ADD COLUMN IF NOT EXISTS customer_testimonials JSONB,
ADD COLUMN IF NOT EXISTS visual_assets JSONB,
ADD COLUMN IF NOT EXISTS company_news JSONB,
ADD COLUMN IF NOT EXISTS brand_voice JSONB,
ADD COLUMN IF NOT EXISTS community_involvement JSONB,
ADD COLUMN IF NOT EXISTS offerings_detail JSONB,
ADD COLUMN IF NOT EXISTS social_media_analytics JSONB,
ADD COLUMN IF NOT EXISTS industry_position JSONB,
ADD COLUMN IF NOT EXISTS content_calendar_hooks JSONB;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leads_has_achievements ON leads((recent_achievements IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_leads_has_testimonials ON leads((customer_testimonials IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_leads_has_social_analytics ON leads((social_media_analytics IS NOT NULL));
```

---

## 🎯 How I'll Use This Data

### LinkedIn Post Generation:
```
INPUT: recent_achievements.awards[0], company_name, industry_position
OUTPUT: "🏆 Thrilled to announce [Company] was named Best Local Restaurant 2024
by City Magazine! This recognition reflects our commitment to [value_proposition].
As leaders in [expertise_area], we're proud to serve our community."
```

### Instagram Post Generation:
```
INPUT: offerings_detail.featured_products[0], visual_assets.product_images[0]
OUTPUT: "✨ Signature Carbonara
Made with farm-fresh eggs from local farms 🥚
Our #1 bestseller for a reason 🍝
#PhillyEats #FarmToTable #Foodie"
+ visual_assets.product_images[0].url
```

### Facebook Event Post:
```
INPUT: company_news.events[0], location, community_involvement
OUTPUT: "🍷 Wine Tasting Night - October 30th
Join us for our monthly wine pairing event! A portion of proceeds
supports Local Food Bank. Reserve your spot: [link]"
```

---

## ✅ Summary: What to Build in Your Analysis Tool

1. **Web Scraper Module:**
   - Extract awards/certifications from website
   - Pull testimonials from reviews section
   - Identify recent blog topics → map to company news
   - Extract product/service details from services page
   - Scrape brand colors from CSS/design system

2. **Social Media Scraper Module:**
   - Analyze recent Instagram posts → visual style, hashtags
   - Pull Facebook events → upcoming events data
   - Scrape LinkedIn updates → company news
   - Aggregate review sites → customer testimonials

3. **AI Analysis Module:**
   - Analyze content tone → brand voice
   - Identify expertise areas → thought leadership
   - Extract visual preferences → visual_assets
   - Determine personality → brand_voice.personality_traits

4. **Populate Leads Table:**
   - Run migration to add new JSONB columns
   - Transform scraped data into structured JSON
   - Insert/update leads with new social media data
   - Maintain existing fields (company_name, industry, etc.)

Then I can compose social content with:
```javascript
POST /api/compose-social
{
  "url": "https://restaurant.com",
  "platform": "linkedin", // or instagram, facebook
  "content_type": "achievement_post", // or product_highlight, event, testimonial
  "tone": "professional" // or casual, playful
}
```

Want me to start building the social media composer endpoints? 🚀
