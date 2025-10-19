# Client Orchestrator

Generates prospect lists from your studio brief, verifies real websites, optionally syncs them to Supabase, and (when requested) runs the full website analyzer on those URLs.

## Capabilities
- Builds targeted prompts from your ICP + offer brief
- Asks the LLM for industries, real companies, and a one-line “why now” hook
- Infers missing domains, normalizes URLs, and optionally verifies they load
- Saves verified prospects to disk and/or Supabase (`prospects` table)
- Can immediately call `website-audit-tool/analyzer` in batches (≤10)

## Quick Start
1. Ensure `website-audit-tool` is configured (API keys, `npm install`, `npx playwright install`)
2. Copy `brief.example.json` → `brief.json` and edit to fit your studio
3. Install dependencies:
   ```bash
   cd client-orchestrator
   npm install
   ```
4. Generate prospects only:
   ```bash
   node index.js --brief brief.json --out prospects.json --no-run
   ```
5. Generate + analyze immediately:
   ```bash
   node index.js --brief brief.json --out prospects.json --run --tier tier1 --email-type local
   ```

## CLI Options
- `--brief <path>` Path to brief JSON (required)
- `--out <path>` Write prospects JSON (default `prospects.json`)
- `--count <n>` Number of companies to request (default 20)
- `--city <name>` Bias LLM results toward a city/region
- `--verify` / `--no-verify` Toggle HTTP HEAD verification (default on)
- `--model <name>` LLM for prospecting (default `gpt-4o-mini`)
- `--run` Trigger analyzer after generation
- `--tier <tier1|tier2|tier3>` Analyzer depth tier (default `tier1`)
- `--email-type <local|national>` Forwarded to analyzer templates (default `local`)
- `--batch <1-10>` Websites per analyzer batch (default 10)
- `--save-supabase` Force Supabase sync
- `--no-supabase` Skip Supabase sync even if credentials exist
- `--prospect-status <status>` Status stored in Supabase (default `pending_analysis`)

## Supabase Integration
- If `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are present (shared from `website-audit-tool/.env`), verified URLs are upserted into the `prospects` table with metadata: run ID, city, brief snapshot, source
- Status values: `pending_analysis`, `queued`, `analyzed`, `error`
- Helper functions live in `supabase.js` (also used by the Command Center)

## File Layout
- `index.js` – exported `runProspector` helper + CLI entrypoint
- `llm.js` – OpenAI JSON-completion wrapper
- `prompts.js` – prompt builders aligned to the outreach playbook
- `supabase.js` – shared Supabase helpers for prospects
- `brief.example.json` – template brief

## Brief Schema
- `studio`: name, intro, offer, price points, strengths, reference links
- `icp`: niches, company size, buyer roles, triggers, exclusions
- `geo`: optional city + radius
- `seeds`: optional seed URLs (always included)
- `notes`: extra guidance

## Tips & Guardrails
- LLM output can be imperfect—keep verification on unless you have trusted lists
- Domain inference runs automatically if the LLM omits websites
- Seeds from the brief are merged with LLM results before verification
- Missing Supabase credentials just log a warning; the CLI still writes locally
- Analyzer imports (`website-audit-tool/analyzer.js`) expect the audit tool’s dependencies to be installed

