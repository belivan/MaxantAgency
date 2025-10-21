# Contributing to Prospecting Engine

Thank you for contributing to the Prospecting Engine! This guide will help you understand the project structure and development workflow.

---

## Project Organization

### Directory Structure

Follow these conventions when adding new files:

```
prospecting-engine/
├── config/prompts/       # AI prompt JSON files only
├── discoverers/          # Company discovery modules
├── enrichers/            # Data enrichment modules
├── extractors/           # Website data extraction
├── validators/           # Data validation modules
├── database/
│   └── schemas/          # JSON schema definitions
├── shared/               # Shared utilities
├── docs/                 # All documentation files
│   ├── architecture/     # System design docs
│   ├── features/         # Feature completion docs
│   ├── setup/            # Setup guides
│   ├── fixes/            # Bug fix summaries
│   └── testing/          # Test reports
└── tests/                # All test files
    ├── unit/             # Unit tests
    ├── integration/      # Integration tests
    ├── phase-tests/      # Phase validation
    ├── utils/            # Utility scripts
    ├── dev/              # Development tests
    └── error-handling/   # Error tests
```

### File Naming Conventions

- **Code files**: `kebab-case.js` (e.g., `google-maps.js`)
- **Test files**: `test-{feature}.js` (e.g., `test-google-maps.js`)
- **Documentation**: `UPPERCASE-WITH-DASHES.md` (e.g., `PHASE-2-COMPLETE.md`)
- **Schemas**: `table-name.json` (e.g., `prospects.json`)
- **Prompts**: `##-descriptive-name.json` (e.g., `01-query-understanding.json`)

---

## Development Workflow

### 1. Setting Up Your Environment

```bash
# Clone and install
npm install

# Copy environment template
cp .env.template .env

# Fill in your API keys in .env
# - GOOGLE_MAPS_API_KEY
# - XAI_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY

# Set up database
npm run db:setup:dry  # Preview SQL first
npm run db:setup      # Apply schema
```

### 2. Running the Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### 3. Testing Your Changes

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only

# Run specific tests
npm run test:discovery    # Google Maps discovery
npm run test:extraction   # Website extraction
npm run test:e2e          # Full end-to-end
```

---

## Code Style Guidelines

### JavaScript/ES6

- Use ES6+ features (import/export, async/await, etc.)
- Use `const` by default, `let` when mutation is needed
- Never use `var`
- Use template literals for string interpolation
- Use arrow functions for callbacks

**Good:**
```javascript
const results = await processData(items);
const message = `Processed ${results.length} items`;
```

**Bad:**
```javascript
var results = processData(items);
var message = 'Processed ' + results.length + ' items';
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const data = await fetchData();
  return processData(data);
} catch (error) {
  logger.error('Failed to fetch data', { error: error.message });
  throw new Error(`Data fetch failed: ${error.message}`);
}
```

### Logging

Use the Winston logger from `shared/logger.js`:

```javascript
import logger from './shared/logger.js';

logger.info('Starting discovery process', { industry, city });
logger.error('Discovery failed', { error: error.message, stack: error.stack });
logger.debug('Raw API response', { response });
```

### Async/Await

Always use async/await instead of promises:

```javascript
// Good
async function processProspects(prospects) {
  const results = [];
  for (const prospect of prospects) {
    const result = await analyzeProspect(prospect);
    results.push(result);
  }
  return results;
}

// Bad
function processProspects(prospects) {
  return Promise.all(prospects.map(p => analyzeProspect(p)));
}
```

---

## Adding New Features

### 1. Creating a New Module

When adding a new discoverer, enricher, extractor, or validator:

1. Create the module file in the appropriate directory
2. Export functions using ES6 exports
3. Add JSDoc comments for all public functions
4. Create corresponding unit tests

**Example:**

```javascript
/**
 * Discovers companies using Yelp API
 * @param {Object} params - Search parameters
 * @param {string} params.industry - Industry category
 * @param {string} params.location - Search location
 * @returns {Promise<Array>} Array of company objects
 */
export async function discoverFromYelp({ industry, location }) {
  // Implementation
}
```

### 2. Adding a New AI Prompt

1. Create JSON file in `config/prompts/`
2. Follow the prompt schema format
3. Add variables to the `variables` array
4. Include JSON schema for structured output
5. Test with development scripts

**Example:** `config/prompts/08-sentiment-analysis.json`

```json
{
  "version": "1.0",
  "name": "sentiment-analysis",
  "description": "Analyzes sentiment of website content",
  "model": "grok-4-fast",
  "temperature": 0.4,
  "systemPrompt": "You are a sentiment analysis expert...",
  "userPromptTemplate": "Analyze sentiment of:\n\n{{content}}",
  "variables": ["content"],
  "schema": {
    "type": "object",
    "properties": {
      "sentiment": { "type": "string", "enum": ["positive", "negative", "neutral"] },
      "score": { "type": "number", "minimum": 0, "maximum": 100 }
    }
  }
}
```

### 3. Database Schema Changes

When modifying database schemas:

1. Update the JSON schema in `database/schemas/`
2. Run validation: `npm run db:validate`
3. Preview SQL: `npm run db:setup:dry`
4. Review generated SQL
5. Apply changes: `npm run db:setup`
6. Update corresponding code to use new fields

**Important:** Always use `Math.round()` when saving scores to INTEGER columns!

### 4. Adding Tests

Place tests in the appropriate category:

- **Unit tests** (`tests/unit/`): Test individual functions/modules
- **Integration tests** (`tests/integration/`): Test multi-step workflows
- **Phase tests** (`tests/phase-tests/`): Validate phase completions
- **Utils** (`tests/utils/`): Data quality, maintenance scripts
- **Dev tests** (`tests/dev/`): Quick debugging tests
- **Error handling** (`tests/error-handling/`): Edge cases, errors

**Test File Template:**

```javascript
import { functionToTest } from '../module-to-test.js';

console.log('🧪 Testing Feature Name...\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

await test('should do something', async () => {
  const result = await functionToTest({ param: 'value' });
  if (!result) throw new Error('Expected result');
});

console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
```

---

## Documentation Guidelines

### When to Create Documentation

- **Architecture docs**: System design decisions, technical explanations
- **Feature docs**: Completed phases, new capabilities
- **Setup guides**: Installation, configuration, integration
- **Fix summaries**: Bug resolutions, issue workarounds
- **Test reports**: Test results, validation summaries

### Documentation Structure

1. Start with a clear title
2. Add a brief summary (1-2 sentences)
3. Include table of contents for long docs
4. Use code examples where helpful
5. Link to related documentation
6. Keep it up-to-date with code changes

### Placing Documentation

- **Setup guides** → `docs/setup/`
- **Architecture docs** → `docs/architecture/`
- **Feature completion** → `docs/features/`
- **Bug fixes** → `docs/fixes/`
- **Test reports** → `docs/testing/`

Don't forget to update `docs/README.md` when adding new documentation!

---

## Git Workflow

### Commits

Write clear, descriptive commit messages:

```bash
# Good
git commit -m "feat: add Yelp API integration for discovery"
git commit -m "fix: handle timeout errors in website scraper"
git commit -m "docs: add Yelp API setup guide"
git commit -m "test: add unit tests for Yelp discoverer"

# Bad
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "wip"
```

### Commit Message Prefixes

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### Before Committing

1. Run tests: `npm test`
2. Check linting (if applicable)
3. Update documentation if needed
4. Review your changes: `git diff`

---

## Testing Checklist

Before submitting your changes:

- [ ] All existing tests pass (`npm test`)
- [ ] New features have unit tests
- [ ] Integration tests updated if needed
- [ ] Error cases are handled
- [ ] Logging is in place
- [ ] Documentation is updated
- [ ] Package.json scripts work
- [ ] Database schema is valid (`npm run db:validate`)

---

## Common Patterns

### Working with Supabase

```javascript
import { supabase } from './database/supabase-client.js';

// Insert
const { data, error } = await supabase
  .from('prospects')
  .insert({ company_name: 'Example Corp' })
  .select()
  .single();

if (error) throw error;

// Query
const { data, error } = await supabase
  .from('prospects')
  .select('*')
  .eq('industry', 'restaurants')
  .order('created_at', { ascending: false })
  .limit(10);
```

### Loading AI Prompts

```javascript
import { loadPrompt } from './shared/prompt-loader.js';

const prompt = loadPrompt('01-query-understanding', {
  industry: 'restaurants',
  city: 'Philadelphia',
  target_description: 'Italian restaurants'
});
```

### Rate Limiting

```javascript
import { rateLimiter } from './shared/rate-limiter.js';

await rateLimiter.throttle('google-maps');  // Waits if needed
const result = await callGoogleMapsAPI();
```

### Cost Tracking

```javascript
import { costTracker } from './shared/cost-tracker.js';

costTracker.trackGoogleMaps(1);  // 1 request
costTracker.trackTokens('grok-4-fast', tokens.prompt, tokens.completion);
const summary = costTracker.getSummary();
```

---

## Getting Help

- Check [README.md](README.md) for setup and usage
- Browse [docs/](docs/) for detailed documentation
- Review existing code for patterns
- Look at test files for usage examples

---

## Questions?

Contact the Maxant Agency team for support.

**Happy coding!** 🚀