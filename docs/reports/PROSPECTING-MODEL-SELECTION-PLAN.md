# Prospecting Engine Model Selection - Implementation Plan

**Date:** 2025-10-20
**Status:** Planning Phase

## Executive Summary

This document outlines a phased plan to implement model selection UI for the Prospecting Engine, similar to the Analysis Engine's implementation. The goal is to allow users to customize which AI models are used for each prospecting step (query understanding, website extraction, relevance check).

---

## Current State Analysis

### ✅ What We Have

**Backend (Prospecting Engine):**
- ✅ JSON-based prompt configuration in `config/prompts/`
- ✅ `prompt-loader.js` with `loadPrompt()`, `loadRawPrompt()`, `loadAllProspectingPrompts()`
- ✅ Prompts saved to `projects.prospecting_prompts` (JSONB)
- ✅ Validators use `prompt.model` (query-understanding, relevance-checker)
- ✅ Extractors use `prompt.model` (grok-extractor - recently fixed)

**Current Models Used:**
| Module | Current Model | Purpose |
|--------|--------------|---------|
| Query Understanding | `grok-4-fast` | ICP → Google Maps query |
| Website Extraction | `grok-4` | Screenshot → business data |
| Relevance Check | `grok-4-fast` | Prospect scoring (0-100) |

**Prompts Structure:**
```json
{
  "queryUnderstanding": {
    "version": "1.0",
    "name": "query-understanding",
    "model": "grok-4-fast",
    "temperature": 0.2,
    "systemPrompt": "...",
    "userPromptTemplate": "...",
    "variables": ["industry", "city", "target_description"]
  },
  "websiteExtraction": { /* same structure */ },
  "relevanceCheck": { /* same structure */ }
}
```

### ❌ What We Don't Have

**UI (Command Center):**
- ❌ No model selection UI in `/prospecting` page
- ❌ No prompt editor for prospecting prompts
- ❌ No way to pass custom model selections from UI → backend
- ❌ No API endpoint to fetch default prospecting prompts

**Backend (Prospecting Engine):**
- ❌ No `customPrompts` parameter support in orchestrator
- ❌ No variable substitution function exported from `prompt-loader.js`
- ❌ No `/api/prompts/default` endpoint

---

## How Analysis Engine Does It

### 1. UI Layer (Command Center)

**Components:**
- [`ModelSelector`](command-center-ui/components/analysis/model-selector.tsx) - Collapsible model selection UI
- [`PromptEditor`](command-center-ui/components/analysis/prompt-editor.tsx) - JSON editor for prompts
- [`AnalysisConfig`](command-center-ui/components/analysis/analysis-config.tsx) - Main config form

**Available Models:**
```typescript
const AI_MODELS = [
  // Anthropic Claude
  { value: 'claude-sonnet-4.5', provider: 'Anthropic', cost: '$$', speed: 'Fast' },
  { value: 'claude-opus-4.1', provider: 'Anthropic', cost: '$$$', speed: 'Slow' },
  { value: 'claude-haiku-4.5', provider: 'Anthropic', cost: '$', speed: 'Very Fast' },

  // xAI Grok
  { value: 'grok-4', provider: 'xAI', cost: '$$', speed: 'Fast' },
  { value: 'grok-4-fast', provider: 'xAI', cost: '$', speed: 'Very Fast' },
  { value: 'grok-3', provider: 'xAI', cost: '$$', speed: 'Fast' },

  // OpenAI GPT
  { value: 'gpt-5', provider: 'OpenAI', cost: '$$$', speed: 'Medium' },
  { value: 'gpt-4.1', provider: 'OpenAI', cost: '$$', speed: 'Fast' },
  { value: 'gpt-4.1-mini', provider: 'OpenAI', cost: '$', speed: 'Very Fast' },
  { value: 'gpt-4o', provider: 'OpenAI', cost: '$$', speed: 'Fast' }
];
```

**Modules:**
```typescript
const MODULES = [
  { value: 'design', label: 'Design Analysis', defaultModel: 'gpt-4o' },
  { value: 'seo', label: 'SEO Analysis', defaultModel: 'grok-4-fast' },
  { value: 'content', label: 'Content Analysis', defaultModel: 'grok-4-fast' },
  { value: 'social', label: 'Social Media', defaultModel: 'grok-4-fast' }
];
```

**Data Flow:**
```typescript
// 1. User selects models in UI
const [modelSelections, setModelSelections] = useState({
  design: 'gpt-4o',
  seo: 'grok-4-fast',
  content: 'grok-4-fast',
  social: 'grok-4-fast'
});

// 2. UI loads default prompts
const response = await fetch('/api/analysis/prompts');
const prompts = result.data; // { design: {...}, seo: {...}, ... }

// 3. UI sends to backend
await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({
    prospect_ids: [...],
    custom_prompts: currentPrompts, // Full prompt objects with models
    model_selections: modelSelections // Optional additional param
  })
});
```

### 2. Backend Layer (Analysis Engine)

**API Endpoint:**
```javascript
// server.js:53
app.get('/api/prompts/default', async (req, res) => {
  const prompts = await collectAnalysisPrompts();
  res.json({ success: true, data: prompts });
});
```

**Request Handler:**
```javascript
// server.js:155
app.post('/api/analyze', async (req, res) => {
  const { prospect_ids, custom_prompts } = req.body;

  await analyzeMultiple(targets, {
    concurrency: 2,
    customPrompts: custom_prompts, // Pass through
    onProgress: (event) => sendSSE(event)
  });
});
```

**Orchestrator:**
```javascript
// orchestrator.js:359
export async function analyzeMultiple(targets, options = {}) {
  const { customPrompts } = options;

  analyzeWebsite(url, context, {
    customPrompts // Pass through
  });
}
```

**Analyzers:**
```javascript
// analyzers/index.js:58
runAllAnalyses({
  customPrompts,
  ...
});

// Pass to individual analyzers
analyzeDesign(url, screenshot, context, customPrompts?.design);
analyzeSEO(url, html, context, customPrompts?.seo);
```

**Individual Analyzer:**
```javascript
// analyzers/design-analyzer.js:23
export async function analyzeDesign(url, screenshot, context, customPrompt = null) {
  let prompt;
  if (customPrompt) {
    // Use custom prompt with variable substitution
    const { substituteVariables } = await import('../shared/prompt-loader.js');
    prompt = {
      model: customPrompt.model,
      temperature: customPrompt.temperature,
      systemPrompt: customPrompt.systemPrompt,
      userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables)
    };
  } else {
    // Load default from file
    prompt = await loadPrompt('web-design/design-critique', variables);
  }

  await callAI({
    model: prompt.model, // Dynamic model selection!
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt
  });
}
```

---

## Implementation Plan

### Phase 1: Backend Foundation (Prospecting Engine)

**Goal:** Add support for custom prompts in the orchestrator

**Tasks:**

1. **Add Variable Substitution to prompt-loader.js**
   - Export `substituteVariables(template, variables, expectedVars)` function
   - Used by validators when custom prompts are provided

2. **Add `/api/prompts/default` Endpoint**
   ```javascript
   // server.js
   app.get('/api/prompts/default', async (req, res) => {
     const prompts = loadAllProspectingPrompts();
     res.json({ success: true, data: prompts });
   });
   ```

3. **Update POST /api/prospect to Accept custom_prompts**
   ```javascript
   // server.js:54
   app.post('/api/prospect', async (req, res) => {
     const { brief, options = {}, custom_prompts } = req.body;

     const results = await runProspectingPipeline(brief, {
       ...options,
       customPrompts: custom_prompts
     }, onProgress);
   });
   ```

4. **Update Orchestrator to Support customPrompts**
   ```javascript
   // orchestrator.js
   export async function runProspectingPipeline(brief, options = {}, onProgress) {
     const { customPrompts } = options;

     // Step 1: Query Understanding
     const query = await understandQuery(brief, {
       customPrompt: customPrompts?.queryUnderstanding
     });

     // Step 4: Website Extraction
     const extracted = await extractWebsiteData(url, screenshot, companyName, {
       customPrompt: customPrompts?.websiteExtraction
     });

     // Step 7: Relevance Check
     const relevance = await checkRelevance(prospect, brief, {
       customPrompt: customPrompts?.relevanceCheck
     });
   }
   ```

5. **Update Validators to Accept Custom Prompts**
   ```javascript
   // validators/query-understanding.js
   export async function understandQuery(brief, options = {}) {
     const { customPrompt, modelOverride } = options;

     let prompt;
     if (customPrompt) {
       const { substituteVariables } = await import('../shared/prompt-loader.js');
       prompt = {
         model: customPrompt.model,
         temperature: customPrompt.temperature,
         systemPrompt: customPrompt.systemPrompt,
         userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables)
       };
     } else {
       prompt = loadPrompt('01-query-understanding', variables);
     }

     const model = modelOverride || prompt.model;
     await callAI({ model, ... });
   }
   ```

6. **Update Extractors to Accept Custom Prompts**
   ```javascript
   // extractors/grok-extractor.js
   export async function extractWebsiteData(url, screenshot, companyName, options = {}) {
     const { customPrompt } = options;

     let prompt;
     if (customPrompt) {
       // Same pattern as validators
     } else {
       prompt = loadPrompt('04-website-extraction', { company_name: companyName });
     }

     await callAI({ model: prompt.model, ... });
   }
   ```

**Testing:**
- Unit tests for `substituteVariables()`
- Integration test: Send custom prompts via API → verify they're used
- Test with different models (gpt-4o, claude-sonnet-4.5, etc.)

**Deliverable:** Backend accepts and uses custom prompts ✅

---

### Phase 2: UI Components (Command Center)

**Goal:** Create model selection UI for prospecting

**Tasks:**

1. **Create ProspectingModelSelector Component**
   ```tsx
   // components/prospecting/model-selector.tsx

   const PROSPECTING_MODELS = [
     // Same as Analysis Engine
     { value: 'claude-sonnet-4.5', provider: 'Anthropic', ... },
     { value: 'grok-4', provider: 'xAI', ... },
     { value: 'grok-4-fast', provider: 'xAI', ... },
     { value: 'gpt-4o', provider: 'OpenAI', ... },
     // etc.
   ];

   const PROSPECTING_MODULES = [
     { value: 'queryUnderstanding', label: 'Query Understanding', defaultModel: 'grok-4-fast' },
     { value: 'websiteExtraction', label: 'Website Extraction', defaultModel: 'grok-4' },
     { value: 'relevanceCheck', label: 'Relevance Check', defaultModel: 'grok-4-fast' }
   ];

   export function ProspectingModelSelector({ ... }) {
     // Same pattern as AnalysisModelSelector
   }
   ```

2. **Create ProspectingPromptEditor Component**
   ```tsx
   // components/prospecting/prompt-editor.tsx

   export interface ProspectingPrompts {
     queryUnderstanding: PromptConfig;
     websiteExtraction: PromptConfig;
     relevanceCheck: PromptConfig;
   }

   export function ProspectingPromptEditor({ ... }) {
     // Same pattern as AnalysisPromptEditor
   }
   ```

3. **Update Prospecting Page**
   ```tsx
   // app/prospecting/page.tsx

   const [defaultPrompts, setDefaultPrompts] = useState(null);
   const [currentPrompts, setCurrentPrompts] = useState(null);
   const [modelSelections, setModelSelections] = useState({
     queryUnderstanding: 'grok-4-fast',
     websiteExtraction: 'grok-4',
     relevanceCheck: 'grok-4-fast'
   });

   // Load default prompts on mount
   useEffect(() => {
     fetch('http://localhost:3010/api/prompts/default')
       .then(res => res.json())
       .then(data => {
         setDefaultPrompts(data.data);
         setCurrentPrompts(data.data);
       });
   }, []);

   // Send custom prompts to backend
   const handleGenerate = async (config) => {
     await fetch('/api/prospect', {
       method: 'POST',
       body: JSON.stringify({
         brief: icpBrief,
         options: { ...config, projectId: selectedProjectId },
         custom_prompts: currentPrompts
       })
     });
   };
   ```

4. **Add API Route for Prospecting Prompts**
   ```tsx
   // app/api/prospecting/prompts/route.ts

   export async function GET() {
     const response = await fetch('http://localhost:3010/api/prompts/default');
     const data = await response.json();
     return Response.json(data);
   }
   ```

**Testing:**
- UI renders model selector correctly
- Model changes update state
- Prompts are sent to backend correctly

**Deliverable:** UI can select models and edit prompts ✅

---

### Phase 3: Prompt Auto-Fork (Like Analysis Engine)

**Goal:** Auto-fork project when prompts are modified and prospects exist

**Tasks:**

1. **Check for Prompt Modifications**
   ```tsx
   const hasModifiedPrompts = () => {
     const keys = ['queryUnderstanding', 'websiteExtraction', 'relevanceCheck'];
     return keys.some(key => {
       const current = currentPrompts[key];
       const def = defaultPrompts[key];
       return current?.model !== def?.model ||
              current?.temperature !== def?.temperature;
     });
   };
   ```

2. **Auto-Fork Logic Before Generation**
   ```tsx
   const handleGenerate = async (config) => {
     let effectiveProjectId = selectedProjectId;

     // Auto-fork if prompts modified AND prospects exist
     if (selectedProjectId && hasModifiedPrompts() && prospectCount > 0) {
       const originalProject = await getProject(selectedProjectId);
       const newProject = await createProject({
         name: `${originalProject.name} (v2)`,
         description: 'Forked with custom prospecting prompts',
         icp_brief: originalProject.icp_brief,
         prospecting_prompts: currentPrompts
       });
       effectiveProjectId = newProject.id;
     }

     // Generate with effective project
     await runProspecting(effectiveProjectId, currentPrompts);
   };
   ```

3. **Save Prompts to Project**
   ```tsx
   if (effectiveProjectId) {
     await updateProject(effectiveProjectId, {
       prospecting_prompts: currentPrompts
     });
   }
   ```

**Testing:**
- Prompt modification detected correctly
- Auto-fork creates new project
- Prompts saved to project

**Deliverable:** Prompt auto-fork works like Analysis Engine ✅

---

### Phase 4: Polish & Documentation

**Goal:** Complete the feature with docs and tests

**Tasks:**

1. **Update Documentation**
   - Update [README.md](prospecting-engine/README.md) with model selection info
   - Document API changes
   - Add examples of custom prompts

2. **Add Cost Calculator**
   ```tsx
   // lib/utils/cost-calculator.ts

   export function calculateProspectingCost(count: number, modelSelections: any) {
     // Query understanding: ~100 tokens
     // Website extraction: ~1000 tokens (vision)
     // Relevance check: ~500 tokens

     const costs = {
       'grok-4-fast': { input: 0.20, output: 0.50 },
       'grok-4': { input: 3, output: 15 },
       'gpt-4o': { input: 5, output: 15 },
       // etc.
     };

     // Calculate based on model selections
   }
   ```

3. **Add Model Info Tooltips**
   - Show pricing per model
   - Show speed comparison
   - Show recommended use cases

4. **Write Tests**
   ```javascript
   // prospecting-engine/tests/test-custom-prompts.js

   - Test custom prompts passed to orchestrator
   - Test variable substitution
   - Test model override works
   - Test API endpoint returns default prompts
   ```

5. **Create Migration Guide**
   - Document for users with existing projects
   - How to migrate to new prompt system

**Deliverable:** Feature complete with docs ✅

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Backend Foundation | 4-6 hours |
| Phase 2 | UI Components | 6-8 hours |
| Phase 3 | Prompt Auto-Fork | 2-3 hours |
| Phase 4 | Polish & Docs | 3-4 hours |
| **Total** | | **15-21 hours** |

---

## Success Criteria

- [ ] Users can select different AI models for each prospecting step
- [ ] Model changes are saved to `projects.prospecting_prompts`
- [ ] Custom prompts are auto-forked when modified
- [ ] UI matches Analysis Engine's quality
- [ ] All tests passing
- [ ] Documentation complete

---

## Future Enhancements

1. **Cost Tracking Per Model**
   - Show actual costs for each model used
   - Compare costs across different model combinations

2. **A/B Testing**
   - Run same ICP with different models
   - Compare quality of results

3. **Model Recommendations**
   - Suggest optimal model based on ICP complexity
   - Auto-select based on budget constraints

4. **Prompt Templates**
   - Save favorite prompt configurations
   - Share prompts across projects

---

## Related Files

- Analysis Engine Model Selector: [components/analysis/model-selector.tsx](command-center-ui/components/analysis/model-selector.tsx)
- Analysis Engine Prompt Editor: [components/analysis/prompt-editor.tsx](command-center-ui/components/analysis/prompt-editor.tsx)
- Analysis Engine Page: [app/analysis/page.tsx](command-center-ui/app/analysis/page.tsx)
- Prospecting Engine Orchestrator: [orchestrator.js](prospecting-engine/orchestrator.js)
- Prospecting Engine Prompt Loader: [shared/prompt-loader.js](prospecting-engine/shared/prompt-loader.js)

---

## Questions for User

1. **Priority:** Should we implement this now, or wait?
2. **Models:** Which models should be available in the dropdown? (Currently listed 10)
3. **Defaults:** Are current defaults good (grok-4-fast for most, grok-4 for vision)?
4. **UI Placement:** Should model selector be in ProspectConfigForm or separate component?
5. **Auto-Fork:** Should we implement auto-fork or just save prompts?
