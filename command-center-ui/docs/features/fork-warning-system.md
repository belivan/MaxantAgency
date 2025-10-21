# Fork Warning System Documentation

## Overview

The MaxantAgency Command Center UI implements an **automatic project forking system** to preserve data integrity when modifying analysis/prospecting configuration on projects that already contain generated data (prospects or leads).

**Core Principle:** Once a project has generated data (prospects/leads), any configuration changes should create a new forked project rather than modifying the existing data's analysis parameters.

---

## System Architecture

### State Management Pattern

Both prospecting and analysis tabs follow the same pattern for detecting modifications:

```typescript
// 1. Track THREE states for each configuration type
const [defaultConfig, setDefaultConfig] = useState(null);   // System defaults
const [currentConfig, setCurrentConfig] = useState(null);   // User's current edits
const [savedConfig, setSavedConfig] = useState(undefined);  // Project-saved config

// 2. Load saved configuration on project selection
useEffect(() => {
  if (project.saved_config) {
    setSavedConfig(project.saved_config);
    setCurrentConfig(project.saved_config);  // Initialize current from saved
  } else {
    setSavedConfig(undefined);
    setCurrentConfig(defaultConfig);  // Initialize from defaults
  }
}, [selectedProjectId]);

// 3. Compare current vs saved (NOT current vs default)
const hasModifiedConfig = () => {
  const comparisonBase = savedConfig || defaultConfig;
  return JSON.stringify(currentConfig) !== JSON.stringify(comparisonBase);
};

// 4. Show warnings only when data exists AND modifications detected
const shouldShowWarning = dataCount > 0 && hasModifiedConfig();
```

---

## Prospecting Tab Implementation

### Tracked Configuration

1. **ICP Brief** (`icp_brief`)
   - JSON object defining ideal customer profile
   - Saved in `projects.icp_brief`
   - Comparison: Deep JSON equality

2. **Model Selections** (`prospecting_model_selections`)
   - Which AI model to use for each module
   - Saved in `projects.prospecting_model_selections`
   - Comparison: Object key/value equality

3. **Custom Prompts** (`prospecting_prompts`)
   - System prompts and templates for AI modules
   - Saved in `projects.prospecting_prompts`
   - Comparison: Field-by-field (model, temperature, systemPrompt, userPromptTemplate)

### Warning Display

**Location:** [prospecting/page.tsx:253-256](app/prospecting/page.tsx#L253-L256)

```typescript
const shouldShowPromptsForkWarning = prospectCount > 0 && (modifiedPrompts || modifiedModels);
const shouldShowICPForkWarning = prospectCount > 0 && modifiedIcp;
```

**UI Components:**
- `ForkWarningBadge` (block mode): Full orange alert above ICP editor
- `ForkWarningBadge` (inline mode): Compact warning in model selector and prompt editor

**Visual Example:**
```
┌──────────────────────────────────────────────────────┐
│ ⚠️  Changing ICP brief will create new project (v2)  │
│     This project has 15 prospects. Modifying the ICP │
│     will fork to preserve existing data integrity.   │
└──────────────────────────────────────────────────────┘
```

### Fork Trigger

**Location:** [prospecting/page.tsx:296-335](app/prospecting/page.tsx#L296-L335)

```typescript
// During handleGenerate()
if (selectedProjectId && hasAnyModifications() && prospectCount > 0) {
  // 1. Fetch original project data
  const originalProject = await getProject(selectedProjectId);

  // 2. Create new forked project
  const newProject = await createProject({
    name: `${originalProject.name} (v2)`,
    description: `Forked from ${originalProject.name} - Modified: ${modificationText}`,
    icp_brief: currentIcpBrief,
    prospecting_prompts: currentPrompts,
    prospecting_model_selections: currentModelSelections
  });

  // 3. Switch to forked project
  setSelectedProjectId(newProject.id);

  // 4. Generate prospects on new project
  effectiveProjectId = newProject.id;
}
```

**Modification Text Examples:**
- "Modified: ICP Brief"
- "Modified: Model Selections"
- "Modified: ICP Brief, Model Selections, Prompts"

---

## Analysis Tab Implementation

### Tracked Configuration

1. **Analysis Prompts** (`analysis_prompts`)
   - Custom prompts for 5 analysis modules (design, SEO, content, social, accessibility)
   - Saved in `projects.analysis_prompts`
   - Comparison: Field-by-field across all modules

2. **Model Selections** (handled per-module within prompts)

### Warning Display

**Location:** [analysis/page.tsx:335](app/analysis/page.tsx#L335)

```typescript
promptsLocked={leadsCount > 0 && !hasModifiedPrompts()}
```

**UI Pattern: Lock Mechanism**
- **Locked State** (leads exist, no modifications):
  - 🔒 Lock icon displayed
  - Prompt editors disabled
  - Alert: "Prompts Locked - This project has X leads. Cannot be modified to maintain historical accuracy."

- **Unlocked State** (user makes modifications):
  - 🔓 No lock icon
  - Prompt editors enabled
  - Alert: "Modifying prompts will create new project on analysis"

**Visual Example:**
```
┌──────────────────────────────────────────────────┐
│ 🔒 Prompts Locked                                 │
│                                                   │
│ This project has 12 leads. The analysis prompts  │
│ cannot be modified to maintain historical        │
│ accuracy.                                         │
│                                                   │
│ Tip: Modify prompts and run analysis to auto-    │
│      create a new project.                       │
└──────────────────────────────────────────────────┘
```

### Fork Trigger

**Location:** [analysis/page.tsx:189-219](app/analysis/page.tsx#L189-L219)

```typescript
// During handleAnalyze()
if (selectedProjectId && hasModifiedPrompts() && leadsCount > 0) {
  // 1. Fetch original project
  const originalProject = await getProject(selectedProjectId);

  // 2. Create forked project
  const newProject = await createProject({
    name: `${originalProject.name} (v2)`,
    client_name: originalProject.client_name,
    description: `Forked from ${originalProject.name} with custom analysis prompts`,
    status: 'active',
    budget: originalProject.budget,
    icp_brief: originalProject.icp_brief,
    analysis_prompts: currentPrompts
  });

  // 3. Switch and analyze
  effectiveProjectId = newProject.id;
  setSelectedProjectId(newProject.id);
}
```

---

## Debugging and Monitoring

### Console Logging

Both tabs implement detailed console logging for debugging fork detection logic:

**Prospecting Tab:**
```javascript
console.log('[Fork Detection]', {
  prospectCount,
  modifiedPrompts,
  modifiedModels,
  modifiedIcp,
  savedIcpBrief: !!savedIcpBrief,
  savedModelSelections: savedModelSelections,
  currentModelSelections: currentModelSelections,
  savedPrompts: !!savedPrompts,
  currentPrompts: !!currentPrompts,
  shouldShowICPForkWarning: prospectCount > 0 && modifiedIcp,
  shouldShowPromptsForkWarning: prospectCount > 0 && (modifiedPrompts || modifiedModels)
});
```

**Analysis Tab:**
```javascript
console.log('[Fork Detection - Analysis]', {
  leadsCount,
  modifiedPrompts,
  savedPrompts: !!savedPrompts,
  currentPrompts: !!currentPrompts,
  defaultPrompts: !!defaultPrompts,
  shouldShowWarning: leadsCount > 0 && modifiedPrompts,
  promptsLocked: leadsCount > 0 && !modifiedPrompts
});
```

### Auto-Fork Logging

```javascript
console.log(`[Auto-Fork] ${modificationText} modified + prospects exist → Creating new project`);
console.log('[Auto-Fork] Created new project:', newProject.id);
```

---

## Project Naming Convention

### Version Suffix Pattern

Forked projects automatically receive a `(v2)` suffix:

```
Original: "ACME Corp Website Redesign"
Forked:   "ACME Corp Website Redesign (v2)"
```

**Note:** Currently does not increment to v3, v4, etc. All forks from the same parent receive `(v2)`.

### Description Format

**Prospecting:**
```
"Forked from [Original Name] - Modified: ICP Brief, Model Selections"
```

**Analysis:**
```
"Forked from [Original Name] with custom analysis prompts"
```

---

## Data Flow Diagrams

### Prospecting Tab Flow

```
User loads project
        ↓
Load saved config from DB
        ↓
Initialize current = saved
        ↓
User edits ICP/prompts/models
        ↓
current ≠ saved → modifiedX = true
        ↓
prospectCount > 0 → show warnings
        ↓
User clicks "Generate"
        ↓
hasAnyModifications() && prospectCount > 0?
        ├─ Yes → Create fork (v2)
        │         ↓
        │         Generate on forked project
        │
        └─ No → Generate on original project
```

### Analysis Tab Flow

```
User loads project
        ↓
Load saved prompts from DB
        ↓
Initialize current = saved
        ↓
leadsCount > 0 && !modified?
        ├─ Yes → Lock prompts (read-only)
        └─ No → Allow editing
                ↓
User edits prompts
                ↓
current ≠ saved → modifiedPrompts = true
                ↓
Prompts unlock, warning shown
                ↓
User clicks "Analyze"
                ↓
hasModifiedPrompts() && leadsCount > 0?
        ├─ Yes → Create fork (v2)
        │         ↓
        │         Analyze on forked project
        │
        └─ No → Analyze on original project
```

---

## Comparison Logic

### Deep Object Comparison (ICP Brief)

```typescript
const hasModifiedIcpBrief = () => {
  if (!icpValid) return false;
  const currentBriefResult = parseJSON(icpBrief);
  if (!currentBriefResult.success) return false;

  // No saved = not modified (just new)
  if (!savedIcpBrief) return false;

  // Deep JSON comparison
  return JSON.stringify(savedIcpBrief) !== JSON.stringify(currentBriefResult.data);
};
```

### Object Key/Value Comparison (Model Selections)

```typescript
const hasModifiedModels = () => {
  if (!currentModelSelections) return false;

  // First time setup
  if (!savedModelSelections) {
    return Object.keys(currentModelSelections).length > 0;
  }

  // Compare keys and values
  const savedKeys = Object.keys(savedModelSelections);
  const currentKeys = Object.keys(currentModelSelections);

  if (savedKeys.length !== currentKeys.length) return true;

  return savedKeys.some(key =>
    savedModelSelections[key] !== currentModelSelections[key]
  );
};
```

### Field-by-Field Comparison (Prompts)

```typescript
const hasModifiedPrompts = () => {
  if (!currentPrompts) return false;

  // Compare against saved, or defaults if none saved
  const comparisonBase = savedPrompts || defaultPrompts;
  if (!comparisonBase) return false;

  const keys = ['design', 'seo', 'content', 'social', 'accessibility'];

  return keys.some((key) => {
    const current = currentPrompts[key];
    const base = comparisonBase[key];

    if (!current || !base) return false;

    // Check all fields
    return (
      current.model !== base.model ||
      current.temperature !== base.temperature ||
      current.systemPrompt !== base.systemPrompt ||
      current.userPromptTemplate !== base.userPromptTemplate
    );
  });
};
```

---

## Edge Cases and Special Behaviors

### 1. First-Time Configuration (No Saved Data)

**Behavior:** Does NOT trigger fork warnings

**Reasoning:** No existing configuration to "modify" - this is initial setup

**Example:**
```
Project has 0 prospects
User enters ICP brief for first time
→ No warning shown (savedIcpBrief = undefined)
→ Saves to original project
```

### 2. Revert to Original

**Behavior:** Warning disappears when user reverts changes

**Example:**
```
Load project: ICP = {"industry": "restaurant"}
Edit to: {"industry": "retail"}
→ Warning appears

Revert to: {"industry": "restaurant"}
→ Warning disappears (current === saved)
```

### 3. Loading Project During Generation

**Behavior:** Warnings hidden until generation completes

**Implementation:** `isLoadingProject` state prevents premature warning display

### 4. Multiple Simultaneous Modifications

**Behavior:** All modifications tracked, combined in fork description

**Example:**
```
Modify: ICP Brief + Model Selections + Prompts
Fork description: "Modified: ICP Brief, Model Selections, Prompts"
```

### 5. Fork Creation Failure

**Behavior:** Falls back to original project

```typescript
try {
  const newProject = await createProject({...});
  effectiveProjectId = newProject.id;
} catch (error) {
  console.error('[Auto-Fork] Failed to create new project:', error);
  // Continue with original project
  effectiveProjectId = selectedProjectId;
}
```

---

## Configuration Save Behavior

### Prospecting Tab

**When:** During `handleGenerate()`, after fork decision

```typescript
if (effectiveProjectId && !skipConfigSave) {
  await updateProject(effectiveProjectId, {
    icp_brief: briefResult.data,
    prospecting_prompts: currentPrompts,
    prospecting_model_selections: currentModelSelections
  });
}
```

**Skip Save Condition:** If project was just forked (config already saved during fork creation)

### Analysis Tab

**When:** During `handleAnalyze()`, after fork decision

```typescript
if (effectiveProjectId) {
  await updateProject(effectiveProjectId, {
    analysis_prompts: currentPrompts
  });
}
```

**Note:** Always saves, even if forked (redundant but ensures data integrity)

---

## Testing Checklist

### Prospecting Tab

- [ ] No warnings on fresh project (0 prospects)
- [ ] No warnings when loading project with prospects (unmodified)
- [ ] ICP warning appears when editing ICP brief (project has prospects)
- [ ] Model warning appears when changing model selections
- [ ] Prompt warning appears when editing prompts
- [ ] Warnings disappear when reverting changes
- [ ] Fork created on generate with modifications + prospects
- [ ] Project switches to forked version after fork
- [ ] Console logs show correct modification state

### Analysis Tab

- [ ] No lock on fresh project (0 leads)
- [ ] Lock appears when loading project with leads (unmodified)
- [ ] Lock disappears when editing prompts
- [ ] Modification warning appears when prompts edited
- [ ] Fork created on analyze with modifications + leads
- [ ] Saved custom prompts load correctly
- [ ] Can detect modifications to saved custom prompts (not just defaults)
- [ ] Console logs show correct lock/modification state

---

## Future Enhancements

### Potential Improvements

1. **Incremental Versioning**
   - Track fork count: (v2) → (v3) → (v4)
   - Store parent-child relationships in DB

2. **Fork Preview**
   - Show diff of changes before forking
   - "What will be different in the new project?"

3. **Explicit Fork Confirmation**
   - Optional user confirmation dialog
   - Show exactly what will be forked

4. **Fork History**
   - Visual tree of project forks
   - Track lineage and branching

5. **Selective Fork**
   - Allow user to choose what to fork
   - "Create new project with modified ICP only"

6. **Merge Capability**
   - Merge changes from forked project back to parent
   - (Complex - requires conflict resolution)

---

## Related Files

### Prospecting Tab
- `command-center-ui/app/prospecting/page.tsx` - Main page component
- `command-center-ui/components/prospecting/icp-brief-editor.tsx` - ICP editor with warning
- `command-center-ui/components/prospecting/model-selector.tsx` - Model selector with warning
- `command-center-ui/components/prospecting/prompt-editor.tsx` - Prompt editor with warning
- `command-center-ui/components/prospecting/fork-warning-badge.tsx` - Reusable warning component
- `command-center-ui/components/prospecting/enhanced-config-form.tsx` - Form wrapper

### Analysis Tab
- `command-center-ui/app/analysis/page.tsx` - Main page component
- `command-center-ui/components/analysis/analysis-config.tsx` - Config wrapper
- `command-center-ui/components/analysis/prompt-editor.tsx` - Prompt editor with lock
- `command-center-ui/components/analysis/model-selector.tsx` - Model selector

### API
- `command-center-ui/lib/api/projects.ts` - `getProject()`, `createProject()`, `updateProject()`
- `command-center-ui/app/api/projects/[id]/route.ts` - Project CRUD endpoints

### Database
- `database-tools/shared/schemas/projects.json` - Projects table schema

---

## Support and Troubleshooting

### Warning Not Appearing

1. Check console for `[Fork Detection]` logs
2. Verify `prospectCount` or `leadsCount` > 0
3. Verify `modifiedX` flags are true
4. Ensure saved config loaded (`savedPrompts`, `savedModelSelections`, etc.)

### Fork Not Creating

1. Check console for `[Auto-Fork]` logs
2. Verify API endpoint `/api/projects` responding
3. Check for error alerts
4. Verify project has data (prospects/leads)

### Warnings Showing When They Shouldn't

1. Check if `savedConfig` loaded correctly
2. Compare `currentConfig` vs `savedConfig` in console
3. Look for JSON serialization issues (object order)
4. Verify comparison logic in `hasModifiedX()` functions

---

**Last Updated:** 2025-10-21
**System Version:** Command Center UI v2.0
**Contact:** MaxantAgency Development Team