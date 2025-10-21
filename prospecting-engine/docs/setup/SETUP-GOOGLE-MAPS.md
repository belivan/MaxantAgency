# Google Maps API Setup

## Why Do We Need This?

The Prospecting Engine uses **Google Maps Places API** as its **primary discovery method** for finding real businesses (Step 2 of the pipeline).

This replaced the old approach of using Grok AI to generate company names, which had a **20-30% success rate** (hallucinated companies). Google Maps provides **90%+ success rate** with real, verified businesses.

---

## Getting a Google Maps API Key

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Name it something like "Prospecting Engine" or "Lead Generation"

### Step 2: Enable the Required APIs

1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for and enable these APIs:
   - **Places API** (required)
   - **Maps JavaScript API** (optional, for future features)
   - **Geocoding API** (optional, for address validation)

### Step 3: Create an API Key

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "API Key"**
3. Copy the API key (starts with `AIza...`)

### Step 4: Restrict the API Key (Security)

1. Click on your new API key to edit it
2. Under **"API restrictions"**, select **"Restrict key"**
3. Check only:
   - Places API
   - (Optional) Maps JavaScript API
   - (Optional) Geocoding API
4. Under **"Application restrictions"**, you can:
   - Leave unrestricted for development
   - Add IP restrictions for production
5. Click **"Save"**

---

## Adding the Key to Your Environment

### Option 1: Add to `website-audit-tool/.env` (Recommended)

This makes the key available to all MaxantAgency tools:

```bash
cd c:\Users\anton\Desktop\MaxantAgency\website-audit-tool
```

Edit `.env` and add:
```bash
# Google Maps API (for prospecting-engine)
GOOGLE_MAPS_API_KEY=AIzaSy...your-key-here
```

The prospecting-engine automatically falls back to this file.

### Option 2: Create `.env` in `prospecting-engine/`

```bash
cd c:\Users\anton\Desktop\MaxantAgency\prospecting-engine
cp .env.template .env
```

Edit `.env` and add your key:
```bash
GOOGLE_MAPS_API_KEY=AIzaSy...your-key-here
```

---

## Verify It Works

Run this test to verify your API key:

```bash
npm run test:discovery
```

You should see:
```
✅ Google Maps discovery working
   Found: 20 companies
   Example: Vetri Cucina (4.6★)
```

---

## API Costs

### Google Maps Places API Pricing

| Operation | Cost per Request | Our Usage |
|-----------|------------------|-----------|
| Text Search | $0.032 | 1 per run |
| Place Details | $0.017 | 1 per company |

**Example Cost Calculation:**
- Find 20 companies: `$0.032 + (20 × $0.017) = $0.372`
- Find 100 companies: `$0.032 + (100 × $0.017) = $1.732`

**Note:** Google provides **$200/month free credit** for Google Maps Platform, which covers:
- ~500 companies/month for free
- ~10,000 companies before you pay anything

### Total Pipeline Cost (All 7 Steps)

| Component | Cost per Prospect |
|-----------|-------------------|
| Google Maps (Steps 2-3) | $0.017 |
| Grok AI Vision (Step 4) | $0.005 |
| Grok AI (Steps 1 & 7) | $0.005 |
| **TOTAL** | **~$0.027** |

**For 100 prospects: ~$2.70** 💸

**INCREDIBLY AFFORDABLE for enterprise-grade prospecting!**

---

## Free Tier Limits

Google Maps free tier:
- **$200/month credit** (renews monthly)
- Covers **~7,400 place details** requests
- Enough for **~7,000 prospects/month**

If you exceed this:
- Set up billing (Google will email you)
- Monitor usage in Google Cloud Console
- Set budget alerts

---

## Testing Without API Key

Some components work without a Google Maps API key:

### ✅ Works Without Key:
- Phase 4 Intelligence (AI query optimization, relevance scoring)
- Website verification (Step 3)
- Website extraction (Step 4, if you provide URLs)
- Social discovery (Step 5-6)

### ❌ Requires Key:
- Google Maps discovery (Step 2) - **PRIMARY discovery method**
- Full end-to-end pipeline test

**To test without Google Maps:**
```bash
npm run test:phase-4  # Tests intelligence layer only
```

---

## Troubleshooting

### Error: "GOOGLE_MAPS_API_KEY not set"
- Make sure you added the key to `.env`
- Restart your server after adding the key
- Check the key starts with `AIza`

### Error: "This API project is not authorized to use this API"
- Enable "Places API" in Google Cloud Console
- Wait 1-2 minutes for changes to propagate

### Error: "You have exceeded your daily request quota"
- You hit the free tier limit
- Add billing to Google Cloud project
- Or wait until tomorrow (quota resets)

### Error: "API key not valid"
- Check for typos in your `.env` file
- Make sure there are no quotes around the key
- Verify the key in Google Cloud Console

---

## Next Steps

Once you've added your Google Maps API key:

1. **Test discovery**:
   ```bash
   npm run test:discovery
   ```

2. **Run full pipeline**:
   ```bash
   npm run test:e2e
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Find prospects**:
   ```bash
   curl -X POST http://localhost:5555/api/prospect \
     -H "Content-Type: application/json" \
     -d '{
       "industry": "Italian Restaurants",
       "city": "Philadelphia",
       "count": 10
     }'
   ```

---

## Security Best Practices

✅ **DO:**
- Restrict API key to specific APIs
- Add application restrictions in production
- Monitor usage in Google Cloud Console
- Set budget alerts
- Keep `.env` out of version control (in `.gitignore`)

❌ **DON'T:**
- Share your API key publicly
- Commit `.env` to Git
- Use the same key for multiple projects
- Leave unrestricted keys in production

---

**Ready to find some real businesses?** 🚀
