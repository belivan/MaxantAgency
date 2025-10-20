# COMMAND CENTER UI - Technical Specification
Version: 2.0
Agent Assignment: Agent 4
Status: COMPLETE REFACTOR REQUIRED

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

Modern Next.js dashboard providing unified interface for entire lead generation pipeline.
Connects to all 3 engines (Prospecting, Analysis, Outreach) with real-time monitoring.

**Core Philosophy:** "One beautiful interface: Find → Analyze → Compose → Send"

═══════════════════════════════════════════════════════════════════

## 2. USER FLOW

```
TAB 1: DASHBOARD
→ Real-time stats, cost tracking, activity feed

TAB 2: PROJECTS
→ Create campaigns, track performance

TAB 3: PROSPECTING
→ ICP brief editor, generate prospects, real-time progress

TAB 4: ANALYSIS
→ Select prospects, configure depth, run analysis

TAB 5: LEADS
→ Browse analyzed leads, filters, detail view

TAB 6: OUTREACH
→ Sub-tabs: EMAILS | SOCIAL DMs
→ Compose, preview, send, batch operations

TAB 7: ANALYTICS
→ Cost charts, conversion funnel, strategy comparison
```

═══════════════════════════════════════════════════════════════════

## 3. FILE STRUCTURE

```
command-center-ui/
├── app/
│   ├── page.tsx (Dashboard)
│   ├── projects/page.tsx
│   ├── prospecting/page.tsx
│   ├── analysis/page.tsx
│   ├── leads/page.tsx
│   ├── outreach/
│   │   ├── emails/page.tsx
│   │   └── social/page.tsx
│   └── analytics/page.tsx
│
├── components/
│   ├── ui/ (shadcn/ui)
│   ├── dashboard/
│   ├── prospecting/
│   ├── analysis/
│   ├── leads/
│   ├── outreach/
│   └── analytics/
│
└── lib/
    ├── api/ (calls to 3 engines)
    ├── hooks/ (use-sse, use-leads, etc.)
    └── types/
```

═══════════════════════════════════════════════════════════════════

## 4. KEY FEATURES

### Dashboard Tab
- Summary cards (prospects, analyzed, sent, cost)
- Real-time activity feed
- Pipeline health indicators

### Projects Tab
- Create project with ICP brief
- View all projects with stats
- Drill-down into project details

### Prospecting Tab
- JSON editor for ICP brief
- Config: count, city, model
- Real-time SSE progress
- Table with checkboxes

### Analysis Tab
- Filter prospects (status, industry, city)
- Configure tier/modules
- Real-time analysis progress
- Auto-switch to Leads when done

### Leads Tab
- Table with filters (grade, email, industry)
- Click row → Detailed modal
- Select multiple → Compose button

### Outreach Tab - Emails
- Email composer with strategy selection
- Preview modal with variants
- Batch send dialog
- Notion sync button

### Outreach Tab - Social
- Platform selection (Instagram/Facebook/LinkedIn)
- DM composer
- Copy to clipboard
- Mark as sent

### Analytics Tab
- Cost tracking chart
- Conversion funnel
- Strategy comparison
- Campaign performance

═══════════════════════════════════════════════════════════════════

## 5. API INTEGRATION

```typescript
// lib/api/prospecting.ts
export async function generateProspects(brief, options) {
  return new EventSource('http://localhost:3010/api/prospect');
}

// lib/api/analysis.ts
export async function analyzeProspects(ids, options) {
  return new EventSource('http://localhost:3000/api/analyze');
}

// lib/api/outreach.ts
export async function composeEmails(leadIds, options) {
  return new EventSource('http://localhost:3001/api/compose-batch');
}
```

**SSE Hook:**
```typescript
export function useSSE(url, onMessage) {
  // Handles EventSource connection
  // Returns {status, error}
}
```

═══════════════════════════════════════════════════════════════════

## 6. TECH STACK

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript + React
- **UI:** shadcn/ui (Radix + Tailwind)
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **State:** React Context (no Redux)

**Dependencies:**
```json
{
  "next": "14.2.3",
  "react": "18.3.1",
  "typescript": "5.4.5",
  "@supabase/supabase-js": "^2.75.1",
  "@radix-ui/react-*": "latest",
  "recharts": "^2.12.0",
  "clsx": "^2.1.1",
  "tailwindcss": "^3.4.4"
}
```

═══════════════════════════════════════════════════════════════════

## 7. SUCCESS CRITERIA

✅ All 7 tabs implemented
✅ Real-time SSE to all 3 engines
✅ Project management
✅ Complete pipeline flow
✅ Filters and search on all tables
✅ Batch operations
✅ Email/social preview
✅ Analytics charts
✅ Cost tracking
✅ Responsive design
✅ Dark mode
✅ All tests passing

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION
