# Leads Table Requirements for Social Media Outreach

This document lists all the fields the email composer needs from the `leads` table to generate highly personalized outreach messages for Email, LinkedIn, Facebook, and Instagram.

## Critical Fields (REQUIRED)

These fields are absolutely necessary for the system to work:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique lead identifier | `76d8f7e6-9014-425a-a3de-a672c87971d2` |
| `url` | TEXT | Website URL (NOTE: not `website_url`!) | `https://greenthumb-landscaping.com` |
| `company_name` | TEXT | Company/business name | `Green Thumb Lawn & Landscaping` |
| `industry` | TEXT | Industry or vertical | `Landscaping and Leaf Removal` |

## Social Profiles Structure (REQUIRED for LinkedIn/Facebook/Instagram DMs)

The `social_profiles` field must be a JSONB object with this structure:

```json
{
  "linkedIn": {
    "company": "https://www.linkedin.com/company/green-thumb-landscaping",
    "personal": [
      "https://www.linkedin.com/in/clint-jones-12345"
    ],
    "enriched": true,
    "scraped_at": "2025-10-19T10:30:00Z",
    "description": "Leading landscaping company in Maryland...",
    "follower_count": 245,
    "employee_count": "11-50"
  },
  "facebook": "https://www.facebook.com/GreenThumbLandscaping",
  "instagram": {
    "url": "https://www.instagram.com/greenthumb_landscaping",
    "bio": "40+ years transforming landscapes in Maryland",
    "follower_count": 1200,
    "following_count": 350
  }
}
```

**Important Notes:**
- LinkedIn can have both `company` and `personal` URLs
- Facebook can be a simple string URL or object
- Instagram should include `url`, `bio`, and follower counts if available
- The system will use whichever social platform URLs are available

## Contact Information (Important for personalization)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `contact_name` | TEXT | Primary contact person's name | `Clint Jones` |
| `contact_email` | TEXT | Contact email address | `clint@greenthumb.com` |

## Rich Data for Personalization (Highly Recommended)

These fields dramatically improve message quality by providing context for personalization:

### Company Information

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `company_description` | TEXT | About/description text from website | `Family-owned landscaping business serving Maryland for over 40 years...` |
| `services` | TEXT[] or JSONB | Array of services offered | `["Lawn Care", "Landscape Design", "Irrigation", "Hardscaping", "Snow Removal", "Tree Services"]` |

### Team Information

The `team_info` field should be a JSONB object:

```json
{
  "founder": {
    "name": "Clint Jones",
    "title": "Owner",
    "bio": "Third-generation landscaper with 25 years experience"
  },
  "team_size": "15-20 employees",
  "years_in_business": 40
}
```

### Social Proof

| Field | Type | Description | Structure |
|-------|------|-------------|-----------|
| `testimonials` | JSONB[] | Customer testimonials | Array of objects with `text`, `author`, `rating` |

**Testimonials Example:**
```json
[
  {
    "text": "Green Thumb transformed our backyard into an oasis!",
    "author": "Sarah M.",
    "rating": 5,
    "date": "2024-08-15"
  },
  {
    "text": "Reliable, professional, and amazing attention to detail.",
    "author": "John D.",
    "rating": 5
  }
]
```

**Important:** The system handles testimonials as either:
- Objects with properties: `text`, `quote`, `content`, `review`, `author`
- Plain strings (legacy format)

### Achievements & Content

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `achievements` | JSONB | Notable achievements or awards | `{"awards": ["Best of Maryland 2023"], "certifications": ["Licensed & Insured"]}` |
| `has_active_blog` | BOOLEAN | Whether site has active blog | `true` |
| `recent_blog_posts` | JSONB | Recent blog post titles/topics | `{"posts": [{"title": "Spring Lawn Care Tips", "date": "2024-03-15"}]}` |

### Technical Information

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `tech_stack` | JSONB | Technologies used on website | `{"cms": "WordPress", "analytics": "Google Analytics", "hosting": "WP Engine"}` |

## Project Tracking Fields (Optional but Useful)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `project_id` | UUID or TEXT | Project this lead belongs to | `proj_2024_landscaping` |
| `campaign_id` | UUID or TEXT | Campaign identifier | `campaign_spring_2024` |
| `client_name` | TEXT | Client this lead is for | `MaxantAgency Internal` |

## Lead Scoring Fields (Optional)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `grade` | TEXT | Lead quality grade | `A`, `B`, `C`, `D`, `F` |
| `score` | INTEGER | Lead quality score | `85` (0-100) |

---

## How the System Uses This Data

### For LinkedIn InMails:
1. Uses `contact_name` for personalization ("Hi Clint,")
2. References `company_description` or `services` to show we understand their business
3. Uses `team_info.founder` or `team_info.years_in_business` for credibility
4. References `tech_stack` if offering website services
5. Mentions location from enriched LinkedIn data
6. Character limit: 300 chars (first message to non-connections)

### For Facebook Messenger:
1. Uses company Facebook profile from `social_profiles.facebook`
2. More conversational tone than LinkedIn
3. May reference `testimonials` for social proof
4. May mention `achievements` or awards
5. Character limit: 20,000 (but keeps optimal at ~150)

### For Instagram DMs:
1. Uses Instagram handle from `social_profiles.instagram.url`
2. Very casual, authentic tone
3. May reference their Instagram bio
4. Shorter, punchier messages
5. Character limit: 1000 (but keeps optimal at ~100)

### For Emails:
1. Uses ALL available data for maximum personalization
2. Longer format allows more detail
3. Can include testimonials, services list, achievements
4. Multiple subject line variants generated

---

## Field Name Conventions - IMPORTANT!

**Correct:**
- `url` (NOT `website_url`)
- `social_profiles.linkedIn.company` (NOT `linkedin_url`)
- `social_profiles.instagram.url` (NOT `instagram_url`)

**Nested Structure:**
- Social profiles are in `social_profiles` object (not flat fields)
- Team info is in `team_info` object
- Tech stack is in `tech_stack` object

---

## Testing Checklist

When leads are ready, run this command to test schema:

```bash
node check-leads-schema.js
```

This will:
- ✅ Verify all required fields exist
- ✅ Show the structure of `social_profiles`, `team_info`, `testimonials`
- ✅ List all available fields
- ✅ Provide sample data for verification

---

## Example Full Lead Record

```json
{
  "id": "76d8f7e6-9014-425a-a3de-a672c87971d2",
  "url": "https://greenthumb-landscaping.com",
  "company_name": "Green Thumb Lawn & Landscaping",
  "contact_name": "Clint Jones",
  "contact_email": "info@greenthumb.com",
  "industry": "Landscaping and Leaf Removal",

  "company_description": "Family-owned landscaping business serving Laurel, MD and surrounding areas for over 40 years.",

  "services": [
    "Lawn Care & Maintenance",
    "Landscape Design & Installation",
    "Irrigation Systems",
    "Hardscaping",
    "Snow Removal",
    "Tree Services"
  ],

  "social_profiles": {
    "linkedIn": {
      "company": "https://www.linkedin.com/company/green-thumb-landscaping",
      "enriched": true,
      "description": "Leading landscaping company in Maryland",
      "employee_count": "11-50"
    },
    "facebook": "https://www.facebook.com/GreenThumbLandscaping",
    "instagram": {
      "url": "https://www.instagram.com/greenthumb_landscaping",
      "bio": "40+ years transforming landscapes 🌿",
      "follower_count": 1200
    }
  },

  "team_info": {
    "founder": {
      "name": "Clint Jones",
      "title": "Owner"
    },
    "years_in_business": 40
  },

  "testimonials": [
    {
      "text": "Green Thumb transformed our backyard into an oasis!",
      "author": "Sarah M.",
      "rating": 5
    }
  ],

  "tech_stack": {
    "cms": "WordPress",
    "analytics": "Google Analytics"
  },

  "grade": "A",
  "score": 85,

  "project_id": null,
  "campaign_id": null,
  "client_name": null
}
```

---

## Summary

**Minimum Required Fields:**
- `id`, `url`, `company_name`, `industry`, `social_profiles`

**Recommended for High-Quality Personalization:**
- `contact_name`, `company_description`, `services`, `team_info`, `testimonials`

**Nice to Have:**
- `achievements`, `tech_stack`, `recent_blog_posts`, `has_active_blog`

The more data you provide, the better the AI can personalize the outreach messages!
