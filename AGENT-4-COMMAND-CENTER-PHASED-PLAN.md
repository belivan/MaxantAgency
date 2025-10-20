# AGENT 4: COMMAND CENTER UI
## PHASED IMPLEMENTATION PLAN
Version: 1.0
Created: 2025-10-19
Status: READY FOR REVIEW

═══════════════════════════════════════════════════════════════════

## OVERVIEW

This plan breaks down the Command Center UI implementation into 10 sequential phases,
each with clear deliverables, success criteria, and dependencies.

**Total Estimated Timeline**: 4-6 weeks (full-time development)
**Tech Stack**: Next.js 14, TypeScript, shadcn/ui, Recharts, Supabase
**Service Port**: 3000

═══════════════════════════════════════════════════════════════════

## PHASE 1: FOUNDATION & PROJECT SETUP
**Duration**: 1-2 days
**Status**: Not Started
**Depends On**: None

### Objectives:
- Initialize Next.js 14 project with App Router
- Set up complete folder structure (as per spec)
- Install all required dependencies
- Configure development environment

### Tasks:
1. **Project Initialization**
   ```bash
   npx create-next-app@latest command-center-ui --typescript --tailwind --app
   cd command-center-ui
   ```

2. **Install Core Dependencies**
   ```bash
   npm install @supabase/supabase-js
   npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
   npm install recharts clsx lucide-react date-fns zod
   npm install react-hook-form @hookform/resolvers
   ```

3. **Initialize shadcn/ui**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button table dialog select tabs input textarea
   npx shadcn-ui@latest add card badge checkbox radio-group switch
   ```

4. **Create Folder Structure**
   - Create all directories: `app/`, `components/`, `lib/`
   - Set up subdirectories as per specification
   - Create placeholder `page.tsx` files for all 7 tabs

5. **Configuration Files**
   - Configure `next.config.js` (API proxy if needed)
   - Set up `tsconfig.json` with path aliases
   - Configure `tailwind.config.ts` with theme
   - Create `.env.local` with API endpoints

### Deliverables:
- ✅ Complete folder structure matching spec
- ✅ All dependencies installed and working
- ✅ shadcn/ui components ready
- ✅ Development server runs on port 3000
- ✅ TypeScript configured with strict mode

### Success Criteria:
- `npm run dev` starts without errors
- Can navigate to all 7 tab routes (even if empty)
- Tailwind CSS working
- TypeScript compiling without errors

═══════════════════════════════════════════════════════════════════

## PHASE 2: CORE INFRASTRUCTURE
**Duration**: 2-3 days
**Status**: Not Started
**Depends On**: Phase 1

### Objectives:
- Build reusable API client functions
- Implement SSE (Server-Sent Events) hook
- Set up Supabase client
- Define TypeScript types for all data models
- Create utility functions

### Tasks:

1. **Type Definitions** (`lib/types/`)
   ```typescript
   // lib/types/prospect.ts
   export interface Prospect {
     id: string;
     company_name: string;
     website: string;
     industry: string;
     city: string;
     rating: number;
     contact_email?: string;
     contact_phone?: string;
     status: 'ready_for_analysis' | 'analyzed' | 'email_composed';
     created_at: string;
   }

   // lib/types/lead.ts
   export interface Lead {
     id: string;
     company_name: string;
     website: string;
     grade: 'A' | 'B' | 'C' | 'D' | 'F';
     overall_score: number;
     analysis_summary: string;
     quick_wins: string[];
     design_issues: Issue[];
     seo_issues: Issue[];
     contact_email?: string;
     // ... full type definition
   }

   // lib/types/email.ts
   // lib/types/analytics.ts
   ```

2. **API Client Functions** (`lib/api/`)
   ```typescript
   // lib/api/prospecting.ts
   export async function generateProspects(brief: ICPBrief, options: ProspectOptions) {
     // POST to Agent 1: http://localhost:3010/api/prospect
   }

   export async function getProspects(filters: ProspectFilters) {
     // GET from Agent 1
   }

   // lib/api/analysis.ts
   export async function analyzeProspects(prospectIds: string[], options: AnalysisOptions) {
     // POST to Agent 2: http://localhost:3000/api/analyze
   }

   export async function getLeads(filters: LeadFilters) {
     // GET from Agent 2
   }

   // lib/api/outreach.ts
   export async function composeEmails(leadIds: string[], options: EmailOptions) {
     // POST to Agent 3: http://localhost:3001/api/compose-batch
   }

   export async function sendEmail(emailId: string) {
     // POST to Agent 3: http://localhost:3001/api/send-email
   }
   ```

3. **SSE Hook** (`lib/hooks/use-sse.ts`)
   ```typescript
   export function useSSE<T>(url: string | null, onMessage: (data: T) => void) {
     const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed'>('idle');
     const [error, setError] = useState<Error | null>(null);

     useEffect(() => {
       if (!url) return;
       const eventSource = new EventSource(url);
       // ... implementation
     }, [url]);

     return { status, error };
   }
   ```

4. **Supabase Client** (`lib/api/supabase.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_KEY!
   );

   // Helper functions for direct DB queries if needed
   export async function getProspectsByProject(projectId: string) {
     // Direct Supabase query
   }
   ```

5. **Utility Functions** (`lib/utils/`)
   ```typescript
   // lib/utils/format.ts
   export function formatCurrency(amount: number): string;
   export function formatDate(date: string): string;
   export function formatPercent(value: number): string;

   // lib/utils/validation.ts
   export const briefSchema = z.object({ ... });

   // lib/utils/cost-calculator.ts
   export function calculateProspectingCost(count: number, model: string): number;
   export function calculateAnalysisCost(count: number, tier: string): number;
   ```

6. **Shared Components** (`components/shared/`)
   - `navbar.tsx` - Main navigation with 7 tabs
   - `error-boundary.tsx` - Error handling wrapper
   - `loading-spinner.tsx` - Loading states
   - `sse-connector.tsx` - Reusable SSE component

### Deliverables:
- ✅ Complete type definitions for all data models
- ✅ API client functions for all 3 engines
- ✅ Working SSE hook with connection status
- ✅ Supabase client configured
- ✅ Utility functions (format, validation, cost calc)
- ✅ Shared components (navbar, error boundary, loading)

### Success Criteria:
- API functions can be imported and called
- SSE hook successfully connects to test endpoint
- Supabase client can query database
- TypeScript types are strict and accurate
- Navbar renders and navigation works

═══════════════════════════════════════════════════════════════════

## PHASE 3: DASHBOARD & PROJECTS
**Duration**: 2-3 days
**Status**: Not Started
**Depends On**: Phase 2

### Objectives:
- Implement Dashboard tab (Tab 1) with real-time stats
- Implement Projects tab (Tab 2) with CRUD operations
- Create reusable dashboard components

### Tasks:

1. **Dashboard Components** (`components/dashboard/`)
   ```typescript
   // stats-cards.tsx
   <StatsCards>
     <StatCard title="Total Prospects" value={1247} change={+12} />
     <StatCard title="Analyzed This Week" value={156} cost="$6.24" />
     <StatCard title="Emails Sent" value={89} openRate="42%" />
     <StatCard title="Pipeline Cost" value="$127.50" budget="$500" />
   </StatsCards>

   // activity-feed.tsx
   <ActivityFeed>
     <Activity type="prospect" timestamp="2m ago">
       20 prospects generated for 'Philly Restaurants'
     </Activity>
     <Activity type="analysis" timestamp="5m ago">
       Analyzed zahavrestaurant.com - Grade B
     </Activity>
   </ActivityFeed>

   // pipeline-health.tsx
   <PipelineHealth>
     <HealthIndicator service="prospecting" status="green" />
     <HealthIndicator service="analysis" status="green" />
     <HealthIndicator service="outreach" status="yellow" />
   </PipelineHealth>
   ```

2. **Dashboard Page** (`app/page.tsx`)
   - Fetch stats from all 3 engines
   - Display summary cards
   - Show activity feed (recent operations)
   - Pipeline health indicators
   - Cost tracking summary

3. **Projects Components** (`components/projects/`)
   ```typescript
   // create-project-dialog.tsx
   <CreateProjectDialog>
     <Input name="projectName" />
     <Textarea name="description" />
     <ICPBriefEditor value={brief} onChange={setBrief} />
     <Button onClick={createProject}>Create Project</Button>
   </CreateProjectDialog>

   // projects-table.tsx
   <ProjectsTable
     columns={["name", "status", "prospects", "analyzed", "emails", "cost", "created"]}
     data={projects}
     onRowClick={viewProjectDetails}
   />

   // project-detail-view.tsx
   <ProjectDetailView project={selectedProject}>
     <Tabs>
       <Tab label="Prospects">...</Tab>
       <Tab label="Analysis">...</Tab>
       <Tab label="Emails">...</Tab>
       <Tab label="Cost Breakdown">...</Tab>
     </Tabs>
   </ProjectDetailView>
   ```

4. **Projects Page** (`app/projects/page.tsx`)
   - List all projects
   - Create new project dialog
   - Project drill-down view
   - Filter/search projects

5. **Data Hooks** (`lib/hooks/`)
   ```typescript
   // use-dashboard-stats.ts
   export function useDashboardStats() {
     const [stats, setStats] = useState<DashboardStats | null>(null);
     // Fetch from all engines
   }

   // use-projects.ts
   export function useProjects() {
     const [projects, setProjects] = useState<Project[]>([]);
     // CRUD operations
   }
   ```

### Deliverables:
- ✅ Dashboard page with real-time stats
- ✅ Activity feed showing recent operations
- ✅ Pipeline health indicators
- ✅ Projects table with filters
- ✅ Create project dialog with ICP brief editor
- ✅ Project detail view

### Success Criteria:
- Dashboard displays stats from all 3 engines
- Activity feed updates in real-time
- Can create new projects
- Can view project details
- Health indicators show actual API status

═══════════════════════════════════════════════════════════════════

## PHASE 4: PROSPECTING FLOW
**Duration**: 3-4 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 3

### Objectives:
- Implement Prospecting tab (Tab 3)
- ICP brief editor with validation
- Real-time prospect generation with SSE
- Prospect selection for batch analysis

### Tasks:

1. **Prospecting Components** (`components/prospecting/`)
   ```typescript
   // icp-brief-editor.tsx
   <ICPBriefEditor
     value={brief}
     onChange={setBrief}
     schema={briefSchema}
     templates={["restaurants", "retail", "home-services"]}
   />

   // prospect-config-form.tsx
   <ProspectConfigForm>
     <Input type="number" label="Count" min={1} max={50} />
     <Input type="text" label="City" placeholder="Philadelphia, PA" />
     <Select label="Model" options={["grok-4-fast", "gpt-4o-mini"]} />
     <Switch label="Verify URLs" />
     <Button onClick={generate}>Generate Prospects</Button>
   </ProspectConfigForm>

   // progress-stream.tsx
   <ProgressStream eventSource={sseUrl}>
     <ProgressBar current={12} total={20} />
     <StatusText>Analyzing: Zahav Restaurant</StatusText>
     <LogFeed logs={logs} />
   </ProgressStream>

   // prospect-table.tsx
   <ProspectTable
     prospects={prospects}
     selectedIds={selected}
     onSelectionChange={setSelected}
     columns={["checkbox", "name", "industry", "website", "rating", "contact"]}
   />
   ```

2. **Prospecting Page** (`app/prospecting/page.tsx`)
   - ICP brief editor
   - Configuration form
   - Generate button
   - SSE progress display
   - Results table
   - Batch analyze button

3. **SSE Integration**
   - Connect to Agent 1: `http://localhost:3010/api/prospect`
   - Display real-time progress
   - Handle step-by-step logs
   - Update prospect table as results arrive

4. **Prospect Selection**
   - Checkbox selection (single + bulk)
   - "Select All" functionality
   - "Analyze Selected" button
   - Show selection count

### Deliverables:
- ✅ ICP brief JSON editor with validation
- ✅ Prospect configuration form
- ✅ SSE-based progress display
- ✅ Real-time prospect table updates
- ✅ Batch selection functionality
- ✅ Integration with Agent 1 API

### Success Criteria:
- Can edit and save ICP brief
- Generating prospects shows real-time progress
- Prospects appear in table as discovered
- Can select multiple prospects
- "Analyze Selected" button works

═══════════════════════════════════════════════════════════════════

## PHASE 5: ANALYSIS FLOW
**Duration**: 3-4 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 4

### Objectives:
- Implement Analysis tab (Tab 4)
- Prospect filtering and selection
- Analysis configuration (tier, modules)
- Real-time analysis progress with SSE
- Completed leads display

### Tasks:

1. **Analysis Components** (`components/analysis/`)
   ```typescript
   // prospect-selector.tsx
   <ProspectSelector>
     <Filters>
       <Select label="Status" value="ready_for_analysis" />
       <Select label="Industry" options={industries} />
       <Select label="City" options={cities} />
       <Input label="Min Rating" type="number" min={0} max={5} />
     </Filters>
     <ProspectTable selectable selectedIds={selected} />
     <SelectionSummary>{selected.length} prospects selected</SelectionSummary>
   </ProspectSelector>

   // analysis-config.tsx
   <AnalysisConfig>
     <RadioGroup label="Analysis Depth">
       <Radio value="tier1" label="Tier 1 - Basic ($0.04/lead)" />
       <Radio value="tier2" label="Tier 2 - Standard ($0.08/lead)" />
       <Radio value="tier3" label="Tier 3 - Deep ($0.15/lead)" />
     </RadioGroup>
     <CheckboxGroup label="Modules">
       <Checkbox value="design" label="Design Analysis" />
       <Checkbox value="seo" label="SEO Analysis" />
       <Checkbox value="content" label="Content Analysis" />
       <Checkbox value="social" label="Social Analysis" />
     </CheckboxGroup>
     <CostEstimate>Estimated: ${cost}</CostEstimate>
   </AnalysisConfig>

   // analysis-progress.tsx
   <AnalysisProgress eventSource={sseUrl}>
     <OverallProgress current={8} total={20} />
     <CurrentSite name="Zahav Restaurant">
       <Steps>
         <Step completed>Screenshot capture</Step>
         <Step active>Design analysis</Step>
         <Step pending>SEO analysis</Step>
       </Steps>
     </CurrentSite>
     <CompletedList>
       <CompletedSite name="Vetri Cucina" grade="A" score={92} />
     </CompletedList>
   </AnalysisProgress>
   ```

2. **Analysis Page** (`app/analysis/page.tsx`)
   - Prospect selector with filters
   - Analysis configuration
   - Cost estimation
   - Run analysis button
   - Real-time SSE progress
   - Auto-navigate to Leads tab when complete

3. **SSE Integration**
   - Connect to Agent 2: `http://localhost:3000/api/analyze`
   - Display company-by-company progress
   - Show analysis steps per company
   - Display completed leads with grades

4. **Auto-Navigation**
   - When analysis completes, redirect to `/leads`
   - Show success toast with count

### Deliverables:
- ✅ Prospect filtering and selection
- ✅ Analysis tier/module configuration
- ✅ Cost estimation calculator
- ✅ SSE-based progress display
- ✅ Company-by-company status updates
- ✅ Completed leads preview
- ✅ Auto-navigation on completion

### Success Criteria:
- Can filter prospects ready for analysis
- Can configure analysis depth and modules
- Shows accurate cost estimate
- Real-time progress displays correctly
- Auto-redirects to Leads tab when done
- All analyzed leads appear in database

═══════════════════════════════════════════════════════════════════

## PHASE 6: LEADS MANAGEMENT
**Duration**: 3-4 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 5

### Objectives:
- Implement Leads tab (Tab 5)
- Advanced filtering (grade, email, industry)
- Lead detail modal with full analysis
- Batch email composition

### Tasks:

1. **Leads Components** (`components/leads/`)
   ```typescript
   // leads-table.tsx
   <LeadsTable
     columns={[
       "checkbox", "company", "industry", "grade",
       "score", "top_issue", "contact_email", "actions"
     ]}
     data={filteredLeads}
     onRowClick={openDetail}
   />

   // lead-filters.tsx
   <LeadFilters>
     <GradeFilter selected={["A", "B"]} onChange={setGrades} />
     <Switch label="Has Email" checked={hasEmail} />
     <Select label="Industry" multi options={industries} />
     <Select label="Sort By" options={["grade", "score", "date"]} />
   </LeadFilters>

   // lead-detail-modal.tsx
   <LeadDetailModal lead={lead}>
     <Header>
       <CompanyName>{lead.company_name}</CompanyName>
       <GradeBadge grade={lead.grade} score={lead.overall_score} />
     </Header>
     <Tabs>
       <Tab label="Overview">
         <ContactInfo />
         <AnalysisSummary />
         <QuickWins />
       </Tab>
       <Tab label="Design Issues">...</Tab>
       <Tab label="SEO Issues">...</Tab>
       <Tab label="Content">...</Tab>
       <Tab label="Social">...</Tab>
     </Tabs>
     <Actions>
       <Button onClick={composeEmail}>Compose Email</Button>
       <Button onClick={exportPDF}>Export Report</Button>
     </Actions>
   </LeadDetailModal>

   // grade-badge.tsx
   <GradeBadge grade="A" score={92}>
     A (92%)
   </GradeBadge>
   ```

2. **Leads Page** (`app/leads/page.tsx`)
   - Leads table with all columns
   - Filter controls (grade, has email, industry, sort)
   - Batch selection
   - "Compose Emails" button
   - Click row to open detail modal

3. **Lead Detail Page** (`app/leads/[id]/page.tsx`)
   - Full analysis results
   - Tabbed view (Overview, Design, SEO, Content, Social)
   - Contact information
   - Quick wins list
   - Issue breakdowns
   - Export to PDF button

4. **Data Hooks**
   ```typescript
   // lib/hooks/use-leads.ts
   export function useLeads(filters: LeadFilters) {
     const [leads, setLeads] = useState<Lead[]>([]);
     const [loading, setLoading] = useState(true);
     // Fetch and filter leads
   }
   ```

### Deliverables:
- ✅ Leads table with filtering
- ✅ Grade-based filtering (A/B/C/D/F)
- ✅ Email presence filter
- ✅ Industry multi-select filter
- ✅ Sortable columns
- ✅ Lead detail modal with tabs
- ✅ Full analysis display
- ✅ Batch selection for email composition
- ✅ Grade badge component

### Success Criteria:
- Leads table displays all analyzed prospects
- Filters work correctly (grade, email, industry)
- Clicking lead opens detailed modal
- All analysis sections display properly
- Can select multiple leads
- "Compose Emails" button is enabled when leads selected

═══════════════════════════════════════════════════════════════════

## PHASE 7: EMAIL OUTREACH
**Duration**: 4-5 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 6

### Objectives:
- Implement Outreach > Emails tab
- Email composition with SSE
- Email preview with variants
- Batch sending functionality
- Notion sync integration

### Tasks:

1. **Email Components** (`components/outreach/`)
   ```typescript
   // email-composer.tsx
   <EmailComposer selectedLeads={leads}>
     <Config>
       <Select label="Strategy" options={strategies} />
       <Select label="Model" options={["haiku", "sonnet"]} />
       <Switch label="Generate A/B Variants" />
     </Config>
     <Button onClick={compose}>Compose {leads.length} Emails</Button>
     <ProgressStream eventSource={sseUrl}>
       <Progress current={5} total={15} />
       <Log>Composing for Zahav Restaurant...</Log>
     </ProgressStream>
   </EmailComposer>

   // email-table.tsx
   <EmailTable
     columns={[
       "checkbox", "company", "subject", "quality_score",
       "status", "created_at", "actions"
     ]}
     data={emails}
     onRowClick={previewEmail}
   />

   // email-preview.tsx
   <EmailPreview email={email}>
     <EmailHeader>
       <To>{email.contact_email}</To>
       <Subject>{email.email_subject}</Subject>
       <QualityBadge score={email.quality_score} />
     </EmailHeader>
     <EmailBody>{email.email_body}</EmailBody>
     {email.has_variants && (
       <Variants>
         <Tabs>
           <Tab label="Subject Variants">...</Tab>
           <Tab label="Body Variants">...</Tab>
         </Tabs>
       </Variants>
     )}
     <Reasoning>
       <Section title="Why This Works">{email.technical_reasoning}</Section>
       <Section title="Before Sending">
         <Checklist items={email.verification_checklist} />
       </Section>
     </Reasoning>
     <Actions>
       <Button onClick={edit}>Edit</Button>
       <Button onClick={send} variant="primary">Send Email</Button>
     </Actions>
   </EmailPreview>

   // batch-send-dialog.tsx
   <BatchSendDialog emails={selected}>
     <Config>
       <Select label="Provider" options={["gmail", "custom-smtp"]} />
       <Input label="Delay Between Emails (ms)" type="number" />
       <Switch label="Actually Send (not just .eml)" />
     </Config>
     <Warning>This will send {selected.length} emails</Warning>
     <ProgressStream eventSource={sseUrl}>
       <Progress current={3} total={15} />
       <Log>Sent to Zahav Restaurant - ID: abc123</Log>
     </ProgressStream>
     <Button onClick={startSend}>Start Sending</Button>
   </BatchSendDialog>
   ```

2. **Emails Page** (`app/outreach/emails/page.tsx`)
   - Email composer panel
   - Composed emails table
   - Filters (status, project, quality score)
   - Email preview modal
   - Batch actions (Send, Export, Sync to Notion)

3. **API Integration**
   - Compose emails: `POST /api/compose-batch` (Agent 3)
   - Send email: `POST /api/send-email` (Agent 3)
   - Sync to Notion: `POST /api/sync-notion` (Agent 3)
   - SSE progress for batch operations

4. **Email Variants Display**
   - Show all subject variants
   - Show all body variants
   - Highlight recommended variants
   - Allow manual variant selection

### Deliverables:
- ✅ Email composer with strategy selection
- ✅ SSE-based composition progress
- ✅ Email table with filters
- ✅ Email preview modal
- ✅ Variant display and selection
- ✅ Quality score badges
- ✅ Batch send dialog
- ✅ Notion sync button
- ✅ Export to CSV/EML

### Success Criteria:
- Can compose emails for selected leads
- Real-time composition progress works
- Email preview shows all details
- Variants display correctly
- Can send individual emails
- Batch send works with progress tracking
- Notion sync succeeds
- Export functions work

═══════════════════════════════════════════════════════════════════

## PHASE 8: SOCIAL OUTREACH
**Duration**: 2-3 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 6

### Objectives:
- Implement Outreach > Social DMs tab
- Social message composition
- Platform-specific formatting
- Copy-to-clipboard functionality
- Manual status tracking

### Tasks:

1. **Social Components** (`components/outreach/`)
   ```typescript
   // social-dm-composer.tsx
   <SocialComposer selectedLeads={leads}>
     <PlatformSelector>
       <Radio value="instagram" label="Instagram" />
       <Radio value="facebook" label="Facebook" />
       <Radio value="linkedin" label="LinkedIn" />
     </PlatformSelector>
     <StrategySelect options={strategies} />
     <Switch label="Generate Variants for A/B Testing" />
     <Button onClick={compose}>Generate {leads.length} DMs</Button>
   </SocialComposer>

   // social-dm-table.tsx
   <SocialDMsTable
     columns={[
       "company", "platform", "profile_url",
       "message_preview", "quality_score", "status", "actions"
     ]}
     data={messages}
   />
   ```

2. **Social Page** (`app/outreach/social/page.tsx`)
   - Platform selector
   - Social composer
   - Messages table
   - Copy to clipboard button
   - Mark as sent manually
   - Filter by platform

3. **API Integration**
   - Compose social: `POST /api/compose-social` (Agent 3)
   - Update status: `PATCH /api/social-messages/:id`

4. **Clipboard Integration**
   - Copy message button
   - Toast notification on copy
   - Platform-specific formatting preserved

### Deliverables:
- ✅ Social DM composer
- ✅ Platform selection (Instagram/Facebook/LinkedIn)
- ✅ Social messages table
- ✅ Copy to clipboard functionality
- ✅ Manual status tracking
- ✅ Platform filtering
- ✅ Message preview with character limits

### Success Criteria:
- Can compose social DMs for leads with social profiles
- Platform selection works
- Messages display in table
- Copy to clipboard works
- Can manually mark as sent
- Character limits shown for each platform

═══════════════════════════════════════════════════════════════════

## PHASE 9: ANALYTICS DASHBOARD
**Duration**: 3-4 days
**Status**: Not Started
**Depends On**: Phase 2, Phase 7, Phase 8

### Objectives:
- Implement Analytics tab (Tab 7)
- Cost tracking charts
- Conversion funnel visualization
- Strategy comparison
- Campaign performance metrics

### Tasks:

1. **Analytics Components** (`components/analytics/`)
   ```typescript
   // cost-chart.tsx
   <CostChart>
     <LineChart
       data={costOverTime}
       xAxis="date"
       yAxis="cost"
       breakdown={["prospecting", "analysis", "outreach"]}
     />
     <Summary>
       <Stat label="Total This Month" value="$127.50" />
       <Stat label="Cost Per Lead" value="$0.12" />
       <Stat label="Avg Quality Score" value="87" />
     </Summary>
   </CostChart>

   // conversion-funnel.tsx
   <ConversionFunnel
     stages={[
       { name: "Prospects", count: 200, cost: "$10" },
       { name: "Analyzed", count: 185, cost: "$18.50" },
       { name: "Grade A/B", count: 94, conversion: "50.8%" },
       { name: "Emails Sent", count: 67, conversion: "71.3%" },
       { name: "Replies", count: 12, conversion: "17.9%" }
     ]}
   />

   // strategy-comparison.tsx
   <StrategyComparison>
     <BarChart
       data={strategyPerformance}
       metric="reply_rate"
       groupBy="strategy"
     />
   </StrategyComparison>

   // campaign-table.tsx
   <CampaignTable
     columns={[
       "campaign", "prospects", "analyzed", "emails_sent",
       "replies", "conversion_rate", "total_cost", "roi"
     ]}
     data={campaigns}
   />
   ```

2. **Analytics Page** (`app/analytics/page.tsx`)
   - Cost tracking over time
   - Conversion funnel
   - Strategy A/B test results
   - Campaign performance table
   - Date range selector

3. **Data Aggregation**
   - Query Supabase for analytics data
   - Calculate conversion rates
   - Aggregate costs by category
   - Strategy performance metrics

4. **Recharts Integration**
   - Line charts for cost over time
   - Funnel charts for conversion
   - Bar charts for strategy comparison
   - Responsive chart sizing

### Deliverables:
- ✅ Cost tracking line chart
- ✅ Conversion funnel visualization
- ✅ Strategy comparison bar chart
- ✅ Campaign performance table
- ✅ Date range filtering
- ✅ Cost breakdown by category
- ✅ ROI calculations

### Success Criteria:
- Cost chart displays accurate data
- Funnel shows conversion at each stage
- Strategy comparison works
- Campaign table shows all projects
- Charts are responsive
- Data updates in real-time

═══════════════════════════════════════════════════════════════════

## PHASE 10: POLISH & TESTING
**Duration**: 3-5 days
**Status**: Not Started
**Depends On**: All previous phases

### Objectives:
- Dark mode support
- Responsive design (tablet/mobile)
- Error handling improvements
- Loading state refinements
- End-to-end testing
- Performance optimization
- Documentation

### Tasks:

1. **Dark Mode**
   - Implement theme toggle
   - Update all components for dark mode
   - Persist theme preference
   - Test all pages in dark mode

2. **Responsive Design**
   - Test on tablet (768px+)
   - Adjust tables for mobile
   - Stack cards on small screens
   - Responsive navigation

3. **Error Handling**
   - Global error boundary
   - API error toasts
   - SSE connection error recovery
   - Form validation errors
   - Network offline handling

4. **Loading States**
   - Skeleton loaders for tables
   - Loading spinners for SSE
   - Optimistic UI updates
   - Suspense boundaries

5. **Testing**
   - Unit tests for utilities
   - Component tests with React Testing Library
   - E2E test for full pipeline flow
   - API integration tests

6. **Performance**
   - Code splitting
   - Lazy loading components
   - Image optimization
   - Bundle size analysis
   - Lighthouse audit

7. **Documentation**
   - README with setup instructions
   - API integration guide
   - Component documentation
   - Deployment guide

### Deliverables:
- ✅ Dark mode fully implemented
- ✅ Responsive on all screen sizes
- ✅ Comprehensive error handling
- ✅ Smooth loading states
- ✅ Test coverage >80%
- ✅ Lighthouse score >90
- ✅ Complete documentation

### Success Criteria:
- Dark mode toggle works everywhere
- UI is usable on tablet
- No unhandled errors in console
- All loading states are smooth
- Tests pass
- Performance is acceptable
- Documentation is complete

═══════════════════════════════════════════════════════════════════

## DEPLOYMENT CHECKLIST

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=
NEXT_PUBLIC_PROSPECTING_API=http://localhost:3010
NEXT_PUBLIC_ANALYSIS_API=http://localhost:3000
NEXT_PUBLIC_OUTREACH_API=http://localhost:3001
```

### Build & Deploy
```bash
npm run build
npm run start
```

### Production Checks
- ✅ All API endpoints accessible
- ✅ Environment variables set
- ✅ Database migrations run
- ✅ SSL certificates valid
- ✅ Error monitoring configured (Sentry)
- ✅ Analytics configured (if needed)

═══════════════════════════════════════════════════════════════════

## SUCCESS METRICS

### Functionality
- ✅ All 7 tabs implemented and working
- ✅ Real-time SSE connections to all 3 engines
- ✅ Complete pipeline flow (prospect → analyze → compose → send)
- ✅ Batch operations functional
- ✅ Filters and search working on all tables

### User Experience
- ✅ No loading delays >2 seconds
- ✅ Error messages are helpful
- ✅ Forms have validation
- ✅ Mobile-friendly (tablet minimum)
- ✅ Dark mode support

### Technical
- ✅ TypeScript strict mode, no errors
- ✅ No console errors in production
- ✅ Lighthouse score >90
- ✅ Bundle size <500KB (gzipped)
- ✅ Test coverage >80%

### Integration
- ✅ All 3 engine APIs integrated
- ✅ Supabase queries optimized
- ✅ SSE connections stable
- ✅ No API timeouts

═══════════════════════════════════════════════════════════════════

## RISK MITIGATION

### Potential Blockers
1. **SSE Connection Issues**
   - Mitigation: Implement reconnection logic with exponential backoff
   - Fallback: Polling mechanism if SSE fails

2. **API Timeouts**
   - Mitigation: Set appropriate timeout values (30s for analysis)
   - Fallback: Show "still processing" message, allow refresh

3. **Large Data Sets**
   - Mitigation: Implement pagination (20 items per page)
   - Fallback: Virtual scrolling for tables

4. **Browser Compatibility**
   - Mitigation: Target modern browsers (last 2 versions)
   - Fallback: Show upgrade message for old browsers

═══════════════════════════════════════════════════════════════════

## NEXT STEPS

1. **Review this plan** - Get approval from team
2. **Set up development environment** - Clone repo, install dependencies
3. **Start Phase 1** - Initialize Next.js project
4. **Daily standups** - Track progress, blockers
5. **Weekly demos** - Show completed phases

═══════════════════════════════════════════════════════════════════
END OF PHASED PLAN
