# Social Media Outreach Integration Guide

## Overview

The Website Audit Tool now identifies prospects with **broken websites but active social media profiles**. Instead of losing these opportunities, they're flagged for social media outreach (Instagram DMs, Facebook Messenger, LinkedIn Messages).

**Value Proposition:** When a prospect's website is down/broken, we reach out via social media with: *"Hey, noticed your website is down - we can fix it!"*

---

## Database Schema

### New Columns in `leads` Table

```sql
-- Flag indicating this lead needs social media outreach (not email)
requires_social_outreach BOOLEAN DEFAULT FALSE

-- Website health status
website_status TEXT DEFAULT 'active'
-- Values: 'active' | 'timeout' | 'ssl_error' | 'dns_error' | 'failed'

-- Error message if website failed
website_error TEXT
```

### Query for Social Outreach Leads

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all leads that need social media outreach
const { data: socialLeads, error } = await supabase
  .from('leads')
  .select('*')
  .eq('requires_social_outreach', true)
  .not('social_profiles', 'is', null)
  .order('analyzed_at', { ascending: false });

// socialLeads contains array of leads with broken websites but active social profiles
```

---

## Data Structure

### Example Lead Object

```json
{
  "id": "uuid",
  "url": "https://apexplumbingservices.com",
  "company_name": "Apex Plumbing Services",
  "industry": "Plumbing",
  "location": "Austin, TX",

  "requires_social_outreach": true,
  "website_status": "timeout",
  "website_error": "page.goto: Timeout 30000ms exceeded...",

  "social_profiles": {
    "instagram": {
      "url": "https://www.instagram.com/apexplumbingservices/",
      "username": "apexplumbingservices"
    },
    "facebook": {
      "url": "https://www.facebook.com/ApexPlumbingServices"
    },
    "linkedin_company": {
      "url": "https://www.linkedin.com/company/apex-plumbing-services"
    },
    "linkedin_person": {
      "url": "https://www.linkedin.com/in/john-doe-plumber-owner",
      "name": "John Doe"
    }
  },

  "analyzed_at": "2025-10-19T13:02:53.000Z"
}
```

### Social Profiles Structure

The `social_profiles` JSONB field contains:

```typescript
{
  instagram?: {
    url: string;
    username?: string;
    name?: string;
    bio?: string;
    followers?: string;
  },
  facebook?: {
    url: string;
    name?: string;
    description?: string;
  },
  linkedin_company?: {
    url: string;
    name?: string;
    description?: string;
    employees?: string;
  },
  linkedin_person?: {
    url: string;
    name?: string;
    title?: string;
  }
}
```

---

## Message Generation Strategy

### 1. Detect Error Type

```javascript
function getWebsiteIssueMessage(lead) {
  const { website_status, company_name, url } = lead;

  switch(website_status) {
    case 'ssl_error':
      return {
        hook: `SSL Certificate Issue Detected`,
        message: `Hey ${company_name}! I noticed your website (${url}) has an SSL certificate issue. Potential customers are seeing "Not Secure" warnings, which can hurt trust and conversions. I can help fix this quickly - usually takes less than an hour. Interested?`
      };

    case 'timeout':
    case 'dns_error':
      return {
        hook: `Website Appears Down`,
        message: `Hi ${company_name}! I tried visiting your website (${url}) but it appears to be down. This means you're likely losing customers right now. I specialize in fixing website issues fast - can usually get you back online within a few hours. Want help?`
      };

    case 'failed':
    default:
      return {
        hook: `Website Issue Detected`,
        message: `Hey ${company_name}! I noticed some issues with your website (${url}). I help ${lead.industry} businesses fix their websites and improve their online presence. Mind if I share what I found?`
      };
  }
}
```

### 2. Choose Best Platform

```javascript
function selectBestPlatform(social_profiles) {
  // Priority order: Instagram DM > Facebook Messenger > LinkedIn Message

  if (social_profiles.instagram?.url) {
    return {
      platform: 'instagram',
      url: social_profiles.instagram.url,
      username: social_profiles.instagram.username,
      method: 'DM'
    };
  }

  if (social_profiles.facebook?.url) {
    return {
      platform: 'facebook',
      url: social_profiles.facebook.url,
      method: 'Messenger'
    };
  }

  if (social_profiles.linkedin_person?.url) {
    return {
      platform: 'linkedin',
      url: social_profiles.linkedin_person.url,
      name: social_profiles.linkedin_person.name,
      method: 'InMail or Connection Request'
    };
  }

  return null; // No viable platform
}
```

### 3. Generate Platform-Specific Message

```javascript
function generateSocialMessage(lead) {
  const issueMsg = getWebsiteIssueMessage(lead);
  const platform = selectBestPlatform(lead.social_profiles);

  if (!platform) {
    return null; // No social profiles available
  }

  // Customize message per platform
  const messages = {
    instagram: {
      greeting: `Hey!`,
      style: 'casual',
      maxLength: 1000, // Instagram DM limit
      cta: `Let me know if you want me to send over what I found 👍`
    },
    facebook: {
      greeting: `Hi there!`,
      style: 'friendly',
      maxLength: 5000, // Facebook Messenger limit
      cta: `Would love to help - can I share the details?`
    },
    linkedin: {
      greeting: `Hi ${lead.social_profiles.linkedin_person?.name || 'there'},`,
      style: 'professional',
      maxLength: 1900, // LinkedIn InMail limit (2000 chars)
      cta: `Happy to share what I found if you're interested.`
    }
  };

  const config = messages[platform.platform];

  return {
    platform: platform.platform,
    platform_url: platform.url,
    method: platform.method,
    subject: issueMsg.hook, // For LinkedIn subject line
    message: `${config.greeting}

${issueMsg.message}

${config.cta}`,
    max_length: config.maxLength,
    style: config.style
  };
}
```

---

## Example Messages

### Instagram DM (Casual)

```
Hey!

I tried visiting your website (apexplumbingservices.com) but it appears to be down. This means you're likely losing customers right now.

I specialize in fixing website issues fast - can usually get you back online within a few hours.

Let me know if you want me to send over what I found 👍
```

### Facebook Messenger (Friendly)

```
Hi there!

I noticed your website (swifthvac.com) has an SSL certificate issue. Potential customers are seeing "Not Secure" warnings, which can hurt trust and conversions.

I can help fix this quickly - usually takes less than an hour.

Would love to help - can I share the details?
```

### LinkedIn Message (Professional)

```
Subject: SSL Certificate Issue Detected

Hi John,

I noticed your website (apexplumbingservices.com) has an SSL certificate issue. Potential customers are seeing "Not Secure" warnings when they visit your site, which can significantly impact trust and conversion rates.

I help plumbing businesses fix their websites and improve their online presence. This particular issue usually takes less than an hour to resolve.

Happy to share what I found if you're interested.

Best,
[Your Name]
```

---

## Implementation in Email Composer

### Recommended Workflow

```javascript
// modules/social-media-outreach.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function generateSocialOutreach(options = {}) {
  const { limit = 10, platform = null } = options;

  // 1. Fetch social outreach leads
  let query = supabase
    .from('leads')
    .select('*')
    .eq('requires_social_outreach', true)
    .not('social_profiles', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  const { data: leads, error } = await query;

  if (error) throw error;

  // 2. Generate messages for each lead
  const outreachMessages = [];

  for (const lead of leads) {
    const message = generateSocialMessage(lead);

    if (!message) continue; // Skip if no viable platform

    // Filter by platform if specified
    if (platform && message.platform !== platform) continue;

    outreachMessages.push({
      lead_id: lead.id,
      company_name: lead.company_name,
      url: lead.url,
      ...message
    });
  }

  return outreachMessages;
}

// Usage:
const instagramMessages = await generateSocialOutreach({ platform: 'instagram', limit: 20 });
const allSocialMessages = await generateSocialOutreach({ limit: 50 });
```

### Save to Database

You may want to create a `social_outreach` table to track sent messages:

```sql
CREATE TABLE social_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  platform TEXT NOT NULL, -- 'instagram' | 'facebook' | 'linkedin'
  platform_url TEXT NOT NULL, -- URL of their social profile
  message TEXT NOT NULL,
  subject TEXT, -- For LinkedIn

  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'replied' | 'failed'
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_outreach_status ON social_outreach(status);
CREATE INDEX idx_social_outreach_platform ON social_outreach(platform);
```

---

## API Endpoint Example

Add this to your `email-composer/server.js`:

```javascript
// Generate social media outreach messages
app.post('/api/compose-social', async (req, res) => {
  try {
    const {
      limit = 10,
      platform = null, // 'instagram' | 'facebook' | 'linkedin' | null (all)
      website_status = null // Filter by error type: 'ssl_error' | 'timeout' | etc.
    } = req.body;

    const messages = await generateSocialOutreach({ limit, platform, website_status });

    res.json({
      success: true,
      count: messages.length,
      messages
    });

  } catch (error) {
    console.error('Error generating social outreach:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "limit": 20
  }'
```

**Example Response:**

```json
{
  "success": true,
  "count": 5,
  "messages": [
    {
      "lead_id": "uuid",
      "company_name": "Apex Plumbing Services",
      "url": "https://apexplumbingservices.com",
      "platform": "instagram",
      "platform_url": "https://www.instagram.com/apexplumbingservices/",
      "method": "DM",
      "subject": "Website Appears Down",
      "message": "Hey!\n\nI tried visiting your website...",
      "max_length": 1000,
      "style": "casual"
    }
  ]
}
```

---

## Testing the Feature

### Test Script

```bash
cd website-audit-tool
node scripts/check-social-outreach-leads.js
```

This will show all leads currently flagged for social outreach with their social profiles.

### Current Test Data

5 leads are currently in the database:
- Apex Plumbing Services (Instagram, Facebook, LinkedIn)
- Swift HVAC Solutions (Facebook, LinkedIn)
- Local Movers Inc. (Instagram, Facebook, LinkedIn)
- Pro Clean Windows (Instagram, Facebook, LinkedIn)
- Back in Action Chiropractic (Instagram, Facebook, LinkedIn)

All have `requires_social_outreach = true` and `website_status = 'timeout'`.

---

## Key Benefits

1. **Value Recovery:** Converts failed website analyses (previously lost) into social outreach opportunities
2. **Better Context:** "Your website is down" is a strong conversation starter
3. **Platform Flexibility:** Can reach them via Instagram, Facebook, or LinkedIn
4. **Automated Detection:** Automatically identifies SSL errors, timeouts, DNS issues
5. **Data Preservation:** All company info and social profiles saved for outreach

---

## Next Steps

1. Implement `generateSocialOutreach()` function in email-composer
2. Create `/api/compose-social` endpoint
3. (Optional) Create `social_outreach` tracking table
4. (Optional) Add UI in Command Center for social outreach campaigns
5. Test with the 5 existing leads in database

---

## Questions?

- **Where's the data?** Supabase `leads` table, filter by `requires_social_outreach = true`
- **What platforms?** Instagram, Facebook, LinkedIn (in priority order)
- **Message tone?** Instagram = casual, Facebook = friendly, LinkedIn = professional
- **How many leads?** Currently 5 in test data, will grow as more prospects are analyzed
- **Cost?** $0 - no AI calls, just data from prospects table

---

**Files to Reference:**
- Database migration: `website-audit-tool/migrations/add-social-outreach-flag.sql`
- Supabase client: `website-audit-tool/modules/supabase-client.js` (lines 88-91)
- Fallback logic: `website-audit-tool/analyzer.js` (lines 1591-1643)
- Test scripts: `website-audit-tool/scripts/check-social-outreach-leads.js`
