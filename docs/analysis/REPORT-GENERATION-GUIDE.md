# Report Generation Guide

## Overview

The Analysis Engine now includes **automatic report generation** that creates comprehensive website audit reports and stores them in Supabase Storage whenever a lead is analyzed.

## How It Works

### 1. Automatic Report Generation

When the Analysis Engine saves a lead to the database, it can automatically:
- Generate a comprehensive website audit report (Markdown or HTML)
- Upload the report to Supabase Storage
- Save report metadata to the `reports` table
- Return the report URL for immediate access

### 2. Configuration

Report generation is controlled by environment variables and configuration:

```env
# .env file
AUTO_GENERATE_REPORTS=true  # Enable automatic report generation
REPORT_FORMAT=markdown       # Default format (markdown or html)
```

Or configure programmatically:
```javascript
import { updateReportConfig } from './analysis-engine/config/report-config.js';

updateReportConfig({
  autoGenerateReports: true,
  defaultFormat: 'html'
});
```

### 3. Database Schema

The system uses two main components:

#### Reports Table
Stores metadata about generated reports:
- `lead_id` - Links to the analyzed lead
- `project_id` - Links to the project (if applicable)
- `storage_path` - Path in Supabase Storage
- `format` - Report format (markdown/html/pdf/json)
- `file_size_bytes` - File size
- `status` - Generation status
- `download_count` - Track downloads

#### Supabase Storage
Reports are stored in the `reports` bucket with structure:
```
reports/
  2025/
    01/
      company-name-website-audit-2025-01-20.md
      another-company-website-audit-2025-01-20.html
```

## API Endpoints

### Generate Report Manually

```bash
POST /api/reports/generate
{
  "lead_id": "uuid",
  "format": "markdown",  # or "html"
  "sections": ["all"]    # or specific sections
}
```

### Download Report

```bash
GET /api/reports/{report_id}/download
# Returns signed URL for secure download
```

### List Reports for Lead

```bash
GET /api/reports/lead/{lead_id}
# Returns all reports for a specific lead
```

## Integration with Analysis Workflow

### Option 1: Automatic (Default when enabled)

```javascript
// When AUTO_GENERATE_REPORTS=true, reports are generated automatically
const result = await analyzeWebsite(url, company_name);
// Report is automatically generated and uploaded
```

### Option 2: Manual Control

```javascript
import { saveLead } from './database/supabase-client.js';

// Generate report
const lead = await saveLead(analysisData, {
  generateReport: true,
  reportFormat: 'html'
});

// Skip report generation
const lead = await saveLead(analysisData, {
  generateReport: false
});
```

### Option 3: Batch Generation

```javascript
import { batchGenerateReports } from './reports/auto-report-generator.js';

const results = await batchGenerateReports(analysisResults, {
  format: 'markdown',
  sections: ['all']
});
```

## Report Sections

Reports can include the following sections:
- **Executive Summary** - High-level overview and grade
- **Desktop Analysis** - Desktop experience evaluation
- **Mobile Analysis** - Mobile optimization assessment
- **SEO Section** - Search engine optimization audit
- **Content Section** - Content quality and structure
- **Social Section** - Social media presence
- **Accessibility** - WCAG compliance check
- **Business Intelligence** - Extracted business insights
- **Lead Priority** - Sales qualification scoring
- **Action Plan** - Prioritized improvement recommendations
- **Appendix** - Technical details and raw data

## Row Level Security (RLS)

⚠️ **Important**: Tables are currently unrestricted. To enable RLS:

```sql
-- Enable RLS for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create service role bypass policies
CREATE POLICY "Service role bypass" ON reports
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Testing

Run the integration test:

```bash
cd analysis-engine
node tests/test-report-integration.js
```

This will:
1. Create test leads with auto-generated reports
2. Verify reports are uploaded to storage
3. Check report metadata in database
4. Clean up test data

## Troubleshooting

### Reports Not Generating

1. Check environment variable:
   ```bash
   echo $AUTO_GENERATE_REPORTS  # Should be "true"
   ```

2. Verify Supabase Storage bucket exists:
   - Go to Supabase Dashboard > Storage
   - Check for "reports" bucket
   - If missing, the system will create it automatically

3. Check logs for errors:
   ```bash
   # Look for "Auto-generating" or "Report generation failed"
   ```

### Missing Fields Error

If you see "Missing required fields", ensure your analysis data includes:
- `company_name`
- `url`
- `website_grade` or `grade`
- `overall_score`

### Storage Upload Failed

1. Check Supabase service key has storage permissions
2. Verify bucket size limits (default: 10MB per file)
3. Check allowed MIME types in bucket settings

## Performance Considerations

- Report generation adds ~1-2 seconds to analysis time
- HTML reports are larger but include better formatting
- Markdown reports are compact and Git-friendly
- Consider disabling for high-volume batch operations

## Future Enhancements

- [ ] PDF generation support
- [ ] Custom report templates
- [ ] Email delivery integration
- [ ] Public sharing links
- [ ] Report scheduling
- [ ] Comparative reports (before/after)
- [ ] White-label branding options

## Summary

The report generation system provides:
- ✅ Automatic report creation after analysis
- ✅ Secure storage in Supabase
- ✅ Metadata tracking in database
- ✅ Multiple format support (Markdown/HTML)
- ✅ Configurable sections
- ✅ Download tracking
- ✅ API endpoints for management

Enable it with `AUTO_GENERATE_REPORTS=true` and reports will be automatically generated and stored for every analyzed website!