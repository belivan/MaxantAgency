# Screenshot Handling in Reports

## Overview

The report generation system handles screenshots differently based on the report format:

### 📄 **Markdown Reports**
- Screenshots are included as **URL references** using Markdown image syntax
- Format: `![Screenshot Description](https://url-to-screenshot.com/image.png)`
- Images are **NOT embedded** - they link to external URLs
- Smaller file size, but requires internet connection to view images
- Perfect for Git repositories and documentation

### 📑 **HTML Reports**
- Screenshots are **EMBEDDED as base64 data URLs**
- Images are converted to base64 strings and included directly in the HTML
- Format: `<img src="data:image/png;base64,iVBORw0KGg..." />`
- Completely self-contained - no external dependencies
- Larger file size but fully portable
- Perfect for emailing or offline viewing

## Screenshot Sources

The system handles screenshots from multiple sources:

1. **Supabase Storage URLs**
   - `https://xxx.supabase.co/storage/v1/object/public/screenshots/...`
   - Used as direct links in Markdown
   - Embedded as base64 in HTML (if accessible)

2. **External URLs**
   - Any `http://` or `https://` URL
   - Linked directly in both formats
   - Not embedded (to avoid CORS issues)

3. **Local File Paths**
   - File system paths like `/tmp/screenshots/desktop.png`
   - Embedded as base64 in HTML
   - Referenced as file paths in Markdown

## Database Storage

Screenshots URLs are stored in the `leads` table:
- `screenshot_desktop_url` - Desktop screenshot URL/path
- `screenshot_mobile_url` - Mobile screenshot URL/path

## Report Examples

### Markdown Report with Screenshots

```markdown
# 1. Desktop Experience Analysis
**Score: 85/100 (B)**

![Desktop Screenshot](https://storage.supabase.co/screenshots/example-desktop.png)

### Issues Found:
- Navigation menu overlaps on smaller screens
- Hero image takes 3.2s to load
...

# 2. Mobile Experience Analysis
**Score: 72/100 (C)**

![Mobile Screenshot](https://storage.supabase.co/screenshots/example-mobile.png)

### Issues Found:
- Text too small on mobile devices
- Buttons too close together
...
```

### HTML Report with Embedded Screenshots

```html
<div class="section">
  <h2>🖥️ Desktop Experience Analysis</h2>
  <p><strong>Score:</strong> 85/100 (B)</p>

  <div style="margin: 2rem 0; border: 1px solid #333; border-radius: 8px;">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
         alt="Desktop screenshot"
         style="width: 100%; display: block;" />
  </div>

  <h3>Issues Found:</h3>
  <ul>
    <li>Navigation menu overlaps on smaller screens</li>
    <li>Hero image takes 3.2s to load</li>
  </ul>
</div>
```

## Configuration

### Enable/Disable Screenshots

```javascript
// In report generation options
const report = await generateReport(analysisResult, {
  format: 'html',
  includeScreenshots: true  // or false to exclude
});
```

### Environment Variable

```env
INCLUDE_SCREENSHOTS=true  # Include screenshots in reports
```

## File Size Comparison

| Report Type | Without Screenshots | With Screenshots (2 images) |
|------------|-------------------|---------------------------|
| Markdown   | ~15-20 KB         | ~15-20 KB (URLs only)     |
| HTML       | ~25-30 KB         | ~800 KB - 2 MB (embedded) |

## Best Practices

### For Markdown Reports
- Store screenshots in a reliable CDN or storage service
- Use Supabase Storage for persistence
- Ensure URLs are publicly accessible
- Consider URL expiration for private content

### For HTML Reports
- Be mindful of file size with embedded images
- Compress screenshots before embedding
- Consider thumbnail versions for email delivery
- Full HTML reports are ideal for archival

## API Integration

When analyzing a website, screenshots are automatically captured and stored:

```javascript
// Analysis result includes screenshot URLs
{
  company_name: "Example Company",
  url: "https://example.com",
  screenshot_desktop_url: "https://storage.supabase.co/...",
  screenshot_mobile_url: "https://storage.supabase.co/...",
  // ... other analysis data
}

// These URLs are automatically included in generated reports
```

## Troubleshooting

### Screenshots Not Showing in Markdown

1. Check if URLs are accessible:
   ```bash
   curl -I https://your-screenshot-url.com/image.png
   ```

2. Verify URLs are properly formatted in the database

3. Check for CORS restrictions if viewing locally

### Screenshots Not Embedding in HTML

1. Check file exists (for local files):
   ```javascript
   fs.existsSync(screenshotPath)
   ```

2. Verify file permissions for reading

3. Check console for base64 encoding errors

### Large HTML File Size

- Consider resizing screenshots before embedding
- Use JPEG format for photos (smaller than PNG)
- Implement lazy loading for web viewing

## Summary

- **Markdown**: Links to external images (lightweight, requires internet)
- **HTML**: Embeds images as base64 (self-contained, larger files)
- Both formats fully support screenshots from the analysis
- Screenshots are automatically included when available
- Configuration options allow fine control over inclusion