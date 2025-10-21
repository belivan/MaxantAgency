# Lib

Utility functions, business logic, and shared services organized by domain.

## Directory Structure

```
lib/
├── api/          # API orchestration and backend service integration
├── constants/    # Application-wide constants
├── contexts/     # React context providers
├── database/     # Supabase client and database operations
├── hooks/        # Custom React hooks
├── server/       # Server-side utilities
├── types/        # TypeScript type definitions
├── utils/        # Domain-specific utility functions
├── index.ts      # Barrel exports for cleaner imports
└── utils.ts      # General utilities (shadcn/ui cn helper)
```

---

## Domain Directories

### API (`api/`)
Orchestration logic for integrating with backend services (prospecting, analysis, outreach engines).

**Key Files**:
- `orchestrator.ts` - Main orchestration logic for engine communication

**Purpose**:
- Load and interact with backend engines
- Coordinate multi-step workflows
- Handle API requests to engines

**Example**:
```typescript
import { getDefaultBrief } from '@/lib/api/orchestrator';

const brief = await getDefaultBrief();
```

### Constants (`constants/`)
Application-wide constants and configuration values.

**Purpose**:
- Centralize magic numbers and strings
- Define application defaults
- Maintain consistency

### Contexts (`contexts/`)
React context providers for global state management.

**Purpose**:
- Share state across components
- Avoid prop drilling
- Manage global UI state

**Example**:
```typescript
import { useTaskProgress } from '@/lib/contexts/task-progress-context';

const { startTask, completeTask } = useTaskProgress();
```

### Database (`database/`)
Supabase client configuration and database operations.

**Key Files**:
- `supabase-server.ts` - Server-side Supabase client

**Purpose**:
- Initialize Supabase client
- Provide database connection
- Server-side database operations

**Example**:
```typescript
import { supabase } from '@/lib/database/supabase-server';

const { data, error } = await supabase
  .from('leads')
  .select('*');
```

### Hooks (`hooks/`)
Custom React hooks for reusable component logic.

**Purpose**:
- Extract reusable component logic
- Simplify state management
- Share behavior across components

**Example**:
```typescript
import { useDebounce } from '@/lib/hooks/use-debounce';

const debouncedValue = useDebounce(searchTerm, 500);
```

### Server (`server/`)
Server-side utility functions for API routes and server components.

**Key Files**:
- `server-utils.ts` - Environment configuration and server utilities

**Purpose**:
- Server-only utilities
- Environment validation
- Server configuration

**Example**:
```typescript
import { ensureSharedEnv } from '@/lib/server/server-utils';

ensureSharedEnv();
```

### Types (`types/`)
TypeScript type definitions and interfaces shared across the application.

**Purpose**:
- Centralize type definitions
- Ensure type consistency
- Improve type safety

**Example**:
```typescript
import type { Lead, Prospect } from '@/lib/types';

const lead: Lead = { /* ... */ };
```

### Utils (`utils/`)
Domain-specific utility functions organized by purpose.

**Key Files**:
- `format.ts` - Formatting utilities (dates, numbers, phone, etc.)
- `validation.ts` - Validation helpers
- `cost-calculator.ts` - Cost calculation logic

**Purpose**:
- Provide reusable utilities
- Keep components clean
- Centralize common operations

**Example**:
```typescript
import { formatDate, formatCurrency } from '@/lib/utils/format';

const formatted = formatDate(new Date());
```

---

## Barrel Exports (`index.ts`)

The `lib/index.ts` file provides convenient barrel exports:

```typescript
// Instead of:
import { supabase } from '@/lib/database/supabase-server';
import { ensureSharedEnv } from '@/lib/server/server-utils';

// You can use:
import { supabase, ensureSharedEnv } from '@/lib';
```

**Note**: This is optional. Direct imports are still preferred for clarity in most cases.

---

## General Utilities (`utils.ts`)

The root `utils.ts` file contains the `cn()` helper from shadcn/ui:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles',
  condition && 'conditional-styles'
)} />
```

**Purpose**: Merge Tailwind CSS classes with proper precedence.

---

## Usage Patterns

### Client-Side Database Access
```typescript
// In React components
import { createClient } from '@/lib/database/supabase-client';

const supabase = createClient();
```

### Server-Side Database Access
```typescript
// In API routes or Server Components
import { supabase } from '@/lib/database/supabase-server';

export async function GET() {
  const { data } = await supabase.from('leads').select('*');
  // ...
}
```

### Custom Hooks
```typescript
// In components
import { useTaskProgress } from '@/lib/contexts/task-progress-context';

export function MyComponent() {
  const { startTask } = useTaskProgress();

  const handleAction = () => {
    startTask('analysis', 'Analyzing...', 100);
  };
}
```

### Utilities
```typescript
// Formatting
import { formatDate, formatCurrency } from '@/lib/utils/format';

const date = formatDate(new Date());
const price = formatCurrency(99.99);

// Validation
import { validateEmail, validateUrl } from '@/lib/utils/validation';

if (validateEmail(email)) {
  // ...
}
```

---

## Adding New Utilities

### 1. Choose the Right Directory
- **Database operation?** → `database/`
- **API/backend logic?** → `api/`
- **React hook?** → `hooks/`
- **Type definition?** → `types/`
- **Formatting/validation?** → `utils/`
- **Server-only?** → `server/`
- **Constants?** → `constants/`

### 2. Create the File
```bash
touch lib/{domain}/{utility-name}.ts
```

### 3. Export Functions
```typescript
/**
 * Brief description
 */
export function myUtility(param: string): string {
  // Implementation
}
```

### 4. Update Barrel Exports (Optional)
If the utility should be available from `@/lib`, add to `index.ts`:
```typescript
export * from './{domain}/{utility-name}';
```

---

## Best Practices

### Type Safety
Always provide TypeScript types:
```typescript
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}
```

### Documentation
Add JSDoc comments:
```typescript
/**
 * Formats a date to human-readable format
 * @param date - Date to format
 * @param format - Format string (optional)
 * @returns Formatted date string
 */
export function formatDate(date: Date, format?: string): string {
  // ...
}
```

### Pure Functions
Keep utilities pure when possible:
```typescript
// Good: Pure function
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Avoid: Side effects
export function updateTotal(items: Item[]): void {
  globalTotal = items.reduce((sum, item) => sum + item.price, 0);
}
```

### Single Responsibility
Each utility should do one thing:
```typescript
// Good: Single responsibility
export function validateEmail(email: string): boolean { /* ... */ }
export function validateUrl(url: string): boolean { /* ... */ }

// Avoid: Multiple responsibilities
export function validate(input: string, type: string): boolean { /* ... */ }
```

---

## Troubleshooting

### Import Errors
If imports fail after reorganization:
1. Check that paths use `@/lib/{domain}/{file}`
2. Verify `tsconfig.json` has correct path mapping
3. Restart TypeScript server in editor

### Type Errors
If types are not recognized:
1. Ensure types are exported: `export type MyType = { /* ... */ }`
2. Import types correctly: `import type { MyType } from '@/lib/types'`
3. Check for circular dependencies

### Server vs Client
If you get "Server Component" errors:
- Server-only code → `lib/server/` or `lib/database/supabase-server.ts`
- Client-safe code → `lib/hooks/`, `lib/utils/`, etc.
- Mark client components: `'use client'`

---

**Last Updated**: 2025-10-21
