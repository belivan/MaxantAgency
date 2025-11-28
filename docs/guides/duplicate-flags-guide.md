# Duplicate Flags - Simple Guide

Shows you what you've already done with a company. **No blocking, no recommendations - just facts.**

## Usage

### In the UI (Command Center)

```javascript
import { getDuplicateFlags } from '../../database-tools/shared/duplicate-flags.js';

// When displaying a list of prospects/leads
const flags = await getDuplicateFlags('https://joespizza.com');

console.log(flags);
/*
{
  has_duplicates: true,
  flags: [
    {
      type: 'contacted',
      platform: 'email',
      status: 'sent',
      days_ago: 12,
      label: 'Contacted via email 12d ago'
    },
    {
      type: 'analyzed',
      grade: 'B',
      score: 75,
      days_ago: 15,
      label: 'Analyzed 15d ago (Grade: B)'
    }
  ],
  contacted_count: 1,
  is_analyzed: true,
  is_in_database: true
}
*/
```

### Display Flags in Your List

```jsx
// In your React component
{flags.has_duplicates && (
  <div className="flex gap-2">
    {flags.flags.map((flag, i) => (
      <span key={i} className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
        {flag.label}
      </span>
    ))}
  </div>
)}
```

### Batch Check (for lists)

```javascript
import { batchGetDuplicateFlags } from '../../database-tools/shared/duplicate-flags.js';

// Get flags for all prospects at once (faster)
const websites = prospects.map(p => p.website);
const flagsMap = await batchGetDuplicateFlags(websites);

// Use in your list
prospects.forEach(prospect => {
  const flags = flagsMap.get(prospect.website);
  if (flags.has_duplicates) {
    console.log(`⚠️ ${prospect.company_name}: ${flags.flags.map(f => f.label).join(', ')}`);
  }
});
```

### Quick Checks

```javascript
import { hasBeenContacted, hasBeenAnalyzed } from '../../database-tools/shared/duplicate-flags.js';

// Before sending an email
if (await hasBeenContacted('https://joespizza.com', 'email')) {
  console.log('⚠️ Already emailed this company');
}

// Before analyzing
if (await hasBeenAnalyzed('https://joespizza.com')) {
  console.log('ℹ️ Already analyzed (you can re-analyze if you want)');
}
```

## UI Examples

### Prospects List

```
┌────────────────────────────────────────────────────────────┐
│ Joe's Pizza                                    ⭐ 4.5 (120)│
│ https://joespizza.com                                      │
│                                                            │
│ 📧 Contacted via email 12d ago  📊 Grade B (15d ago)     │
└────────────────────────────────────────────────────────────┘
```

### Leads Tab

```
┌────────────────────────────────────────────────────────────┐
│ Pizza Shop                            Grade: C    Score: 62│
│                                                            │
│ ⚠️ Email already sent 5 days ago                          │
│ Subject: "Your website could look better"                 │
│                                                            │
│ [View Email] [Send Follow-up]                             │
└────────────────────────────────────────────────────────────┘
```

## That's It!

No complex logic, no recommendations. Just shows you:
- ✅ What you've done before
- ✅ When you did it
- ✅ Current status

You decide everything else.
