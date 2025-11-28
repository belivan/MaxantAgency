# Smart Caching System - Google API Cost Optimization

## Overview

The prospecting engine now includes **smart caching** to dramatically reduce Google Maps API costs by reusing data we've already discovered.

## How It Works

### Before (Wasteful)

**Run 1:** Search "Italian restaurants Philadelphia"
```
1. Google Text Search: $0.005 (1 call)
2. Place Details for 20 results: $0.100 (20 calls × $0.005)
Total: $0.105
```

**Run 2:** Search "Italian restaurants Philadelphia" again (same search)
```
1. Google Text Search: $0.005 (1 call)
2. Place Details for 20 results: $0.100 (20 calls × $0.005) ❌ WASTE!
Total: $0.105
```

**Total Cost:** $0.210
**Wasted:** $0.100 (47% waste!)

### After (Smart Caching)

**Run 1:** Search "Italian restaurants Philadelphia"
```
1. Google Text Search: $0.005 (1 call)
2. Place Details for 20 results: $0.100 (20 calls × $0.005)
Total: $0.105
✅ Data saved to database
```

**Run 2:** Search "Italian restaurants Philadelphia" again
```
1. Google Text Search: $0.005 (1 call) - Can't avoid this
2. Check database cache for each result
   - Found 15 in cache: $0.000 (0 API calls) ✅
   - New 5 places: $0.025 (5 calls × $0.005)
Total: $0.030
```

**Total Cost:** $0.135
**Saved:** $0.075 (36% savings!)

## The Cache Flow

```
Google Text Search
    ↓
For each Place ID:
    ↓
┌──────────────────────┐
│ Check Database Cache │
└──────────────────────┘
    ↓           ↓
   YES          NO
    ↓           ↓
Reuse Data   Fetch from Google
(0 calls)    (1 call = $0.005)
    ↓           ↓
    └─────┬─────┘
          ↓
    Process & Link
```

## Cost Breakdown

### Per Prospect Discovery

| Step | Without Cache | With Cache (if cached) | Savings |
|------|--------------|----------------------|---------|
| Text Search | $0.005 (shared) | $0.005 (shared) | $0 |
| Place Details | $0.005 | **$0.000** ✅ | **$0.005** |
| **Total** | **$0.005/prospect** | **$0.000/prospect** | **100%** |

### Real-World Scenarios

#### Scenario 1: Same Search, Different Projects

**Project A:** "Italian restaurants Philadelphia" (20 results)
- Cost: $0.105

**Project B:** "Italian restaurants Philadelphia" (same search)
- Text search: $0.005
- 20 cached prospects: $0.000 (0 Place Details calls)
- **Cost: $0.005 (95% savings!)**

#### Scenario 2: Overlapping Searches, Same Project

**Run 1:** "Italian restaurants Philadelphia" (20 results)
- Cost: $0.105

**Run 2:** "Pizza restaurants Philadelphia" (20 results, 10 overlap with Italian)
- Text search: $0.005
- 10 cached (Italian restaurants): $0.000
- 10 new (Pizza-only): $0.050
- **Cost: $0.055 (48% savings)**

#### Scenario 3: Multi-City Campaign

**Run 1:** Philadelphia (50 restaurants)
- Cost: $0.255

**Run 2:** New York (50 restaurants, different places)
- Cost: $0.255

**Run 3:** Boston (50 restaurants, some chains overlap)
- Text search: $0.005
- 15 cached (chain restaurants): $0.000
- 35 new: $0.175
- **Cost: $0.180 (29% savings)**

## What Gets Cached

When a prospect is saved to the database, we cache:
- ✅ Company name
- ✅ Website
- ✅ Phone number
- ✅ Address (street, city, state)
- ✅ Google rating & review count
- ✅ Industry/business type
- ✅ Google Place ID (unique identifier)

## What Still Requires Google API Calls

### 1. Text Search (Always Required)
```javascript
// Can't avoid this - it's how we find places
"Italian restaurants Philadelphia" → Returns place IDs
Cost: $0.005 per search
```

You MUST do a text search to get results. There's no way around this.

### 2. Place Details (Cached When Possible)
```javascript
// Only called if NOT in cache
getPlaceDetails(place_id) → Returns website, phone, etc.
Cost: $0.005 per call
```

This is where the savings happen! If we already have this place_id in our database, we skip this call.

## Logs Show Cache Hits

When running prospecting, you'll see:

```
✅ Using cached prospect data (0 API calls) {"company":"Osteria","placeId":"ChIJ..."}
✅ Using cached prospect data (0 API calls) {"company":"Villa di Roma","placeId":"ChIJ..."}
```

These are **free** - no Google API calls made!

## Automatic Behavior

The caching is **automatic** and **always enabled**. You don't need to do anything special:

```javascript
// Just run prospecting normally
const results = await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'my-project' }
);

// Cache is checked automatically for each result
// Logs will show "Using cached prospect data" for cache hits
```

## Database as Cache

The `prospects` table serves as the cache:

```sql
SELECT * FROM prospects WHERE google_place_id = 'ChIJ6SuyUYrHxokR-4BpMK0WIiM';
```

- If found → Use cached data (0 API calls)
- If not found → Fetch from Google (1 API call)

## Cache Invalidation

**Q: What if business information changes?**

The cache is permanent by default. If you want fresh data:

1. **Delete the prospect** and re-run:
   ```javascript
   await deleteProspect(prospectId);
   // Re-run prospecting - will fetch fresh from Google
   ```

2. **Force refresh** (future feature):
   ```javascript
   // Not yet implemented
   await runProspectingPipeline(brief, {
     projectId,
     forceRefresh: true // Re-fetch all data from Google
   });
   ```

## Cost Projections

### Monthly Campaign Example

**Without Caching:**
- 4 campaigns per month
- 100 prospects per campaign
- 50% overlap between campaigns

Costs:
- Campaign 1: 100 prospects × $0.005 = $0.50
- Campaign 2: 100 prospects × $0.005 = $0.50
- Campaign 3: 100 prospects × $0.005 = $0.50
- Campaign 4: 100 prospects × $0.005 = $0.50
- **Monthly Total: $2.00**

**With Smart Caching:**
- Campaign 1: 100 new × $0.005 = $0.50
- Campaign 2: 50 cached + 50 new × $0.005 = $0.25
- Campaign 3: 50 cached + 50 new × $0.005 = $0.25
- Campaign 4: 50 cached + 50 new × $0.005 = $0.25
- **Monthly Total: $1.25**
- **Savings: $0.75/month (38%)**

At scale (1000 prospects/month with 50% overlap):
- **Savings: $7.50/month**
- **Annual Savings: $90/year**

## Technical Implementation

### Code Location

[discoverers/google-maps.js:126-159](prospecting-engine/discoverers/google-maps.js#L126)

```javascript
async function extractCompanyData(place) {
  // Check cache first
  const cachedProspect = await prospectExists(place.place_id);

  if (cachedProspect) {
    // Use cached data - 0 API calls!
    return convertCachedToCompany(cachedProspect);
  }

  // Not cached - fetch from Google
  const details = await getPlaceDetails(place.place_id);
  // ... process fresh data
}
```

### Database Query

[database/supabase-client.js:178-194](prospecting-engine/database/supabase-client.js#L178)

```javascript
export async function prospectExists(googlePlaceId) {
  const { data } = await supabase
    .from('prospects')
    .select('*')
    .eq('google_place_id', googlePlaceId)
    .single();

  return data || null;
}
```

## Monitoring Cache Performance

Check your logs for cache hit rate:

```bash
# Count cache hits
grep "Using cached prospect data" logs/combined.log | wc -l

# Count total prospects processed
grep "Company discovered" logs/combined.log | wc -l

# Calculate cache hit rate
cache_hits / total_processed × 100 = hit_rate%
```

## Best Practices

1. **Reuse projects** - More runs on same project = higher cache hit rate
2. **Overlap searches** - "Italian" + "Pizza" + "Fine Dining" = shared cache
3. **Multi-city campaigns** - Chain restaurants cached across cities
4. **Don't delete prospects** - Keep them for future cache hits
5. **Monitor logs** - Watch for "Using cached prospect data" messages

## Summary

✅ **Automatic** - No code changes needed
✅ **Cost-effective** - Save 30-95% on duplicate searches
✅ **Fast** - Database lookup faster than API call
✅ **Smart** - Only fetches fresh data when needed
✅ **Transparent** - Logs show cache hits clearly

The smart caching system pays for itself after just a few prospecting runs!
