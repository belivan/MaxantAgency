# Client Orchestrator

A companion app that: 1) uses an LLM to generate and vet a list of real companies and websites from your brief (ICP + studio intro), and 2) calls `website-audit-tool` to analyze them in batches.

## What it does
- Takes a brief (who you help, offer, strengths, geo) as input
- Uses prompts based on your ChatGPT playbook to propose niches, companies, and one‑line why now
- Normalizes to website URLs and optionally verifies they load
- Batches up to 10 URLs and calls `analyzeWebsites` from `website-audit-tool`
- Saves prospect list and analysis results metadata

## Quick start
1) Ensure `website-audit-tool` runs (env keys, npm install, playwright)
2) Put your API keys in `website-audit-tool/.env` (reused here)
3) Install deps for orchestrator:
   - From repo root:
     - `cd client-orchestrator`
     - `npm install`
4) Create your brief (copy and edit):
   - `cp brief.example.json brief.json`
5) Run prospect generation only:
   - `node index.js --brief brief.json --out prospects.json --no-run`
6) Run full pipeline (generate + analyze via analyzer):
   - `node index.js --brief brief.json --out prospects.json --run --tier tier1 --email-type local`

## CLI options
- `--brief <path>` Path to brief JSON (required)
- `--out <path>` Output file for prospects (default: `prospects.json`)
- `--count <n>` Target companies (default: 20)
- `--city <name>` City/region hint to bias local results
- `--verify` Verify URLs with HTTP HEAD (default: true)
- `--no-verify` Disable URL verification
- `--run` After generating prospects, run the website analyzer
- `--tier <tier1|tier2|tier3>` Depth tier passed to analyzer (default: tier1)
- `--email-type <local|national>` Template type for analyzer (default: local)
- `--batch <n>` Batch size per analyzer call (max 10; default 10)
- `--model <name>` LLM for prospecting (default: `gpt-4o-mini`)

## Brief format
See `brief.example.json`. Fields:
- `studio`: who you are, offer, pricing, strengths, samples/links
- `icp`: industries, sizes, locations, triggers, exclusions
- `geo`: optional locality targeting (city, radius)
- `notes`: any extra guidance

## How it integrates
- Imports `analyzeWebsites(urls, options, onProgress)` from `../website-audit-tool/analyzer.js`
- Loads env from both `client-orchestrator/.env` (optional) and `website-audit-tool/.env` (primary)
- Respects analyzer limits (<= 10 URLs per batch)

## Files
- `index.js` orchestrates: parse brief, LLM prospecting, URL verify, batching, analyzer calls
- `llm.js` wraps OpenAI client
- `prompts.js` structured prompts aligned to your playbook
- `brief.example.json` template input

## Notes & guardrails
- LLM‑sourced companies can be imperfect; optional URL verify prunes dead links
- When a website is missing, we ask the LLM to infer the likely domain; still verified if `--verify`
- You can also feed your own seed list by adding `seeds` to the brief (array of URLs); seeds are always included

## Troubleshooting
- If analyzer can’t find API keys, ensure they are in `website-audit-tool/.env`
- If Playwright errors occur, run `npx playwright install` inside `website-audit-tool`
- If batches exceed 10, reduce `--batch` or let the default 10 apply

