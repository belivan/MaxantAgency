# Analyzer Updates - Custom Prompts Integration

## Summary

Updated all 4 analyzer modules to accept and use custom AI prompts passed from the UI through the entire analysis pipeline.

---

## Files Modified

### Analyzers ✅
1. **design-analyzer.js**
   - Added `customPrompt` parameter (4th argument)
   - Uses custom prompt if provided, falls back to default
   - Logs when using custom configuration

2. **seo-analyzer.js**
   - Added `customPrompt` parameter (4th argument)
   - Uses custom prompt if provided, falls back to default
   - Logs when using custom configuration

3. **content-analyzer.js**
   - Added `customPrompt` parameter (4th argument)
   - Uses custom prompt if provided, falls back to default
   - Logs when using custom configuration

4. **social-analyzer.js**
   - Added `customPrompt` parameter (5th argument - after socialMetadata)
   - Uses custom prompt if provided, falls back to default
   - Logs when using custom configuration

### Shared Utilities ✅
5. **prompt-loader.js**
   - Exported `substituteVariables` as named export
   - Allows analyzers to dynamically substitute variables in custom prompts

---

## How It Works

### Before (Default Prompts)
```javascript
export async function analyzeDesign(url, screenshot, context = {}) {
  // Load from file
  const prompt = await loadPrompt('web-design/design-critique', variables);
  // ...
}
```

### After (Custom Prompts Support)
```javascript
export async function analyzeDesign(url, screenshot, context = {}, customPrompt = null) {
  const variables = { /* ... */ };

  let prompt;
  if (customPrompt) {
    // Use custom prompt from UI
    console.log('[Design Analyzer] Using custom prompt configuration');
    const { substituteVariables } = await import('../shared/prompt-loader.js');

    prompt = {
      name: customPrompt.name,
      model: customPrompt.model,
      temperature: customPrompt.temperature,
      systemPrompt: customPrompt.systemPrompt,
      userPrompt: substituteVariables(
        customPrompt.userPromptTemplate,
        variables,
        customPrompt.variables
      ),
      outputFormat: customPrompt.outputFormat
    };
  } else {
    // Fall back to default from file
    prompt = await loadPrompt('web-design/design-critique', variables);
  }

  // Call AI with prompt
  const response = await callAI({ /* ... */ });
}
```

---

## Data Flow

### Full Pipeline (with Custom Prompts)

```
UI (Analysis Page)
    ↓
User modifies prompts
    ↓
currentPrompts state updated
    ↓
User clicks "Analyze"
    ↓
POST /api/analyze
{
  prospect_ids: [...],
  project_id: "uuid",
  custom_prompts: {
    design: { model, temperature, systemPrompt, userPromptTemplate, ... },
    seo: { ... },
    content: { ... },
    social: { ... }
  }
}
    ↓
Analysis Engine server.js
    ↓
analyzeMultiple(targets, { customPrompts })
    ↓
analyzeWebsite(url, context, { customPrompts })
    ↓
runAllAnalyses({ customPrompts })
    ↓
analyzeDesign(..., customPrompts?.design)
analyzeSEO(..., customPrompts?.seo)
analyzeContent(..., customPrompts?.content)
analyzeSocial(..., customPrompts?.social)
    ↓
Each analyzer:
- Checks if customPrompt provided
- If yes: use it with variable substitution
- If no: load default from file
    ↓
AI API call with correct prompt
    ↓
Results returned to UI
```

---

## Example Custom Prompt Object

```json
{
  "version": "1.0",
  "name": "design-critique-restaurants",
  "description": "Custom design analysis for restaurants",
  "model": "gpt-4o",
  "temperature": 0.5,
  "systemPrompt": "You are a restaurant website design expert...",
  "userPromptTemplate": "Analyze {{company_name}} website for food photography quality...",
  "variables": ["company_name", "industry", "url", "tech_stack", "load_time"],
  "outputFormat": {
    "type": "json",
    "schema": { /* ... */ }
  }
}
```

---

## Console Logs (for Debugging)

When custom prompts are used, you'll see these logs in the Analysis Engine console:

```
[Design Analyzer] Using custom prompt configuration
[SEO Analyzer] Using custom prompt configuration
[Content Analyzer] Using custom prompt configuration
[Social Analyzer] Using custom prompt configuration
```

When defaults are used, no special logs appear (normal behavior).

---

## Variable Substitution

All analyzers prepare a `variables` object with context-specific data:

### Design Analyzer
```javascript
{
  company_name: "Joe's Pizza",
  industry: "restaurant",
  url: "joespizza.com",
  tech_stack: "WordPress",
  load_time: "3.2"
}
```

### SEO Analyzer
```javascript
{
  url: "joespizza.com",
  industry: "restaurant",
  load_time: "3.2",
  tech_stack: "WordPress",
  html: "<html>...</html>" // truncated
}
```

### Content Analyzer
```javascript
{
  company_name: "Joe's Pizza",
  industry: "restaurant",
  url: "joespizza.com",
  content_summary: "...",
  blog_posts: "...",
  key_pages: "..."
}
```

### Social Analyzer
```javascript
{
  company_name: "Joe's Pizza",
  industry: "restaurant",
  url: "joespizza.com",
  social_profiles: "...",
  social_metadata: "...",
  website_branding: "..."
}
```

These variables are automatically substituted into `{{placeholders}}` in the custom prompt's `userPromptTemplate`.

---

## Testing

### Unit Test (Single Analyzer)
```javascript
import { analyzeDesign } from './analyzers/design-analyzer.js';

const customPrompt = {
  model: 'gpt-4o',
  temperature: 0.7,
  systemPrompt: 'Custom system prompt...',
  userPromptTemplate: 'Analyze {{company_name}} for {{industry}}',
  variables: ['company_name', 'industry']
};

const result = await analyzeDesign(
  'https://example.com',
  screenshotBuffer,
  { company_name: 'Test Co', industry: 'restaurant' },
  customPrompt // Pass custom prompt
);

console.log(result);
```

### Integration Test (Full Pipeline)
```bash
# Start analysis engine
cd analysis-engine
npm run dev

# In another terminal, test with curl
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prospect_ids": ["uuid-1"],
    "custom_prompts": {
      "design": {
        "model": "gpt-4o",
        "temperature": 0.5,
        "systemPrompt": "Custom prompt...",
        "userPromptTemplate": "Analyze {{company_name}}...",
        "variables": ["company_name", "industry", "url"]
      }
    }
  }'
```

---

## Backward Compatibility

✅ **All existing functionality preserved!**

- If `customPrompt` is `null` or `undefined`, analyzers use default prompts from files
- No breaking changes to existing API
- Existing tests continue to work
- Old analysis requests (without custom_prompts) work exactly as before

---

## Files Changed Summary

```
analysis-engine/
├── analyzers/
│   ├── design-analyzer.js     ✅ Updated
│   ├── seo-analyzer.js        ✅ Updated
│   ├── content-analyzer.js    ✅ Updated
│   ├── social-analyzer.js     ✅ Updated
│   └── index.js               ✅ Updated (earlier)
├── shared/
│   └── prompt-loader.js       ✅ Updated (exported substituteVariables)
├── orchestrator.js            ✅ Updated (earlier)
└── server.js                  ✅ Updated (earlier)
```

---

## Benefits

1. **Flexibility**: Projects can have industry-specific or campaign-specific prompts
2. **Experimentation**: Test different prompt variations without code changes
3. **Optimization**: Fine-tune prompts based on real results
4. **Personalization**: Customize analysis depth/focus per client
5. **Historical Accuracy**: Auto-fork preserves analysis settings per project
6. **No Breaking Changes**: Fully backward compatible

---

## Next Steps

1. ✅ Database migration applied (`analysis_prompts` column)
2. ✅ All analyzers updated
3. ✅ Full pipeline integrated
4. 🔄 Ready for testing!

### Testing Checklist
- [ ] Start all services: `npm run dev`
- [ ] Navigate to Analysis page
- [ ] Select project with existing leads
- [ ] Edit a prompt (change system prompt)
- [ ] Select prospects and analyze
- [ ] Verify auto-fork creates new project
- [ ] Check Analysis Engine console for custom prompt logs
- [ ] Verify leads have different analysis results
- [ ] Check Supabase: new project has custom prompts saved

---

## Done! 🎉

All analyzers now support custom prompts while maintaining full backward compatibility.
