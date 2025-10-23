# UI Screenshot Tool 📸

Automatically capture beautiful screenshots of all Command Center UI pages and tabs for showcasing, documentation, or visual regression testing.

## Features

✨ **Comprehensive Coverage**
- All main pages (Dashboard, Prospecting, Analysis, Leads, Outreach, Projects, Analytics)
- All tabbed views (Outreach tabs, compose modes, etc.)
- Mobile responsive views
- Full-page scrollable captures

🎨 **Beautiful Gallery**
- Auto-generates an HTML gallery page
- Click to zoom functionality
- Dark theme matching the UI
- Statistics overview

📱 **Multiple Viewports**
- Desktop (1920x1080)
- Mobile (iPhone X - 375x812)
- Full-page captures where applicable

## Installation

First, install Playwright (if not already installed):

```bash
npm install -D playwright
```

Or install Playwright globally:

```bash
npm install -g playwright
npx playwright install
```

## Usage

### Step 1: Start the Command Center UI

Make sure your Command Center UI is running on `http://localhost:3000`:

```bash
cd command-center-ui
npm run dev
```

### Step 2: Run the Screenshot Script

From the root directory:

```bash
npm run screenshot
```

Or directly:

```bash
node scripts/screenshot-ui.js
```

### Step 3: View the Gallery

The script will tell you where the screenshots are saved. Open the `index.html` file:

```
📁 Location: screenshots/ui-showcase/
🌐 View gallery: file://[path]/screenshots/ui-showcase/index.html
```

## Output

The script creates:

```
screenshots/ui-showcase/
├── index.html                    # Beautiful gallery page
├── Dashboard.png                 # Main dashboard
├── Dashboard-Full.png           # Full scrollable dashboard
├── Prospecting.png              # Prospecting page
├── Analysis.png                 # Analysis page
├── Leads.png                    # Leads page
├── Outreach.png                 # Outreach hub
├── Outreach-Compose-Email.png   # Email composition
├── Outreach-Compose-Social.png  # Social DM composition
├── Outreach-MyEmails.png        # Emails tab
├── Outreach-SocialMessages.png  # Social messages tab
├── Outreach-Sent.png            # Sent items tab
├── Projects.png                 # Projects page
├── Analytics.png                # Analytics page
├── Dashboard-Mobile.png         # Mobile views...
├── Prospecting-Mobile.png
├── Analysis-Mobile.png
└── Leads-Mobile.png
```

## Configuration

Edit `scripts/screenshot-ui.js` to customize:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3000',  // Change if using different port
  outputDir: './screenshots/ui-showcase',
  viewport: {
    width: 1920,
    height: 1080
  },
  pageLoadWait: 2000,  // Wait time for pages to load
  headless: true,      // Set to false to watch the browser
  slowMo: 100         // Slow down for stability
};
```

## Troubleshooting

### "Cannot connect to http://localhost:3000"

Make sure the Command Center UI is running:
```bash
cd command-center-ui
npm run dev
```

### Screenshots are blank or incomplete

Increase the `pageLoadWait` value in the config:
```javascript
pageLoadWait: 5000  // 5 seconds
```

### Want to see what's happening?

Run in non-headless mode:
```javascript
headless: false
```

### Missing Playwright browsers

Install them:
```bash
npx playwright install
```

## Use Cases

### 📚 Documentation
Perfect for README files, documentation sites, or presentations

### 🎨 Design Reviews
Share with stakeholders or get feedback on UI changes

### 🧪 Visual Regression Testing
Create baseline screenshots and compare after UI changes

### 🚀 Showcasing
Show off your work on portfolio, GitHub, or social media

### 📊 Progress Tracking
Take regular screenshots to see how your UI evolves

## Tips

1. **Best Results**: Take screenshots when you have some sample data loaded
2. **Consistency**: Run from the same starting state for comparable shots
3. **Custom Pages**: Add more pages by editing the `PAGES` or `TABBED_PAGES` arrays
4. **Mobile Testing**: Adjust viewport sizes for different devices
5. **Automation**: Run this in CI/CD for automated visual testing

## Advanced Usage

### Add a specific page

Edit the `PAGES` array:

```javascript
{
  name: 'MyCustomPage',
  path: '/custom',
  description: 'My custom page description',
  waitForSelector: '.main-content'
}
```

### Add a page with tabs

Edit the `TABBED_PAGES` array:

```javascript
{
  name: 'MyPage-Tab1',
  path: '/mypage',
  description: 'First tab of my page',
  clickSequence: [
    { selector: '[data-tab="tab1"]', wait: 500 }
  ]
}
```

### Capture specific viewport size

```javascript
await page.setViewportSize({
  width: 1440,
  height: 900
});
```

## Integration Ideas

### CI/CD Pipeline
```yaml
# .github/workflows/screenshots.yml
- name: Take screenshots
  run: |
    npm run dev:ui &
    sleep 10
    npm run screenshot
```

### Git pre-commit hook
```bash
# Take screenshots before committing UI changes
npm run screenshot
git add screenshots/
```

### Automated comparison
Use tools like `pixelmatch` or `looks-same` to compare with baseline screenshots

## License

MIT - Feel free to use and modify!
