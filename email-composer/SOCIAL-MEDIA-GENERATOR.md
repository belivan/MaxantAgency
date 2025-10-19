# Social Media Content Generator - CHEAP & FAST

## Overview

Cost-effective social media content generation using **Claude Haiku 3.5** or **GPT-4o-mini** instead of expensive Sonnet models.

**Cost Comparison:**
- Claude Sonnet 4.5: $3.00/MTok input, $15.00/MTok output
- **Claude Haiku 3.5**: $0.25/MTok input, $1.25/MTok output (12x cheaper!)
- **GPT-4o-mini**: $0.15/MTok input, $0.60/MTok output (20x cheaper!)

## Platforms Supported

✅ **LinkedIn** - Professional networking posts
✅ **Instagram** - Visual, casual captions
✅ **Facebook** - Community-focused posts
✅ **Twitter** - Short, punchy tweets

## Content Types

1. **achievement** - Awards, milestones, certifications
2. **product_highlight** - Featured products/services
3. **testimonial** - Customer reviews, success stories
4. **event** - Upcoming events, promotions
5. **team_spotlight** - Team member highlights
6. **educational** - Industry tips, thought leadership
7. **community** - Local involvement, charity
8. **behind_the_scenes** - Day in the life, operations

## Platform-Specific Optimizations

### LinkedIn
- Optimal length: 150 characters (max 3000)
- Tone: Professional, insightful
- Hashtags: Max 5
- Emoji usage: Minimal (1-2)

### Instagram
- Optimal length: 125 characters (max 2200)
- Tone: Casual, engaging, visual
- Hashtags: 11 recommended (max 30)
- Emoji usage: Moderate (3-5)

### Facebook
- Optimal length: 80 characters (max 63,206)
- Tone: Friendly, conversational
- Hashtags: Max 3 (Facebook hates too many)
- Emoji usage: Moderate (2-3)

### Twitter
- Optimal length: 71 characters (max 280)
- Tone: Concise, punchy
- Hashtags: Max 2
- Emoji usage: Light

## API Usage

### Endpoint: POST /api/compose-social

**Single Post Generation:**
```javascript
POST http://localhost:3001/api/compose-social

{
  "url": "https://restaurant.com",
  "platform": "linkedin",        // linkedin, instagram, facebook, twitter
  "content_type": "achievement",  // achievement, product_highlight, etc.
  "tone": null,                   // Optional custom tone
  "model": "haiku"                // "haiku" or "gpt-4o-mini"
}
```

**Response:**
```json
{
  "success": true,
  "lead": {
    "url": "https://restaurant.com",
    "company": "Example Restaurant",
    "industry": "Restaurant"
  },
  "post": "🏆 Thrilled to announce Example Restaurant was named Best Local Restaurant 2024! This recognition reflects our 15 years of commitment to farm-to-table excellence. #LocalFood #FarmToTable #PhillyEats",
  "hashtags": ["LocalFood", "FarmToTable", "PhillyEats"],
  "suggested_image": "Award certificate or team celebration photo",
  "call_to_action": "Visit us to experience award-winning cuisine",
  "reasoning": "LinkedIn-appropriate professional tone highlighting achievement...",
  "platform": "linkedin",
  "content_type": "achievement",
  "model": "haiku",
  "company": "Example Restaurant",
  "url": "https://restaurant.com",
  "tokens": 452,
  "cost": 0.0003,
  "validation": {
    "isValid": true,
    "score": 100,
    "issues": []
  },
  "generatedAt": "2025-10-19T15:10:00.000Z"
}
```

**A/B Testing with Variants:**
```javascript
POST http://localhost:3001/api/compose-social

{
  "url": "https://restaurant.com",
  "platform": "instagram",
  "content_type": "product_highlight",
  "model": "gpt-4o-mini",
  "variants": 3                   // Generate 3 different versions
}
```

**Response:**
```json
{
  "success": true,
  "lead": {...},
  "variants": [
    {
      "post": "✨ Signature Carbonara 🍝\nMade with farm-fresh eggs 🥚\nOur #1 bestseller!\n#PhillyFood #Pasta",
      "hashtags": [...],
      "suggested_image": "...",
      "call_to_action": "...",
      "reasoning": "...",
      "tokens": 380,
      "cost": 0.0002,
      "validation": {...}
    },
    {
      "post": "🍝 Can't stop craving our Signature Carbonara?...",
      ...
    },
    {
      "post": "Farm-to-table magic 🌾✨...",
      ...
    }
  ],
  "total_cost": 0.0006,
  "recommended": 0
}
```

## Usage Examples

### Example 1: LinkedIn Achievement Post
```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://restaurant.com",
    "platform": "linkedin",
    "content_type": "achievement",
    "model": "haiku"
  }'
```

**Generated:**
> 🏆 Thrilled to announce Example Restaurant was named Best Local Restaurant 2024 by City Magazine! This recognition reflects our commitment to sustainable farm-to-table dining. As leaders in local sourcing, we're proud to serve our Philadelphia community. #Sustainability #LocalBusiness

### Example 2: Instagram Product Highlight
```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://restaurant.com",
    "platform": "instagram",
    "content_type": "product_highlight",
    "model": "gpt-4o-mini"
  }'
```

**Generated:**
> ✨ Signature Carbonara 🍝
> Made with farm-fresh eggs from local farms 🥚
> Our #1 bestseller for a reason
>
> #PhillyEats #FarmToTable #Foodie #ItalianFood #LocalFood #PastaLover #FoodPorn #PhillyFoodie #SupportLocal #FoodPhotography #InstaFood

### Example 3: Facebook Event Post
```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://restaurant.com",
    "platform": "facebook",
    "content_type": "event",
    "model": "haiku"
  }'
```

**Generated:**
> 🍷 Wine Tasting Night - October 30th!
>
> Join us for our monthly wine pairing event. Taste 5 carefully selected wines paired with our signature dishes. A portion of proceeds supports Local Food Bank.
>
> Reserve your spot: [link]
>
> #WineNight #PhillyEvents

### Example 4: A/B Testing for Instagram
```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://restaurant.com",
    "platform": "instagram",
    "content_type": "testimonial",
    "model": "haiku",
    "variants": 3
  }'
```

**Generated 3 Variants:**
1. "⭐⭐⭐⭐⭐ 'Best pasta I've ever had!' - Sarah M."
2. "Our customers speak volumes 💬 'Amazing service, incredible food'"
3. "Real reviews, real love ❤️ Thanks for the 5-star rating, Sarah!"

## Data Requirements

The generator works with current leads table data:
- ✅ company_name
- ✅ industry
- ✅ location
- ✅ founding_year
- ✅ company_description
- ✅ value_proposition
- ✅ services
- ✅ social_profiles

**For best results, add these fields** (see [SOCIAL-MEDIA-DATA-REQUIREMENTS.md](SOCIAL-MEDIA-DATA-REQUIREMENTS.md)):
- recent_achievements
- customer_testimonials
- visual_assets
- company_news
- brand_voice
- community_involvement
- offerings_detail

## Cost Analysis

### Typical Post Generation Costs

**Single Post (Haiku):**
- Input tokens: ~300-500
- Output tokens: ~100-200
- Cost: **$0.0002 - $0.0004** (less than a penny!)

**Single Post (GPT-4o-mini):**
- Input tokens: ~300-500
- Output tokens: ~100-200
- Cost: **$0.0001 - $0.0002** (even cheaper!)

**A/B Testing (3 variants with Haiku):**
- Cost: **$0.0006 - $0.0012**

**Comparison to Sonnet:**
- Sonnet cost per post: ~$0.005 - $0.01
- Haiku cost per post: ~$0.0003
- **Savings: 95%!**

### Monthly Cost Estimates

**Generate 100 posts per month (Haiku):**
- 100 posts × $0.0003 = **$0.03/month**

**Generate 1000 posts per month (Haiku):**
- 1000 posts × $0.0003 = **$0.30/month**

**Generate 100 A/B tests (3 variants each, Haiku):**
- 300 variants × $0.0003 = **$0.09/month**

**Compare to Sonnet:**
- 100 posts with Sonnet: ~$1.00/month
- 100 posts with Haiku: **$0.03/month**
- **Savings: $0.97/month (97% cheaper!)**

## Integration with Command Center UI

### Filter leads for social content
```javascript
// Get leads with achievements (great for LinkedIn)
const leads = await fetch('http://localhost:3001/api/leads')
  .then(r => r.json());

const leadsWithAchievements = leads.leads.filter(l =>
  l.recent_achievements && l.recent_achievements.awards?.length > 0
);

// Generate LinkedIn achievement posts
for (const lead of leadsWithAchievements) {
  const post = await fetch('http://localhost:3001/api/compose-social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: lead.url,
      platform: 'linkedin',
      content_type: 'achievement',
      model: 'haiku'
    })
  }).then(r => r.json());

  console.log(post.post);
  console.log(`Cost: $${post.cost.toFixed(4)}`);
}
```

### Batch generation for campaigns
```javascript
// Generate Instagram posts for all leads
async function generateInstagramCampaign(projectId) {
  const leads = await fetch(`http://localhost:3001/api/emails/project/${projectId}`)
    .then(r => r.json());

  const posts = [];
  let totalCost = 0;

  for (const lead of leads.emails) {
    const post = await fetch('http://localhost:3001/api/compose-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: lead.url,
        platform: 'instagram',
        content_type: 'product_highlight',
        model: 'gpt-4o-mini'
      })
    }).then(r => r.json());

    posts.push(post);
    totalCost += post.cost;

    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Generated ${posts.length} posts for $${totalCost.toFixed(4)}`);
  return posts;
}
```

## Best Practices

### 1. Choose the Right Platform
- **LinkedIn**: Professional content, company updates, thought leadership
- **Instagram**: Visual products, lifestyle, behind-the-scenes
- **Facebook**: Community events, local news, customer stories
- **Twitter**: Quick updates, news, trending topics

### 2. Choose the Right Content Type
- **Achievement**: Awards, milestones, certifications → LinkedIn
- **Product Highlight**: Featured items, bestsellers → Instagram
- **Testimonial**: Reviews, case studies → All platforms
- **Event**: Upcoming events, promotions → Facebook, Instagram
- **Educational**: Tips, how-tos → LinkedIn, Twitter
- **Community**: Local involvement → Facebook

### 3. Model Selection
- **Use Haiku** for most content (great quality, very cheap)
- **Use GPT-4o-mini** if you want even lower costs
- **Avoid Sonnet** for social media (overkill for short posts)

### 4. A/B Testing
- Generate 2-3 variants for important posts
- Test different hooks, emojis, hashtags
- Cost is still minimal ($0.0006 for 3 variants)

### 5. Validate Before Posting
- Check `validation.isValid` in response
- Review `validation.issues` for warnings
- Ensure character count is optimal for engagement

## Troubleshooting

### Issue: "Lead not found"
**Solution:** Make sure the URL exists in your leads table

### Issue: Empty post generated
**Solution:** Lead data might be minimal. Add more fields (achievements, testimonials, etc.)

### Issue: Post too long
**Solution:** Response includes validation. Check `validation.issues` for length warnings

### Issue: Cost too high
**Solution:** Use `model: "gpt-4o-mini"` instead of Haiku for even lower costs

## Future Enhancements

- [ ] Save generated posts to database for tracking
- [ ] Direct posting to social platforms via APIs
- [ ] Scheduled posting calendar
- [ ] Performance tracking (likes, shares, comments)
- [ ] Auto-generate image suggestions
- [ ] Sentiment analysis of generated content

## Summary

🎯 **Cheap**: 95% cheaper than Sonnet
⚡ **Fast**: Generate in 1-2 seconds
📊 **Smart**: Platform-specific optimization
✅ **Quality**: Validated and scored
🔄 **A/B Testing**: Generate multiple variants
💰 **Scalable**: Generate 1000s of posts for pennies

Perfect for bulk social media content generation!
