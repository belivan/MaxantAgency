# Report Engine

Professional website audit report generation microservice for MaxantAgency.

## Overview

The **ReportEngine** is a standalone Express.js microservice responsible for generating professional website audit reports in multiple formats (HTML, Markdown, PDF). It receives analysis data from the Analysis Engine and produces client-ready reports with AI-powered synthesis.

### Key Features

- **Multi-Format Export**: Generate reports in HTML, Markdown, or PDF
- **AI Synthesis Pipeline**: GPT-5-powered issue deduplication and executive insights ($0.06/report, ~3.5min)
- **Professional Templates**: Executive summaries, visual evidence, action plans, ROI projections
- **Supabase Integration**: Automated storage and metadata tracking
- **Modular Architecture**: 75+ files organized into exporters, templates, formatters, and utilities

### Architecture Position

```
Analysis Engine (:3001)
    ↓ POST /api/generate
ReportEngine (:3003)
    ↓ Saves to
Supabase Storage (reports bucket)
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd report-engine
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
# Required
PORT=3003
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional (for AI synthesis)
USE_AI_SYNTHESIS=true
OPENAI_API_KEY=sk-...
```

### 3. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start on **http://localhost:3003**

---

## API Endpoints

### Generate Report

**POST `/api/generate`**

Generate a report from analysis data.

**Request Body:**
```json
{
  "analysisResult": {
    "company_name": "Example Co",
    "url": "https://example.com",
    "grade": "B",
    "overall_score": 78,
    "design_score": 82,
    "seo_score": 75,
    "design_issues_desktop": [...],
    "design_issues_mobile": [...],
    "seo_issues": [...],
    "content_issues": [...],
    "social_issues": [...],
    "accessibility_issues": [...],
    "quick_wins": [...],
    "screenshot_desktop_path": "...",
    "screenshot_mobile_path": "...",
    "matched_benchmark_data": {...}
  },
  "options": {
    "format": "html",
    "sections": ["all"],
    "saveToDatabase": true,
    "project_id": "uuid",
    "lead_id": "uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "storage_path": "reports/example-co-website-audit-2025-10-28.html",
    "local_path": "../local-backups/report-engine/reports/example-co-website-audit-2025-10-28.html",
    "format": "html",
    "company_name": "Example Co",
    "website_url": "https://example.com",
    "download_url": "https://...signed-url...",
    "metadata": {...}
  }
}
```

---

### Get Report Metadata

**GET `/api/reports/:id`**

Retrieve report metadata by ID.

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "lead_id": "uuid",
    "company_name": "Example Co",
    "format": "html",
    "storage_path": "...",
    "file_size_bytes": 1234567,
    "generated_at": "2025-10-28T...",
    "download_count": 3
  }
}
```

---

### Get Download URL

**GET `/api/reports/:id/download`**

Get a signed download URL (valid for 1 hour).

**Response:**
```json
{
  "success": true,
  "download_url": "https://...supabase-signed-url...",
  "report": {
    "id": "uuid",
    "company_name": "Example Co",
    "format": "html",
    "generated_at": "2025-10-28T..."
  }
}
```

---

### List Reports by Lead

**GET `/api/reports/lead/:lead_id`**

Get all reports for a specific lead.

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "uuid-1",
      "format": "html",
      "generated_at": "2025-10-28T..."
    },
    {
      "id": "uuid-2",
      "format": "pdf",
      "generated_at": "2025-10-27T..."
    }
  ],
  "count": 2
}
```

---

### Delete Report

**DELETE `/api/reports/:id`**

Delete a report from storage and database.

**Response:**
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

### Health Check

**GET `/health`**

Check service status.

**Response:**
```json
{
  "status": "ok",
  "service": "report-engine",
  "version": "1.0.0",
  "timestamp": "2025-10-28T...",
  "environment": "development"
}
```

---

## AI Synthesis Pipeline

The ReportEngine includes an optional AI synthesis pipeline that enhances reports with:

### Stage 1: Issue Deduplication (~35s, Claude Haiku 4.5)
- Consolidates redundant findings across analyzers
- Reduces issue count by 40-70%
- Merges overlapping observations (e.g., "CTA too small" + "CTA not prominent" → "CTA lacks prominence")
- Uses Claude Haiku 4.5 with 64,000 token output limit

### Stage 2: Executive Insights (~140s, Claude Haiku 4.5)
- Business-friendly summary
- 30/60/90-day strategic roadmap
- ROI projection statements
- Screenshot evidence linking
- Generates 500-word executive summaries

**Cost**: ~$0.06 per report | **Duration**: ~3.5 minutes

### Token Limits

- **Claude Haiku 4.5**: 64,000 token maximum (API required field)
- **GPT-5/Grok**: No token limits enforced (optional field)
- **Configuration**: Token limits removed from prompt configs to allow models to use native capacity

**Enable Synthesis:**
```bash
USE_AI_SYNTHESIS=true
SYNTHESIS_TIMEOUT=180000
OPENAI_API_KEY=sk-...
```

**When to Use:**
- ✅ Client-facing reports
- ✅ High-value leads
- ✅ Automated batch generation
- ❌ Internal testing
- ❌ Cost-sensitive high-volume operations

---

## Recent Fixes & Improvements

### Performance Metrics - CrUX Null Handling
**Fixed**: CrUX section crashing when individual metrics (e.g., `inp`) are `null`

- Added null checks before processing CrUX metrics
- Section only displays if at least one valid metric exists
- Individual null metrics are silently skipped (not displayed)
- **Location**: [performance-metrics.js:269-273](reports/exporters/components/sections/performance-metrics.js#L269-L273)

### Benchmark Strengths Display
**Fixed**: Only showing 2 out of 5 benchmark strengths

- Increased display limit from `slice(0, 2)` to `slice(0, 5)`
- Now shows up to 5 strengths per device type (desktop/mobile)
- **Location**: [benchmark-comparison.js:148-156](reports/exporters/components/sections/benchmark-comparison.js#L148-L156)

### Business Intelligence Section
**Temporarily Disabled**: Company size, employee count, market analysis

- Commented out for now (non-essential for website redesign pitches)
- Can be re-enabled by uncommenting in sections-registry.js
- **Location**: [sections-registry.js:146-159](reports/exporters/components/sections-registry.js#L146-L159)

### Validation Warnings
**Fixed**: False warnings about missing synthesis data

- Removed checks for `consolidated_issues` and `executive_summary`
- Synthesis data passed separately with camelCase field names
- Validator was checking wrong object (analysisResult vs synthesisData)
- **Location**: [report-data-validator.js:117-122](reports/exporters/validators/report-data-validator.js#L117-L122)

---

## Report Formats

### HTML (Default)

**Preview Version:**
- Executive summary
- Score breakdown
- Top 3-5 issues
- Action plan
- Benchmarking (if available)

**Full Version:**
- Everything in preview +
- Detailed technical analysis
- Complete issue breakdown
- Screenshot galleries
- Performance metrics
- Business intelligence

**Output**: Embedded screenshots, styled with modern light theme

---

### Markdown

- Section-based structure
- Screenshot references (as file paths)
- Tables for scores and metrics
- Action plan with priorities
- Technical appendix

**Output**: Plain text with markdown formatting

---

### PDF

- Generated from HTML using Playwright
- Professional layout
- Embedded images
- Print-optimized styling

**Note**: Requires Playwright (installed automatically)

---

## File Structure

```
report-engine/
├── server.js                           # Express API server
├── package.json                        # Dependencies
├── .env.example                        # Environment template
│
├── reports/
│   ├── auto-report-generator.js        # Main orchestrator
│   ├── report-generator.js             # Core generator
│   │
│   ├── exporters/                      # Format exporters
│   │   ├── html-exporter-v3.js         # HTML (active)
│   │   ├── pdf-generator.js            # PDF generation
│   │   └── components/                 # HTML sections & styles
│   │
│   ├── templates/                      # Markdown templates
│   │   └── sections/                   # 18 section generators
│   │
│   ├── formatters/                     # Score/issue/table formatters
│   ├── utils/                          # ROI, priority, screenshots
│   ├── storage/                        # Supabase integration
│   │   └── supabase-storage.js
│   │
│   └── synthesis/                      # AI synthesis pipeline
│       ├── report-synthesis.js         # Main pipeline
│       └── qa-validator.js             # Quality validation
│
├── shared/                             # Shared modules
│   ├── prompt-loader.js                # Load AI prompts
│   ├── ai-client.js                    # AI API calls
│   └── ai-cache.js                     # Response caching
│
└── config/
    ├── prompts/report-synthesis/       # AI prompts
    │   ├── issue-deduplication.json
    │   └── executive-insights-generator.json
    └── report-config.js                # Report settings
```

---

## Environment Variables

### Required

```bash
PORT=3003
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### AI Synthesis (Optional)

```bash
USE_AI_SYNTHESIS=true
SYNTHESIS_TIMEOUT=180000
SYNTHESIS_REQUIRED=false
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Report Settings

```bash
REPORT_FORMAT=html
REPORT_VERSION=v3
REPORT_STYLE=executive
REPORT_TYPE=full
INCLUDE_ROI=true
INCLUDE_COMPETITORS=true
INCLUDE_SCREENSHOTS=true
AUTO_GENERATE_PDF=false
```

### Storage

```bash
LOCAL_BACKUP_PATH=../local-backups/report-engine/reports
STORAGE_BUCKET=reports
STORAGE_PUBLIC_ACCESS=false
SIGNED_URL_EXPIRATION=3600
```

---

## Database Schema

The ReportEngine uses the `reports` table (defined in `database-tools/shared/schemas/reports.json`):

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  report_type TEXT DEFAULT 'website_audit',
  format TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'reports',
  file_size_bytes INTEGER,
  company_name TEXT,
  website_url TEXT,
  overall_score INTEGER,
  website_grade TEXT,
  config JSONB,
  status TEXT DEFAULT 'completed',
  download_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Setup:**
```bash
cd ../database-tools
npm run db:validate
npm run db:setup
```

---

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3003/health

# Generate report (requires analysis data)
curl -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "analysisResult": {...},
    "options": {"format": "html", "saveToDatabase": true}
  }'
```

### Integration Testing

```bash
# Test with real analysis data
node tests/test-report-generation.js
```

---

## Migration from Analysis Engine

The ReportEngine was extracted from the Analysis Engine to:
1. **Separate concerns**: Analysis vs. Report Generation
2. **Independent scaling**: Scale report generation separately
3. **Simplified maintenance**: Isolated testing and updates
4. **Better performance**: Parallel processing of analysis and reports

### What Changed:

**Before (Analysis Engine):**
```javascript
// Reports auto-generated after analysis
const result = await analyzeUrl(url);
// Report automatically saved to local-backups/analysis-engine/reports/
```

**After (ReportEngine):**
```javascript
// 1. Analyze
const analysisResult = await analyzeUrl(url);

// 2. Generate report separately
const reportResult = await fetch('http://localhost:3003/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    analysisResult,
    options: { format: 'html', saveToDatabase: true }
  })
});
```

---

## Troubleshooting

### Reports not generating

1. Check server is running: `curl http://localhost:3003/health`
2. Verify environment variables in `.env`
3. Check Supabase connection
4. Review server logs for errors

### AI Synthesis timing out

- Increase `SYNTHESIS_TIMEOUT` (default: 180000ms)
- Check OpenAI API key validity
- Try disabling synthesis: `USE_AI_SYNTHESIS=false`

### Storage upload fails

- Verify `SUPABASE_SERVICE_KEY` has storage permissions
- Check `reports` bucket exists in Supabase
- Ensure bucket is private (not public)

### PDF generation errors

- Install Playwright browsers: `npx playwright install chromium`
- Check system has enough memory (PDF generation is memory-intensive)

### CrUX section showing but empty

**Fixed in latest version**: CrUX section now only displays if valid metrics exist

- If you see empty "rating" or "collection" fields, the section will be hidden entirely
- Individual null metrics (like `inp: null`) are automatically skipped
- Ensure you're running the latest version with the CrUX null handling fix

---

## Development

### Adding a New Report Format

1. Create exporter in `reports/exporters/`
2. Implement `export(reportData, options)` function
3. Register in `reports/report-generator.js`

### Modifying Templates

- **HTML**: Edit `reports/exporters/components/sections/`
- **Markdown**: Edit `reports/templates/sections/`
- **Styles**: Edit `reports/exporters/components/css/base-styles.js`

### Adding Synthesis Stages

1. Create prompt in `config/prompts/report-synthesis/`
2. Add stage to `reports/synthesis/report-synthesis.js`
3. Update schema in prompt JSON

---

## Performance

**Typical Generation Times:**

- HTML (no synthesis): ~2-5 seconds
- HTML (with synthesis): ~3.5 minutes
- PDF: +10-15 seconds additional
- Markdown: ~1-2 seconds

**Storage:**

- HTML reports: 500KB - 2MB
- PDF reports: 1MB - 5MB
- Markdown reports: 50KB - 200KB

---

## License

MIT

---

## Support

For issues or questions:
- Check logs: `npm run dev` (watch console output)
- Review documentation: `reports/synthesis/SYNTHESIS-INTEGRATION-GUIDE.md`
- GitHub Issues: https://github.com/yourusername/MaxantAgency/issues
