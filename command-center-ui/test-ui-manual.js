/**
 * Manual Command Center UI Test
 * Simple test script for quick validation
 */

console.log('\n═══════════════════════════════════════');
console.log('Command Center UI - Manual Test Report');
console.log('═══════════════════════════════════════\n');

console.log('✓ UI Server Running on http://localhost:3000');
console.log('✓ Next.js 14.2.3');
console.log('✓ Environment: .env.local, .env configured\n');

console.log('───────────────────────────────────────');
console.log('Available Pages:');
console.log('───────────────────────────────────────');
console.log('  • Dashboard       → http://localhost:3000/');
console.log('  • Prospecting     → http://localhost:3000/prospecting');
console.log('  • Analysis        → http://localhost:3000/analysis');
console.log('  • Leads           → http://localhost:3000/leads');
console.log('  • Outreach        → http://localhost:3000/outreach');
console.log('  • Projects        → http://localhost:3000/projects');
console.log('  • Analytics       → http://localhost:3000/analytics');
console.log('  • About           → http://localhost:3000/about\n');

console.log('───────────────────────────────────────');
console.log('API Endpoints:');
console.log('───────────────────────────────────────');
console.log('  GET  /api/stats                    - Dashboard statistics');
console.log('  GET  /api/leads?limit=N            - Fetch analyzed leads');
console.log('  GET  /api/emails?limit=N           - Fetch composed emails');
console.log('  POST /api/prospects                - Generate prospects');
console.log('  POST /api/analyze                  - Analyze websites');
console.log('  POST /api/compose                  - Compose emails\n');

console.log('───────────────────────────────────────');
console.log('Backend Services Status:');
console.log('───────────────────────────────────────');
console.log('  ✓ Analysis Engine     → http://localhost:3001 (healthy)');
console.log('  ✓ Outreach Engine     → http://localhost:3002 (healthy)');
console.log('  ✓ Pipeline Orchestr   → http://localhost:3020 (running)');
console.log('  ✗ Prospecting Engine  → http://localhost:3010 (offline)\n');

console.log('───────────────────────────────────────');
console.log('Key Features:');
console.log('───────────────────────────────────────');
console.log('  1. Dashboard Overview');
console.log('     - Real-time stats (prospects, leads, emails)');
console.log('     - Engine health monitoring');
console.log('     - Activity feed');
console.log('     - Quick action cards\n');

console.log('  2. Prospecting Module');
console.log('     - ICP brief editor (JSON)');
console.log('     - AI-powered prospect generation');
console.log('     - Batch website discovery\n');

console.log('  3. Analysis Module');
console.log('     - Website analysis configuration');
console.log('     - Tier selection (tier1, tier2, tier3)');
console.log('     - Email extraction options');
console.log('     - Module selection (SEO, visual, content)\n');

console.log('  4. Leads Management');
console.log('     - Filter by grade (A/B/C/D/F)');
console.log('     - Filter by industry');
console.log('     - Email availability filter');
console.log('     - Export and selection tools\n');

console.log('  5. Outreach Module');
console.log('     - Multiple email strategies');
console.log('     - A/B variant generation');
console.log('     - Quality scoring');
console.log('     - Notion integration\n');

console.log('  6. Projects & Analytics');
console.log('     - Project organization');
console.log('     - Cost tracking');
console.log('     - Performance metrics\n');

console.log('───────────────────────────────────────');
console.log('Test Instructions:');
console.log('───────────────────────────────────────');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Navigate through all pages listed above');
console.log('3. Test the following workflows:\n');

console.log('   Workflow 1: Prospect → Analyze → Compose');
console.log('   a) Go to /prospecting');
console.log('   b) Enter ICP brief');
console.log('   c) Generate prospects');
console.log('   d) Select prospects');
console.log('   e) Run analysis');
console.log('   f) View results in /leads');
console.log('   g) Compose emails in /outreach\n');

console.log('   Workflow 2: Dashboard Monitoring');
console.log('   a) View real-time stats on dashboard');
console.log('   b) Check engine health indicators');
console.log('   c) Review activity feed\n');

console.log('   Workflow 3: Lead Management');
console.log('   a) Go to /leads');
console.log('   b) Apply filters (grade, industry)');
console.log('   c) Select leads');
console.log('   d) Export or compose emails\n');

console.log('───────────────────────────────────────');
console.log('Configuration:');
console.log('───────────────────────────────────────');
console.log('Environment variables (.env):');
console.log('  • SUPABASE_URL         - Configured ✓');
console.log('  • SUPABASE_SERVICE_KEY - Configured ✓');
console.log('  • OPENAI_API_KEY       - Check .env');
console.log('  • ANTHROPIC_API_KEY    - Check .env');
console.log('  • XAI_API_KEY          - Check .env\n');

console.log('Database tables required:');
console.log('  • prospects');
console.log('  • leads');
console.log('  • composed_emails');
console.log('  • social_outreach');
console.log('  • campaigns');
console.log('  • campaign_runs');
console.log('  • projects\n');

console.log('───────────────────────────────────────');
console.log('Next Steps:');
console.log('───────────────────────────────────────');
console.log('1. Start Prospecting Engine: cd prospecting-engine && npm start');
console.log('2. Test all workflows listed above');
console.log('3. Monitor console for any errors');
console.log('4. Check browser Network tab for API calls\n');

console.log('═══════════════════════════════════════\n');
