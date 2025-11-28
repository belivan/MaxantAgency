# Archived Report Synthesis Prompts

These prompts have been archived because report synthesis functionality has been moved to the **Report Engine** microservice.

## Why These Are Archived

1. **Architecture Change**: The Analysis Engine now focuses solely on website analysis, grading, and data extraction. Report synthesis (consolidating issues, generating executive summaries) now happens in the Report Engine during report generation.

2. **Not Referenced**: These prompt files were never loaded by the Analysis Engine's `issue-deduplication-service.js`, which uses hardcoded prompts instead.

3. **Active Versions Exist**: The Report Engine maintains its own versions of these prompts with enhancements (better screenshot reference handling).

## Active Versions

The current, actively-used versions of these prompts are located in:

- `report-engine/config/prompts/report-synthesis/issue-deduplication.json`
- `report-engine/config/prompts/report-synthesis/executive-insights-generator.json`

## Analysis Engine Deduplication

The Analysis Engine still performs issue deduplication via `services/issue-deduplication-service.js`, but this service uses **hardcoded prompts** (lines 188-264 in that file), not these JSON files.

## Migration Date

Archived: 2025-11-27

## Reference

See comments in `analysis-engine/services/results-aggregator.js` (lines 21-23) for migration notes.
