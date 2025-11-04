# AI Prompt Configuration

This directory contains externalized AI prompt configurations for the Prospecting Engine.

## Overview

Instead of hardcoding prompts in the codebase, all AI interactions are defined in JSON files. This makes it easy to:
- Update prompts without changing code
- A/B test different prompt strategies
- Version control prompt improvements
- See exactly what the AI is being asked to do

## Prompt File Format

Each JSON file follows this schema:

```json
{
  "version": "1.0",
  "name": "prompt-name",
  "description": "What this prompt does",
  "model": "grok-4-fast",
  "temperature": 0.3,
  "systemPrompt": "System instructions for the AI...",
  "userPromptTemplate": "User message with {{variables}}...",
  "variables": ["variable1", "variable2"],
  "schema": {
    "type": "object",
    "properties": { ... }
  }
}
```

### Fields

- **version**: Prompt version for tracking changes
- **name**: Unique identifier for this prompt
- **description**: Human-readable explanation
- **model**: AI model to use (grok-4-fast, grok-4, claude-4-5-haiku, claude-4-5-sonnet, gpt-5, gpt-4o)
- **temperature**: Sampling temperature (0.0-1.0)
  - 0.0-0.3: Deterministic, focused (good for extraction)
  - 0.4-0.7: Balanced (good for analysis)
  - 0.8-1.0: Creative (good for generation)
- **systemPrompt**: System message (sets AI behavior/role)
- **userPromptTemplate**: User message with `{{variable}}` placeholders
- **variables**: List of required variables for this prompt
- **schema** (optional): JSON schema for structured output

## Available Prompts

### 01-query-understanding.json
**Purpose**: Converts ICP brief into optimized Google Maps search query
**Model**: grok-4-fast
**Variables**: `industry`, `city`, `target_description`
**Output**: Search query string

### 04-website-extraction.json
**Purpose**: Extracts company data from website screenshots using AI vision
**Model**: grok-4-fast
**Variables**: `company_name`, `industry`, `screenshot_path`
**Output**: Structured JSON with contact info, services, description

### 07-relevance-check.json
**Purpose**: Scores prospects against ICP criteria (0-100)
**Model**: grok-4-fast
**Variables**: `brief`, `prospect_data`
**Output**: Match score and reasoning

## Usage in Code

Load prompts using the shared prompt loader:

```javascript
import { loadPrompt } from './shared/prompt-loader.js';

// Load the prompt with variables
const prompt = loadPrompt('01-query-understanding', {
  industry: 'restaurants',
  city: 'Philadelphia, PA',
  target_description: 'Italian restaurants with 4+ stars'
});

// Use with AI client
const result = await aiClient.generate(prompt);
```

The `loadPrompt` function:
1. Reads the JSON file
2. Validates required variables are provided
3. Replaces `{{placeholders}}` with actual values
4. Returns ready-to-use prompt

## Best Practices

### Writing Effective Prompts

1. **Be specific**: Clear instructions produce better results
2. **Use examples**: Show the AI what you want
3. **Define output format**: Include JSON schemas for structured data
4. **Set appropriate temperature**: Lower for facts, higher for creativity
5. **Test thoroughly**: Try edge cases and unusual inputs

### Prompt Engineering Tips

- Start with the goal: "You are an expert at X..."
- Provide context: Industry knowledge, constraints, requirements
- Use structured output: Always include JSON schema for parsing
- Handle errors: Tell the AI what to do if data is missing
- Be explicit: Don't assume the AI knows your domain

### Version Control

When updating prompts:
1. Increment the `version` field
2. Test changes thoroughly
3. Document what changed and why
4. Consider keeping old versions for rollback

## Testing Prompts

Test prompts in isolation:

```bash
# Test query understanding
node tests/dev/test-model-selection.js

# Test full pipeline with prompts
node tests/integration/test-phase-4-intelligence.js
```

## Cost Tracking

Different models have different costs:
- **grok-4-fast**: ~$0.01 per 1K tokens (fastest, cheapest)
- **grok-beta**: ~$0.02 per 1K tokens (more capable)
- **GPT-4o**: ~$0.03 per 1K tokens (vision + text)
- **Claude Sonnet**: ~$0.015 per 1K tokens (balanced)

Monitor costs with the built-in cost tracker in `shared/cost-tracker.js`.

## Troubleshooting

### Prompt not found
- Check filename matches what you're loading
- Ensure file is valid JSON (use a JSON validator)

### Variables not replacing
- Verify variable names match exactly (case-sensitive)
- Check that all required variables are provided

### Inconsistent output format
- Add explicit JSON schema to `schema` field
- Include output example in system prompt
- Lower temperature for more consistent results

### Rate limits
- Implemented in `shared/rate-limiter.js`
- Adjust delays between requests if needed

---

For more information, see the main [README.md](../../README.md) and [docs/](../../docs/).