# Social Outreach - Quick Start

## What Is This?

Website Audit Tool now flags leads with **broken websites** for **social media outreach**. Instead of emailing them, reach out on Instagram/Facebook/LinkedIn with: *"Hey, your website is down - we can fix it!"*

## Quick Test

```bash
cd email-composer
node test-social-outreach.js
```

This will show you all available social outreach messages.

## Query Database

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all social outreach leads
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('requires_social_outreach', true);

console.log(`${data.length} leads need social outreach`);
```

## Generate Messages

```javascript
import { generateSocialOutreach } from './modules/social-media-outreach.js';

// Get Instagram messages
const messages = await generateSocialOutreach({
  platform: 'instagram',
  limit: 10
});

console.log(messages[0].message);
// Output:
// "Hey!
//
// I tried visiting your website (apexplumbingservices.com) but it
// appears to be down. This means you're likely losing customers right now.
//
// I specialize in fixing website issues fast - can usually get you back
// online within a few hours.
//
// Let me know if you want me to send over what I found 👍"
```

## Data Structure

```javascript
{
  lead_id: "uuid",
  company_name: "Apex Plumbing Services",
  website_url: "https://apexplumbingservices.com",

  platform: "instagram",        // instagram | facebook | linkedin
  platform_url: "https://instagram.com/apexplumbingservices/",
  method: "DM",                  // DM | Messenger | InMail

  subject: "Website Appears Down",  // For LinkedIn
  message: "Hey! I tried visiting...",

  issue_type: "website appears to be down",
  urgency: "critical",           // critical | high | medium

  style: "casual",               // casual | friendly | professional
  max_length: 1000
}
```

## Error Types

| website_status | Message Hook |
|----------------|--------------|
| `ssl_error` | "Your website has an SSL certificate issue..." |
| `timeout` or `dns_error` | "Your website appears to be down..." |
| `failed` | "I noticed some issues with your website..." |

## Platform Priority

1. **Instagram** (casual, visual) - Best for restaurants, salons, retail
2. **Facebook** (friendly, local) - Best for local services
3. **LinkedIn** (professional) - Best for B2B, consulting

## Message Styles

**Instagram:** Casual, emoji ✅, max 1000 chars
```
Hey!

I noticed your website is down...

Let me know if you want me to send over what I found 👍
```

**Facebook:** Friendly, no emoji, max 5000 chars
```
Hi there!

I noticed your website has an SSL issue...

Would love to help - can I share the details?
```

**LinkedIn:** Professional, no emoji, max 1900 chars
```
Hi John,

I noticed your website has an SSL certificate issue...

Happy to share what I found if you're interested.

Best,
[Your Name]
```

## API Endpoint (Add to server.js)

```javascript
app.post('/api/compose-social', async (req, res) => {
  const { platform, limit = 10 } = req.body;

  const messages = await generateSocialOutreach({ platform, limit });

  res.json({
    success: true,
    count: messages.length,
    messages
  });
});
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{"platform": "instagram", "limit": 5}'
```

## Current Test Data

5 leads currently in database:
- **Apex Plumbing Services** - Instagram, Facebook, LinkedIn
- **Swift HVAC Solutions** - Facebook, LinkedIn
- **Local Movers Inc.** - Instagram, Facebook, LinkedIn
- **Pro Clean Windows** - Instagram, Facebook, LinkedIn
- **Back in Action Chiropractic** - Instagram, Facebook, LinkedIn

All have broken websites (timeout errors).

## Files

- **Integration guide:** `SOCIAL-OUTREACH-INTEGRATION.md` (detailed docs)
- **Module:** `modules/social-media-outreach.js` (ready to use)
- **Test script:** `test-social-outreach.js` (run to see examples)

## Next Steps

1. Run `node test-social-outreach.js` to see it working
2. Add `/api/compose-social` endpoint to server.js
3. (Optional) Create UI in Command Center for social campaigns
4. (Optional) Track sent messages in database

## Questions?

- **Where's the data?** Supabase `leads` table, `requires_social_outreach = true`
- **Cost?** Free - no AI calls needed
- **How many leads?** 5 in test data, will grow as more prospects analyzed
