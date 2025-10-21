# Components

React components for the Command Center UI, organized by feature.

## Directory Structure

```
components/
├── ui/           # shadcn/ui primitives (buttons, cards, dialogs, etc.)
├── shared/       # Reusable components across features
├── analysis/     # Analysis feature components
├── analytics/    # Analytics feature components
├── campaigns/    # Campaign scheduling components
├── dashboard/    # Dashboard and overview components
├── leads/        # Lead management components
├── outreach/     # Email and social outreach components
├── projects/     # Project management components
└── prospecting/  # Prospecting and discovery components
```

---

## Component Categories

### UI Components (`ui/`)
shadcn/ui primitive components. These are the building blocks used throughout the application.

**Examples**: button, card, dialog, input, select, table

**When to use**:
- Need a standard UI primitive
- Building new features
- Consistent styling required

**Do not modify**: These are maintained by shadcn/ui. Use composition instead.

### Shared Components (`shared/`)
Reusable components used across multiple features.

**Examples**:
- `navbar.tsx` - Main navigation bar
- `loading-spinner.tsx` - Loading states
- `error-boundary.tsx` - Error handling
- `project-selector.tsx` - Project dropdown

**When to add here**:
- Component is used in 2+ features
- Component is truly generic
- Component has no feature-specific logic

### Feature Components

Each feature has its own directory with related components.

#### Analysis (`analysis/`)
Components for website analysis and AI model configuration.

**Key Components**:
- `analysis-config.tsx` - Analysis configuration form
- `analysis-progress.tsx` - Real-time analysis progress
- `model-selector.tsx` - AI model selection
- `prospect-selector.tsx` - Select prospects to analyze

#### Analytics (`analytics/`)
Components for viewing analytics, charts, and ROI calculations.

**Key Components**:
- `analytics-stats.tsx` - Key metrics display
- `cost-tracking-chart.tsx` - Cost over time
- `conversion-funnel-chart.tsx` - Conversion visualization
- `roi-calculator.tsx` - ROI computation

#### Campaigns (`campaigns/`)
Components for scheduling and managing automated campaigns.

**Key Components**:
- `campaign-schedule-dialog.tsx` - Create campaign dialog
- `scheduled-campaigns-table.tsx` - View campaigns
- `campaign-runs-history.tsx` - Execution history

#### Dashboard (`dashboard/`)
Components for the main dashboard and overview.

**Key Components**:
- `stats-cards.tsx` - Metric cards
- `pipeline-health.tsx` - Health indicator
- `activity-feed.tsx` - Recent activity
- `unified-dashboard.tsx` - Complete dashboard view

#### Leads (`leads/`)
Components for viewing and managing analyzed leads.

**Key Components**:
- `leads-table.tsx` - Advanced table with filtering/sorting
- `lead-detail-modal.tsx` - Full lead details
- `grade-badge.tsx` - A-F grade display
- `priority-badge.tsx` - HOT/WARM/COLD indicators
- `dimension-radar-chart.tsx` - 6-dimension scoring visualization
- `business-intel-enhanced.tsx` - Business intelligence display

#### Outreach (`outreach/`)
Components for email and social media outreach.

**Key Components**:
- `email-composer.tsx` - Compose emails
- `batch-email-composer.tsx` - Bulk email generation
- `emails-table.tsx` - View generated emails
- `social-dm-composer.tsx` - Social DM creation
- `social-messages-table.tsx` - View social messages

#### Projects (`projects/`)
Components for project management and organization.

**Key Components**:
- `projects-table.tsx` - Project list
- `create-project-dialog.tsx` - New project form

#### Prospecting (`prospecting/`)
Components for generating and managing prospects.

**Key Components**:
- `icp-brief-editor.tsx` - Edit ICP brief
- `prospect-config-form.tsx` - Configure discovery
- `prospect-table.tsx` - View generated prospects
- `progress-stream.tsx` - Real-time progress

---

## Component Standards

### File Naming
- **Files**: `kebab-case.tsx` (e.g., `lead-detail-modal.tsx`)
- **Components**: `PascalCase` (e.g., `LeadDetailModal`)
- **Exports**: Named exports preferred, default export accepted

### Component Structure
```typescript
/**
 * ComponentName
 *
 * Brief description of what this component does
 * Used in: Page or feature where it's used
 *
 * @param prop1 - Description of prop1
 * @param prop2 - Description of prop2
 */
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // Component logic
}

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}
```

### Best Practices

1. **Single Responsibility**: Each component should do one thing well
2. **Composition over Inheritance**: Build complex components from simple ones
3. **Props Interface**: Always define TypeScript interfaces for props
4. **Error Handling**: Handle loading and error states gracefully
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Documentation**: Add JSDoc comments for complex components

### Styling
- Use **Tailwind CSS** for styling
- Use **shadcn/ui** components for consistency
- Use the `cn()` utility from `@/lib/utils` for conditional classes

**Example**:
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  anotherCondition ? 'true-classes' : 'false-classes'
)} />
```

---

## Creating New Components

### 1. Choose the Right Directory
- **Feature-specific?** → Add to feature directory
- **Used in 2+ features?** → Add to `shared/`
- **UI primitive?** → Use shadcn/ui or extend existing

### 2. Create the File
```bash
# Feature component
touch components/{feature}/{component-name}.tsx

# Shared component
touch components/shared/{component-name}.tsx
```

### 3. Add Documentation
```typescript
/**
 * ComponentName
 * Brief description
 * Used in: /feature-path
 */
```

### 4. Export Component
```typescript
export function ComponentName() {
  // ...
}

// or
export default ComponentName;
```

### 5. Update Imports
Add component to page or parent component:
```typescript
import { ComponentName } from '@/components/feature/component-name';
```

---

## Importing Components

### From Feature Directories
```typescript
import { LeadsTable } from '@/components/leads/leads-table';
import { ProspectConfigForm } from '@/components/prospecting/prospect-config-form';
```

### From Shared
```typescript
import { Navbar } from '@/components/shared/navbar';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
```

### From UI
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
```

---

## Maintenance

### Adding shadcn/ui Components
```bash
npx shadcn-ui@latest add {component-name}
```

This adds components to `components/ui/`.

### Removing Unused Components
1. Search for component usage: `grep -r "ComponentName" app/ components/`
2. If no results, safe to delete
3. Remove file and update exports

### Refactoring Components
When a component becomes too large (>300 lines):
1. Identify logical sub-components
2. Extract to separate files
3. Keep in same feature directory
4. Update imports

---

**Last Updated**: 2025-10-21
