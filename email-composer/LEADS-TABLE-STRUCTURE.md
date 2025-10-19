# Leads Table Structure - ACTUAL FORMAT

## ✅ Code Updated to Match Real Table

The email composer has been updated to work with the actual leads table structure from your website-audit-tool.

### Key Field Differences:

| Expected (Old) | Actual (Current) | Updated |
|----------------|------------------|---------|
| `website_url` | `url` | ✅ Fixed |
| `linkedin_url` | `social_profiles.linkedIn.company` | ✅ Fixed |
| `facebook_url` | `social_profiles.facebook` | ✅ Fixed |
| `instagram_url` | `social_profiles.instagram.url` | ✅ Fixed |
| `analysis_summary.weaknesses` | `critiques_basic[]` | ✅ Fixed |
| `recent_achievements` | `achievements{}` | ✅ Fixed |
| `customer_testimonials` | `testimonials[]` | ✅ Fixed |

---

## Actual Table Structure

### Basic Info Fields:
```javascript
{
  id: "uuid",
  url: "https://example.com",  // ← NOTE: NOT website_url!
  company_name: "Example Domain",
  industry: "Domain Management & Internet Services",
  website_score: 30,
  website_grade: "F"
}
```

### Social Profiles (Nested Object):
```javascript
{
  social_profiles: {
    linkedIn: {
      company: null,        // ← LinkedIn company page
      personal: []          // ← Array of personal profiles
    },
    facebook: null,         // ← Facebook page URL
    instagram: {
      url: null,           // ← Instagram profile URL
      handle: null          // ← Instagram handle
    },
    twitter: {
      url: null,
      handle: null
    }
  }
}
```

### Analysis & Critiques:
```javascript
{
  analysis_summary: "This site serves as a basic placeholder...",

  critiques_basic: [
    "The meta description is missing entirely...",
    "No contact methods such as email or phone...",
    "Only one CTA is detected above the fold..."
  ],

  critiques_industry: [...],
  critiques_seo: [...],
  critiques_visual: [...],
  critiques_competitor: [...]
}
```

### Achievements & Testimonials:
```javascript
{
  achievements: {
    awards: [],
    certifications: [],
    yearsInBusiness: null,
    notableAccomplishments: []
  },

  testimonials: []  // Array of testimonial strings
}
```

### Team & Services:
```javascript
{
  team_info: {
    founder: {
      name: null,
      title: null,
      bio: null,
      linkedIn: null
    },
    keyPeople: []
  },

  services: [],  // Array of services offered

  tech_stack: {}  // Technologies detected
}
```

---

## How the Code Now Works

### Social Profile URL Extraction:

```javascript
const socialProfiles = lead.social_profiles || {};

const urls = {
  linkedin: socialProfiles.linkedIn?.company ||          // Company page
            socialProfiles.linkedIn?.personal?.[0] ||    // First personal profile
            null,

  facebook: socialProfiles.facebook || null,

  instagram: socialProfiles.instagram?.url || null
};
```

### Analysis Data Extraction:

```javascript
const weaknesses = [
  ...lead.critiques_basic.slice(0, 2),      // First 2 basic critiques
  ...lead.critiques_industry.slice(0, 1),   // First industry critique
].filter(Boolean);
```

### Field Mapping for Outreach:

```javascript
// Outreach prompt uses:
- lead.url (not website_url)
- lead.company_name
- lead.industry
- lead.website_grade
- lead.website_score
- lead.analysis_summary
- lead.critiques_basic
- lead.critiques_industry
- lead.achievements
- lead.testimonials
```

---

## Example Real Lead:

```json
{
  "url": "https://www.example.com",
  "company_name": "Example Domain",
  "industry": "Domain Management & Internet Services",
  "website_grade": "F",
  "website_score": 30,

  "social_profiles": {
    "linkedIn": { "company": null, "personal": [] },
    "facebook": null,
    "instagram": { "url": null, "handle": null }
  },

  "analysis_summary": "This site serves as a basic placeholder...",

  "critiques_basic": [
    "The meta description is missing entirely...",
    "No contact methods such as email or phone...",
    "Only one CTA is detected above the fold..."
  ],

  "achievements": {
    "awards": [],
    "certifications": [],
    "yearsInBusiness": null,
    "notableAccomplishments": []
  },

  "testimonials": []
}
```

---

## Testing with Real Data

Once your other agent populates:
- ✅ `social_profiles.linkedIn.company` (for LinkedIn outreach)
- ✅ `social_profiles.facebook` (for Facebook outreach)
- ✅ `social_profiles.instagram.url` (for Instagram outreach)

Then you can generate DMs:

```bash
# LinkedIn DM
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "platform": "linkedin",
    "strategy": "value-first"
  }'

# Instagram DM
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "platform": "instagram",
    "strategy": "quick-win"
  }'
```

---

## Summary

✅ All code updated to match actual table structure
✅ Handles nested `social_profiles` object correctly
✅ Extracts critiques from arrays
✅ Uses `url` instead of `website_url`
✅ Ready for real lead data!

**Next:** Your other agent needs to populate the social profile URLs in the `social_profiles` object.
