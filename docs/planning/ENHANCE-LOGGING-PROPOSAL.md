# Enhanced Logging Proposal for Analysis Engine

## Current Issue
When analyzing large websites (like Notion with 28,718 pages), we're losing valuable discovery data in the database. Only the local backup has the full details.

## Proposed Solution

### 1. Add New Database Field: `discovery_log`

Add a JSONB field to the `leads` table that captures complete discovery data:

```sql
ALTER TABLE leads ADD COLUMN discovery_log JSONB;
```

### 2. Structure of `discovery_log`

```javascript
discovery_log: {
  // Discovery Summary
  summary: {
    total_discovered: 28718,
    sitemap_pages: 12595,
    robots_pages: 16176,
    navigation_pages: 84,
    discovery_time_ms: 53882
  },

  // All Discovered URLs (compressed)
  all_pages: [
    "/",
    "/product",
    "/pricing",
    // ... all 28,718 URLs
  ],

  // AI Selection Process
  ai_selection: {
    reasoning: "Full AI reasoning text...",
    selected_pages: {
      seo: ["/", "/blog", "/product", "/about", "/contact"],
      content: ["/", "/blog", "/about", "/services", "/pricing"],
      visual: ["/", "/product", "/pricing", "/contact", "/signup"],
      social: ["/", "/about", "/blog", "/contact", "/teams"]
    },
    selection_criteria: "Industry-specific optimization for technology sector..."
  },

  // Discovery Errors & Warnings
  discovery_issues: {
    sitemap_missing: false,
    robots_missing: false,
    navigation_errors: [],
    crawl_failures: [
      { url: "/broken-page", error: "404 Not Found" }
    ]
  },

  // Page Classification
  page_types: {
    homepage: 1,
    product: 45,
    pricing: 3,
    blog: 1250,
    about: 12,
    contact: 5,
    legal: 23,
    other: 27379
  }
}
```

## Benefits

1. **Full Traceability** - Know exactly what was discovered and analyzed
2. **AI Decision Audit** - Understand why certain pages were selected
3. **SEO Insights** - See site structure and page distribution
4. **Debug Capability** - Troubleshoot issues with complete logs
5. **Historical Record** - Track how sites evolve over time

## Implementation Steps

1. **Update Database Schema**
   ```bash
   cd database-tools
   # Add discovery_log field to leads.json schema
   npm run db:validate
   npm run db:setup
   ```

2. **Update Orchestrator**
   ```javascript
   // In orchestrator.js, capture full discovery data
   discovery_log: {
     summary: {
       total_discovered: sitemap.totalPages,
       sitemap_pages: sitemap.sources.sitemap,
       robots_pages: sitemap.sources.robots,
       navigation_pages: sitemap.sources.navigation,
       discovery_time_ms: sitemap.discoveryTime
     },
     all_pages: sitemap.pages,  // Full list
     ai_selection: {
       reasoning: pageSelection.reasoning,
       selected_pages: pageSelection,
       selection_criteria: pageSelection.criteria
     },
     discovery_issues: {
       sitemap_missing: !enrichedContext.discovery_status.has_sitemap,
       robots_missing: !enrichedContext.discovery_status.has_robots,
       navigation_errors: sitemap.errors.navigation ? [sitemap.errors.navigation] : [],
       crawl_failures: crawledPages.filter(p => !p.success).map(p => ({
         url: p.url,
         error: p.error
       }))
     },
     page_types: classifyAllPages(sitemap.pages)
   }
   ```

3. **Compression Strategy**
   For very large sites, compress the URL list:
   ```javascript
   // Store as compressed JSON string
   discovery_log: {
     all_pages_compressed: gzip(JSON.stringify(sitemap.pages))
   }
   ```

## Storage Considerations

- **Average Site (<100 pages):** ~5KB
- **Medium Site (1,000 pages):** ~50KB
- **Large Site (10,000 pages):** ~200KB (compressed)
- **Huge Site (30,000 pages):** ~400KB (compressed)

This is acceptable for a JSONB field and provides immense value for debugging and analysis.

## Immediate Actions

While we implement the database enhancement, ensure:

1. ✅ **Local backups are working** (they are!)
2. ✅ **Critical metadata is in crawl_metadata** (it is!)
3. ⚡ **Consider saving discovery_log as a separate file** alongside screenshots

## Alternative: File-Based Discovery Log

Instead of database, save discovery logs as files:

```javascript
// Save alongside screenshots
const discoveryLogPath = `./analysis-logs/${company_name}_${date}_discovery.json`;
fs.writeFileSync(discoveryLogPath, JSON.stringify({
  all_pages: sitemap.pages,
  ai_reasoning: pageSelection,
  discovery_details: sitemap
}, null, 2));

// Reference in database
discovery_log_path: discoveryLogPath
```

This keeps the database lean while preserving full discovery data.