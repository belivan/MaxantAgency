# Website Audit Report Generator

Generates comprehensive, professional reports from Analysis Engine results in **Markdown** or **HTML** format.

## Features

- ✅ **Multiple Export Formats** - Markdown (client-ready) and HTML (dark theme, styled)
- ✅ **Professional Dark Theme HTML** - Modern, near-black background (#0a0a0a) with gradients and responsive design
- ✅ **10 Comprehensive Sections** - Executive summary, desktop/mobile analysis, SEO, content, social, accessibility, business intelligence, lead priority, action plan, and appendix
- ✅ **Supabase Storage Integration** - Upload and manage reports in cloud storage
- ✅ **Time & Cost Estimates** - Automatic estimation for all recommended fixes
- ✅ **Priority Sorting** - Issues organized by impact and urgency
- ✅ **WCAG Compliance** - Accessibility issues with WCAG references
- ✅ **Action Plans** - Phased implementation roadmap with ROI

## Architecture

```
reports/
├── report-generator.js           # Main generator (Markdown & HTML)
├── exporters/                    # Format-specific exporters
│   └── html-exporter.js          # HTML report generation
├── formatters/                   # Markdown output formatting
│   ├── score-formatter.js        # Scores with emoji/badges
│   ├── issue-formatter.js        # Issue formatting
│   └── table-formatter.js        # Markdown tables
├── templates/
│   ├── html-template.html        # Dark theme HTML template
│   └── sections/                 # Markdown report sections
│       ├── executive-summary.js
│       ├── desktop-analysis.js
│       ├── mobile-analysis.js
│       ├── seo-section.js
│       ├── content-section.js
│       ├── social-section.js
│       ├── accessibility-section.js
│       ├── business-intel.js
│       ├── lead-priority.js
│       ├── action-plan.js
│       └── appendix.js
├── utils/                        # Utilities
│   ├── estimator.js              # Time/cost estimation
│   └── priority-sorter.js        # Issue prioritization
└── storage/
    └── supabase-storage.js       # Supabase integration
```

## Usage

### Generate a Markdown Report

```javascript
import { generateReport } from './reports/report-generator.js';

const report = await generateReport(analysisResult, {
  format: 'markdown',
  sections: ['all'] // or specific sections: ['executive', 'desktop', 'mobile']
});

console.log(report.content); // Markdown content
console.log(report.metadata); // Generation metadata
```

### Generate an HTML Report (Dark Theme)

```javascript
import { generateReport } from './reports/report-generator.js';

const report = await generateReport(analysisResult, {
  format: 'html'
  // Note: HTML always includes all sections
});

console.log(report.content); // HTML content with dark theme
console.log(report.metadata); // Generation metadata
```

### Upload to Supabase Storage

```javascript
import { uploadReport, saveReportMetadata } from './reports/storage/supabase-storage.js';
import { generateStoragePath } from './reports/report-generator.js';

// For Markdown
const storagePath = generateStoragePath(analysisResult, 'markdown');
const uploadResult = await uploadReport(report.content, storagePath, 'text/markdown');

// For HTML
const storagePath = generateStoragePath(analysisResult, 'html');
const uploadResult = await uploadReport(report.content, storagePath, 'text/html');

// Save metadata to database
const reportRecord = await saveReportMetadata({
  lead_id: analysisResult.id,
  format: 'html', // or 'markdown'
  storage_path: uploadResult.path,
  company_name: analysisResult.company_name,
  website_url: analysisResult.url,
  overall_score: analysisResult.overall_score,
  website_grade: analysisResult.grade,
  status: 'completed'
});
```

### Download a Report

```javascript
import { getSignedUrl } from './reports/storage/supabase-storage.js';

// Get signed URL (valid for 1 hour)
const downloadUrl = await getSignedUrl('reports/2025/01/company-audit.md', 3600);

// User can download from this URL
window.location.href = downloadUrl;
```

## API Endpoints

### Generate Report
```http
POST /api/reports/generate
Content-Type: application/json

{
  "lead_id": "uuid",
  "format": "markdown",  // or "html" for dark-themed HTML report
  "sections": ["all"]    // Only applies to markdown format
}
```

**Examples:**

Markdown report:
```json
{
  "lead_id": "550e8400-e29b-41d4-a716-446655440000",
  "format": "markdown",
  "sections": ["all"]
}
```

HTML report (dark theme):
```json
{
  "lead_id": "550e8400-e29b-41d4-a716-446655440000",
  "format": "html"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "report-uuid",
    "storage_path": "reports/2025/01/company-audit.md",
    "metadata": {
      "company_name": "Example Co",
      "generation_time_ms": 150,
      "word_count": 4500
    }
  }
}
```

### Get Download URL
```http
GET /api/reports/:id/download
```

**Response:**
```json
{
  "success": true,
  "download_url": "https://supabase.co/storage/v1/...",
  "report": {
    "id": "report-uuid",
    "company_name": "Example Co",
    "format": "markdown"
  }
}
```

### List Reports for Lead
```http
GET /api/reports/lead/:lead_id
```

### Delete Report
```http
DELETE /api/reports/:id
```

## Report Structure

### 1. Executive Summary
- Company name, grade badge, overall score
- At-a-glance score breakdown
- Top priority issue
- Quick wins (5 items)

### 2. Desktop Experience
- Desktop visual score (GPT-4o analysis)
- Critical, medium, low priority issues
- Strengths

### 3. Mobile Experience
- Mobile visual score (GPT-4o analysis)
- Mobile-specific issues
- Responsive design assessment

### 4. SEO & Technical
- SEO score
- Technical snapshot (page title, meta, load time, HTTPS)
- On-page SEO issues

### 5. Content Quality
- Content score
- Content inventory (word count, blog, CTAs)
- Content issues and opportunities

### 6. Social Media Presence
- Social score
- Platform presence (Facebook, Instagram, etc.)
- Social media issues

### 7. Accessibility (WCAG 2.1 AA)
- Accessibility score
- WCAG compliance level
- Critical accessibility violations with WCAG references

### 8. Business Intelligence
- Company profile (years in business, team size, locations)
- Pricing visibility and budget indicators
- Decision-maker accessibility
- Website crawl statistics

### 9. Lead Priority Assessment
- Overall priority score (0-100)
- Priority tier (High/Medium/Low)
- AI reasoning
- 6 dimension breakdown (quality gap, budget, urgency, industry fit, company size, engagement)

### 10. Recommended Action Plan
- **Phase 1: Quick Wins** (Week 1, 2-4 hours, $300-500)
  - 5-8 quick fixes with immediate impact
  - Time and cost estimates per item

- **Phase 2: High-Impact Fixes** (Month 1, 15-20 hours, $1,500-2,500)
  - Critical issues requiring moderate effort

- **Phase 3: Strategic Improvements** (Month 2-3)
  - Major redesign elements
  - Long-term strategic initiatives

- **Total Investment Summary**
  - Total issues, time, cost
  - Potential score improvement

### 11. Appendix
- Analysis metadata (date, cost, time, pages crawled)
- AI models used
- Report generation info

## Database Schema

### Reports Table

```sql
CREATE TABLE reports (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  report_type text DEFAULT 'website_audit',
  format text DEFAULT 'markdown',
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'reports',
  file_size_bytes bigint,
  company_name text NOT NULL,
  website_url text NOT NULL,
  overall_score integer,
  website_grade text,
  config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'completed',
  download_count integer DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);
```

## Supabase Storage Setup

### 1. Create Bucket

Run in Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;
```

### 2. Set up Storage Policies

```sql
-- Authenticated users can read reports
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Service role can insert reports
CREATE POLICY "Service role can insert reports"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'reports');

-- Service role can delete reports
CREATE POLICY "Service role can delete reports"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'reports');
```

### 3. Run Migration

```bash
cd database-tools
npm run db:setup
```

## Customization

### Custom Sections

Generate report with specific sections only:

```javascript
const report = await generateReport(analysisResult, {
  sections: ['executive', 'desktop', 'mobile', 'action-plan']
});
```

### Available Sections

- `executive` - Executive summary
- `desktop` - Desktop analysis
- `mobile` - Mobile analysis
- `seo` - SEO & technical
- `content` - Content quality
- `social` - Social media
- `accessibility` - WCAG compliance
- `business-intel` - Business intelligence
- `lead-priority` - Lead priority assessment
- `action-plan` - Recommended action plan
- `appendix` - Technical details

### Custom Time/Cost Estimates

Modify `reports/utils/estimator.js`:

```javascript
// Change hourly rate (default: $100/hour)
const cost = estimateCost(timeInMinutes, 150); // $150/hour
```

## Testing

```bash
# Test report generation
node analysis-engine/tests/test-report-generation.js
```

## Best Practices

1. **Generate after analysis** - Reports require complete analysis data
2. **Cache reports** - Store in database to avoid regeneration
3. **Use signed URLs** - Reports bucket is private, use signed URLs for downloads
4. **Set expiration** - Signed URLs expire after 1 hour by default
5. **Track downloads** - Download count auto-increments for analytics

## Troubleshooting

### "Missing required fields" Error

Ensure analysis result has:
- `company_name`
- `url`
- `grade`
- `overall_score`

### "Supabase Storage upload failed"

1. Check bucket exists: `SELECT * FROM storage.buckets WHERE id = 'reports'`
2. Verify storage policies are set
3. Confirm `SUPABASE_SERVICE_KEY` is set in `.env`

### Empty sections in report

Some sections only appear if data is available:
- Accessibility section requires `accessibility_score`
- Business Intelligence requires `business_intelligence` object
- Lead Priority requires `lead_priority` data

## Future Enhancements

- [ ] PDF export with puppeteer
- [ ] HTML export with embedded styles
- [ ] Screenshot annotations (arrows, highlights)
- [ ] Visual score charts (radar, bar charts)
- [ ] Custom branding (logo, colors)
- [ ] Email-ready format
- [ ] Batch report generation
- [ ] Report templates by industry

## License

MIT
