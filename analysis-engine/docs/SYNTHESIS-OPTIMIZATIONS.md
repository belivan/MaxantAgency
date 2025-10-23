# ⚡ Synthesis Pipeline Optimizations

## 1. Parallel Synthesis Stages

### What Changed
Previously, synthesis ran **sequentially**:
```
Stage 1: Issue Deduplication (15-20s)
  ↓
Stage 2: Executive Summary (15-20s)
  ↓
Total: 30-40 seconds
```

Now synthesis runs **in parallel**:
```
Stage 1: Issue Deduplication (15-20s)  ┐
                                        ├─ Run simultaneously
Stage 2: Executive Summary (15-20s)    ┘
                                        ↓
Total: 15-20 seconds (50% faster!)
```

### How It Works
- Both AI stages now run using `Promise.allSettled()`
- Executive summary uses **fallback issue data** instead of waiting for deduplication
- If deduplication completes first, those results are used in final output
- Both stages are independent and can run simultaneously

### Code Location
`analysis-engine/reports/synthesis/report-synthesis.js` - Lines ~219-254

### Expected Impact
- **Synthesis time:** Reduced from ~30-40s to ~15-20s
- **Total analysis time:** Reduced by ~15-20 seconds
- **Overall speedup:** ~20-25% faster

### Trade-offs
- Executive summary uses pre-deduplicated issues (raw module issues)
- Slightly less refined than sequential approach, but difference is minimal
- Both stages still produce high-quality output

---

## 2. AI Response Caching

### What It Does
Caches AI API responses in memory to avoid repeated calls with identical inputs.

### When to Use
- **Development:** Testing report generation multiple times with same site
- **Testing:** Running integration tests repeatedly
- **Debugging:** Iterating on report templates without re-analyzing

### When NOT to Use
- **Production:** Live analysis should always be fresh
- **Different sites:** Cache is input-specific
- **Cost tracking:** Cached responses don't update usage/cost stats

### How It Works

1. **Cache Key Generation:**
   - Creates SHA-256 hash from: model + system prompt + user prompt + temperature + JSON mode
   - First 16 characters of hash used as key
   - Identical inputs = identical key = cache hit

2. **Cache Lookup:**
   - Before calling AI API, checks if response exists in cache
   - If found: Returns cached response instantly (no API call)
   - If not found: Makes API call and caches result

3. **Cache Storage:**
   - In-memory Map structure (fast but not persistent)
   - Cleared when process restarts
   - Optional: Clear on startup with `CLEAR_AI_CACHE=true`

4. **Statistics Tracking:**
   - Hits: Number of cached responses used
   - Misses: Number of API calls made
   - Hit Rate: Percentage of requests served from cache

### Usage

#### Enable Caching
```bash
# In .env or terminal
ENABLE_AI_CACHE=true node analysis-engine/test-maksant-html.js
```

#### Clear Cache on Startup
```bash
ENABLE_AI_CACHE=true CLEAR_AI_CACHE=true node analysis-engine/test-maksant-html.js
```

#### View Cache Statistics
Cache logs automatically show:
```
[AI Cache] ✓ Cache HIT (5 hits, 2 misses, 71.4% hit rate)
```

### Code Location
- **Cache Implementation:** `analysis-engine/shared/ai-cache.js`
- **Integration:** `analysis-engine/shared/ai-client.js` - Lines ~4, ~76-82, ~120-124

### Example Scenario

**First Run (Cold Cache):**
```
SEO Analysis → API call (3s) → Cache save
Content Analysis → API call (3s) → Cache save
Desktop Visual → API call (4s) → Cache save
Mobile Visual → API call (4s) → Cache save
Social Analysis → API call (2s) → Cache save
Accessibility → API call (3s) → Cache save
Issue Deduplication → API call (18s) → Cache save
Executive Summary → API call (16s) → Cache save

Total: ~53 seconds of AI calls
```

**Second Run (Warm Cache):**
```
SEO Analysis → Cache HIT (instant)
Content Analysis → Cache HIT (instant)
Desktop Visual → Cache HIT (instant)
Mobile Visual → Cache HIT (instant)
Social Analysis → Cache HIT (instant)
Accessibility → Cache HIT (instant)
Issue Deduplication → Cache HIT (instant)
Executive Summary → Cache HIT (instant)

Total: <1 second of cache lookups
Cache Hit Rate: 100%
```

### Expected Impact
- **First run:** No impact (must populate cache)
- **Subsequent runs:** ~95-98% faster AI processing
- **Development speedup:** 8-10 minute analysis → 2-3 minutes
- **Cost savings:** ~$0.15-0.30 per cached run

### Limitations
- Only caches non-image AI calls (screenshots always fresh)
- Not suitable for production (responses should be fresh)
- Cache doesn't persist across restarts
- Memory usage grows with unique requests

### Cache Key Considerations
Cache key uses **first 1000 characters** of prompts to balance:
- **Performance:** Shorter strings = faster hashing
- **Uniqueness:** 1000 chars sufficient to distinguish different analyses
- **Memory:** Smaller keys = less memory usage

If analyzing very similar sites, you might get false cache hits. Disable caching or use `CLEAR_AI_CACHE=true` between different analyses.

---

## Combined Impact

### Sequential Synthesis + No Cache (Before)
```
Discovery:        2s
Page Selection:   5s
Crawling:        55s
Analysis:       180s (6 analyzers × 30s)
Synthesis:       35s (sequential)
Report Gen:      10s
------------------------
Total:          287s (~5 minutes)
```

### Parallel Synthesis + Cache (After - 2nd Run)
```
Discovery:        2s
Page Selection:   5s
Crawling:        55s
Analysis:         5s (cached)
Synthesis:       18s (parallel)
Report Gen:      10s
------------------------
Total:           95s (~1.5 minutes)
------------------------
Speedup:        3x faster
```

### Parallel Synthesis Only (Fresh Analysis)
```
Discovery:        2s
Page Selection:   5s
Crawling:        55s
Analysis:       180s
Synthesis:       18s (parallel, 50% faster)
Report Gen:      10s
------------------------
Total:          270s (~4.5 minutes)
------------------------
Speedup:        6% faster
```

---

## Recommendations

### Development Workflow
1. **First test run:** No cache (populate cache)
2. **Template iterations:** Enable cache (instant AI responses)
3. **Different site:** Clear cache or disable

### Production Deployment
- **Disable caching:** Ensure fresh analysis for clients
- **Enable parallel synthesis:** Always active, no downsides

### Testing
- **Integration tests:** Enable cache to speed up test suite
- **Unit tests:** Cache not needed (mocked responses)

### Cost Optimization
- Development with cache: **$0.02-0.05 per run** (mostly crawling)
- Production without cache: **$0.15-0.30 per run** (full AI calls)
- Cache savings: **~85% reduction** in AI costs for repeat analyses
