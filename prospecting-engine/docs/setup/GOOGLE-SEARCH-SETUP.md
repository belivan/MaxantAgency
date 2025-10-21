# Google Custom Search API Setup Guide

**Purpose:** Enable social profile discovery (Twitter, YouTube, TikTok) via Google Search

**Time Required:** 5-10 minutes

---

## 🎯 What You Need

1. **Google Search API Key** - Authenticates your requests
2. **Custom Search Engine ID** - Defines what to search

---

## 📝 Step-by-Step Setup

### **Step 1: Get Google Search API Key**

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Create a new project (or select existing):**
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it: "Prospecting Engine" (or anything)
   - Click "Create"

3. **Enable Custom Search API:**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for: "Custom Search API"
   - Click "Custom Search API"
   - Click "Enable"

4. **Create API Key:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "+ CREATE CREDENTIALS"
   - Select "API key"
   - Copy the API key (looks like: `AIzaSyC9x...`)
   - (Optional) Click "Restrict Key" to add restrictions:
     - API restrictions: Select "Custom Search API"
     - Save

5. **Save your API key:**
   ```
   AIzaSyC9x_example_key_here
   ```

---

### **Step 2: Create Custom Search Engine**

1. **Go to Custom Search Engine console:**
   ```
   https://programmablesearchengine.google.com/controlpanel/all
   ```

2. **Click "Add" (or "New search engine"):**

3. **Configure the search engine:**

   **Name:**
   ```
   Prospecting Engine - Social Profiles
   ```

   **What to search:**
   - Select: "Search the entire web"
   - OR if you want to limit to social media sites, enter:
     ```
     twitter.com
     youtube.com
     tiktok.com
     linkedin.com
     facebook.com
     instagram.com
     ```

   **Search settings:**
   - Leave defaults (SafeSearch: Moderate)

4. **Click "Create"**

5. **Get your Search Engine ID:**
   - After creating, you'll see your new search engine
   - Click on it to edit
   - Look for "Search engine ID" (looks like: `a1b2c3d4e5f6g7h8`)
   - Copy it

   **Alternative way to find ID:**
   - In the list of search engines, look under "Details"
   - The ID is shown there

---

### **Step 3: Configure Search Engine (Important!)**

1. **In the Custom Search Engine editor:**
   - Click "Setup" tab
   - Make sure "Search the entire web" is **ON**
   - Click "Update"

2. **Test your search engine:**
   - Click "Get code" or "Preview"
   - Try searching for "twitter.com"
   - You should see results

---

### **Step 4: Add to .env File**

1. **Open your `.env` file:**
   ```bash
   prospecting-engine/.env
   ```

2. **Replace the placeholder values:**

   **Before:**
   ```bash
   GOOGLE_SEARCH_API_KEY=your-google-search-api-key-here
   GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
   ```

   **After:**
   ```bash
   GOOGLE_SEARCH_API_KEY=AIzaSyC9x_your_actual_key_here
   GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f6g7h8
   ```

3. **Save the file**

---

### **Step 5: Restart the Server**

1. **Stop the current server:**
   - Press `Ctrl+C` in the terminal where server is running

2. **Start it again:**
   ```bash
   cd prospecting-engine
   npm start
   ```

3. **The Google Search errors should be gone!**

---

## 🧪 Test It

Run a prospecting job and check the logs. You should now see:

**Before (errors):**
```
[error] Google search for social profile failed
{"error":"Google Search API error: 400","platform":"twitter"}
```

**After (success):**
```
[info] Social profile discovery complete
{"found":4,"platforms":["instagram","facebook","twitter","linkedin"]}
```

---

## 💰 Pricing & Limits

### **Free Tier:**
- **100 search queries per day** - FREE
- **10,000 queries per month** - FREE

### **Paid Tier (if you exceed free tier):**
- **$5 per 1,000 queries** after free tier
- Can set budget limits in Google Cloud Console

### **How Many Queries Does Prospecting Use?**

For each prospect, we search for **6 platforms**:
- Instagram (usually found on website, doesn't use API)
- Facebook (usually found on website, doesn't use API)
- LinkedIn (sometimes found on website)
- Twitter (uses Google Search API) ✓
- YouTube (uses Google Search API) ✓
- TikTok (uses Google Search API) ✓

**Average: 3 API calls per prospect**

**Examples:**
- 10 prospects = ~30 searches
- 50 prospects = ~150 searches
- 100 prospects = ~300 searches

**You have 100 free per day, so you can prospect ~30 companies per day for free.**

---

## 🔒 Security Best Practices

### **1. Restrict API Key**

In Google Cloud Console → Credentials → Your API Key:

**API Restrictions:**
- Restrict to: "Custom Search API" only

**Application Restrictions (optional):**
- HTTP referrers: Add your domain
- IP addresses: Add your server IP

### **2. Monitor Usage**

- Go to: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
- See how many searches you're using
- Set budget alerts if needed

### **3. Rotate Keys**

- Every 3-6 months, create a new key
- Update `.env` file
- Delete old key

---

## ❓ Troubleshooting

### **Error: "API key not valid"**

**Solution:**
1. Check you enabled "Custom Search API" in Google Cloud Console
2. Check your API key is correct (no extra spaces)
3. Wait 1-2 minutes after creating key (propagation time)

---

### **Error: "Billing must be enabled"**

**Solution:**
1. The free tier doesn't require billing for first 100 queries/day
2. If you see this, you might be using a restricted project
3. Create a new project without billing restrictions

---

### **Error: "Search engine ID not found"**

**Solution:**
1. Check the Engine ID is correct
2. Make sure you copied the full ID (no truncation)
3. Try deleting and recreating the search engine

---

### **Error: "Daily quota exceeded"**

**Solution:**
1. You've used more than 100 searches today
2. Wait until tomorrow (resets at midnight Pacific Time)
3. OR enable billing to increase quota

---

### **Still seeing 400 errors in logs?**

**Check:**
1. `.env` file has correct values (no quotes, no spaces)
2. Server was restarted after changing `.env`
3. API key has "Custom Search API" enabled
4. Search engine has "Search the entire web" enabled

---

## 🚫 Optional: Disable Google Search

If you don't want to set this up, you can disable it:

**Option 1: Skip social search for some platforms**

The prospecting engine will still find Instagram/Facebook/LinkedIn from website scraping. Only Twitter/YouTube/TikTok require Google Search.

**Impact:** You'll see error logs but everything else works fine.

**Option 2: Disable all social searching**

In your `.env`:
```bash
ENABLE_SOCIAL_SCRAPING=false
```

**Impact:** No social profiles found at all.

---

## ✅ Summary Checklist

- [ ] Google Cloud project created
- [ ] Custom Search API enabled
- [ ] API key created
- [ ] API key restricted to Custom Search API
- [ ] Custom Search Engine created
- [ ] "Search the entire web" enabled
- [ ] Search Engine ID copied
- [ ] Both values added to `.env`
- [ ] Server restarted
- [ ] Tested with prospecting job
- [ ] No more 400 errors in logs

---

## 📚 Official Documentation

- **Custom Search API:** https://developers.google.com/custom-search/v1/overview
- **Programmable Search Engine:** https://programmablesearchengine.google.com/about/
- **Pricing:** https://developers.google.com/custom-search/v1/overview#pricing

---

**Questions?** Check the troubleshooting section above or the official docs!
