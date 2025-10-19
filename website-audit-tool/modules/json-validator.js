/**
 * JSON Validation Module
 * Validates and sanitizes AI-generated JSON responses
 * Prevents errors from malformed or incomplete AI outputs
 *
 * Two-layer approach:
 * 1. Rule-based validation (fast, free, catches structure issues)
 * 2. AI quality check (cheap, catches formatting/quality issues)
 */

import { callAI } from '../ai-providers.js';

/**
 * Schema definitions for different response types
 */
const SCHEMAS = {
  /**
   * Website Analysis Response Schema
   * Used in analyzer.js for AI website critiques
   */
  websiteAnalysis: {
    required: ['companyName', 'critiques', 'summary'],
    types: {
      companyName: 'string',
      critiques: 'array',
      summary: 'string'
    },
    arrayMinLength: {
      critiques: 3 // At least 3 critiques required
    },
    description: 'Website analysis critique response'
  },

  /**
   * Grok Extraction Response Schema
   * Used in grok-extractor.js for website data extraction
   */
  grokExtraction: {
    required: ['companyInfo', 'contactInfo', 'socialProfiles', 'teamInfo', 'contentInfo', 'businessIntel'],
    nested: {
      companyInfo: {
        required: [],
        types: {
          name: 'string?',
          foundingYear: 'number?',
          location: 'string?',
          description: 'string?',
          industry: 'string?'
        }
      },
      contactInfo: {
        required: [],
        types: {
          email: 'string?',
          phone: 'string?',
          address: 'string?'
        }
      },
      socialProfiles: {
        required: [],
        types: {
          linkedIn: 'object?',
          instagram: 'object?',
          twitter: 'object?',
          facebook: 'string?',
          youtube: 'string?'
        }
      },
      teamInfo: {
        required: [],
        types: {
          founder: 'object?',
          keyPeople: 'array?'
        }
      },
      contentInfo: {
        required: [],
        types: {
          recentPosts: 'array?',
          hasActiveBlog: 'boolean?',
          lastContentUpdate: 'string?'
        }
      },
      businessIntel: {
        required: [],
        types: {
          services: 'array?',
          targetAudience: 'string?',
          valueProposition: 'string?',
          recentNews: 'array?'
        }
      }
    },
    description: 'Grok data extraction response'
  }
};

/**
 * Validate and sanitize AI-generated JSON
 * @param {string} rawResponse - Raw text response from AI
 * @param {string} schemaName - Schema to validate against (e.g., 'websiteAnalysis', 'grokExtraction')
 * @returns {Object} { isValid: boolean, data: Object|null, errors: Array, warnings: Array }
 */
export function validateJSON(rawResponse, schemaName) {
  const result = {
    isValid: false,
    data: null,
    errors: [],
    warnings: []
  };

  // Step 1: Extract JSON from response (handle markdown code fences)
  let jsonText;
  try {
    jsonText = extractJSON(rawResponse);
    if (!jsonText) {
      result.errors.push('No JSON found in response');
      return result;
    }
  } catch (error) {
    result.errors.push(`Failed to extract JSON: ${error.message}`);
    return result;
  }

  // Step 2: Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    result.errors.push(`Invalid JSON syntax: ${error.message}`);
    result.warnings.push('Raw response: ' + rawResponse.substring(0, 200));
    return result;
  }

  // Step 3: Validate against schema
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    result.errors.push(`Unknown schema: ${schemaName}`);
    result.warnings.push(`Available schemas: ${Object.keys(SCHEMAS).join(', ')}`);
    return result;
  }

  const validationErrors = validateAgainstSchema(parsed, schema);
  if (validationErrors.length > 0) {
    result.errors.push(...validationErrors);
    result.data = parsed; // Still return data for debugging
    return result;
  }

  // Step 4: Success
  result.isValid = true;
  result.data = parsed;
  return result;
}

/**
 * Extract JSON from AI response (handles markdown code fences)
 * @param {string} text - Raw AI response
 * @returns {string} Extracted JSON text
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Response is not a string');
  }

  const trimmed = text.trim();

  // Try to find JSON in markdown code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) {
    return fenceMatch[1];
  }

  // Try to find JSON object directly
  const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Try to parse the whole thing
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  throw new Error('No JSON object found in response');
}

/**
 * Validate parsed object against schema
 * @param {Object} data - Parsed JSON object
 * @param {Object} schema - Schema definition
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateAgainstSchema(data, schema, path = '') {
  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${path}${field}`);
      }
    }
  }

  // Check field types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      const optional = expectedType.endsWith('?');
      const baseType = optional ? expectedType.slice(0, -1) : expectedType;

      if (!(field in data)) {
        if (!optional) {
          errors.push(`Missing field: ${path}${field}`);
        }
        continue;
      }

      const value = data[field];
      const actualType = getType(value);

      if (actualType !== baseType && value !== null) {
        errors.push(`Type mismatch for ${path}${field}: expected ${baseType}, got ${actualType}`);
      }
    }
  }

  // Check array minimum lengths
  if (schema.arrayMinLength) {
    for (const [field, minLength] of Object.entries(schema.arrayMinLength)) {
      if (field in data && Array.isArray(data[field])) {
        if (data[field].length < minLength) {
          errors.push(`Array ${path}${field} has ${data[field].length} items, minimum ${minLength} required`);
        }
      }
    }
  }

  // Validate nested objects
  if (schema.nested) {
    for (const [field, nestedSchema] of Object.entries(schema.nested)) {
      if (field in data && data[field] !== null) {
        const nestedErrors = validateAgainstSchema(data[field], nestedSchema, `${path}${field}.`);
        errors.push(...nestedErrors);
      }
    }
  }

  return errors;
}

/**
 * Get type of value for validation
 * @param {*} value - Value to check
 * @returns {string} Type name
 */
function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

/**
 * Validate AI response and throw descriptive error if invalid
 * @param {string} rawResponse - Raw AI text response
 * @param {string} schemaName - Schema to validate against
 * @param {string} context - Context for error messages (e.g., "Website analysis")
 * @returns {Object} Validated and parsed data
 * @throws {Error} If validation fails
 */
export function validateOrThrow(rawResponse, schemaName, context = 'AI response') {
  const validation = validateJSON(rawResponse, schemaName);

  if (!validation.isValid) {
    const errorMsg = [
      `${context} returned invalid JSON:`,
      ...validation.errors.map(e => `  - ${e}`),
      '',
      'Raw response preview:',
      rawResponse.substring(0, 300) + (rawResponse.length > 300 ? '...' : '')
    ].join('\n');

    throw new Error(errorMsg);
  }

  return validation.data;
}

/**
 * Validate AI response with auto-retry logic
 * @param {Function} aiFn - Async function that calls AI and returns raw text response
 * @param {string} schemaName - Schema to validate against
 * @param {Object} options - Options { maxRetries: 2, context: 'AI call' }
 * @returns {Promise<Object>} Validated and parsed data
 */
export async function validateWithRetry(aiFn, schemaName, options = {}) {
  const maxRetries = options.maxRetries || 2;
  const context = options.context || 'AI response';

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Call AI function
      const rawResponse = await aiFn();

      // Validate response
      const validation = validateJSON(rawResponse, schemaName);

      if (validation.isValid) {
        if (attempt > 1) {
          console.log(`✅ ${context} succeeded on attempt ${attempt}`);
        }
        return validation.data;
      }

      // Invalid response
      if (attempt <= maxRetries) {
        console.warn(`⚠️ ${context} attempt ${attempt} failed validation, retrying...`);
        console.warn(`Errors: ${validation.errors.join(', ')}`);
      } else {
        // Final attempt failed
        throw new Error([
          `${context} failed validation after ${maxRetries + 1} attempts:`,
          ...validation.errors.map(e => `  - ${e}`)
        ].join('\n'));
      }

    } catch (error) {
      if (attempt <= maxRetries) {
        console.warn(`⚠️ ${context} attempt ${attempt} threw error, retrying...`);
        console.warn(`Error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Register a custom schema for validation
 * Useful for plugins or custom use cases
 */
export function registerSchema(name, schema) {
  if (SCHEMAS[name]) {
    console.warn(`⚠️ Overwriting existing schema: ${name}`);
  }
  SCHEMAS[name] = schema;
}

/**
 * Get list of available schemas
 */
export function getAvailableSchemas() {
  return Object.keys(SCHEMAS);
}

/**
 * Pretty-print validation result for debugging
 */
export function formatValidationResult(validation) {
  const lines = [];

  lines.push('=== JSON VALIDATION RESULT ===');
  lines.push(`Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);

  if (validation.errors.length > 0) {
    lines.push('\nErrors:');
    validation.errors.forEach(err => lines.push(`  ❌ ${err}`));
  }

  if (validation.warnings.length > 0) {
    lines.push('\nWarnings:');
    validation.warnings.forEach(warn => lines.push(`  ⚠️ ${warn}`));
  }

  if (validation.data) {
    lines.push('\nData preview:');
    lines.push(JSON.stringify(validation.data, null, 2).substring(0, 500));
  }

  return lines.join('\n');
}

/**
 * AI-powered quality validation (Layer 2)
 * Checks formatting, quality, and fixes common issues
 * Uses cheapest model available (GPT-4o-mini or Claude Haiku)
 *
 * @param {Object} data - Validated data from Layer 1
 * @param {string} schemaName - Schema name for context
 * @param {Object} options - { model: 'gpt-4o-mini', forceCheck: false }
 * @returns {Promise<Object>} { isQualityGood, issues, fixedVersion, cost }
 */
export async function validateQualityWithAI(data, schemaName, options = {}) {
  const model = options.model || 'gpt-4o-mini'; // Default: cheapest OpenAI model
  const schema = SCHEMAS[schemaName];

  if (!schema) {
    throw new Error(`Unknown schema: ${schemaName}`);
  }

  // Quick heuristic checks - only run AI if something looks suspicious
  const suspiciousSignals = detectSuspiciousSignals(data, schemaName);

  if (!options.forceCheck && suspiciousSignals.length === 0) {
    // Looks good, skip AI check
    return {
      isQualityGood: true,
      issues: [],
      fixedVersion: null,
      cost: 0,
      skipped: true
    };
  }

  // Build validation prompt based on schema type
  const prompt = buildQualityCheckPrompt(data, schemaName, schema);

  try {
    const startTime = Date.now();
    const response = await callAI({
      model,
      prompt,
      systemPrompt: 'You are a strict quality validator. Check formatting and data quality. Return ONLY valid JSON.'
    });
    const duration = Date.now() - startTime;

    // Parse AI response
    const aiValidation = validateJSON(response.text, 'qualityCheckResult');

    if (!aiValidation.isValid) {
      console.warn('⚠️ AI quality checker returned invalid JSON, skipping quality check');
      return {
        isQualityGood: true, // Assume original is fine if validator fails
        issues: ['AI quality checker failed'],
        fixedVersion: null,
        cost: 0,
        error: true
      };
    }

    const result = aiValidation.data;

    // Calculate cost (approximate)
    const estimatedInputTokens = JSON.stringify(data).length / 4;
    const estimatedOutputTokens = response.text.length / 4;
    const cost = (estimatedInputTokens / 1_000_000) * 0.15 + (estimatedOutputTokens / 1_000_000) * 0.60;

    return {
      isQualityGood: result.isQualityGood,
      issues: result.issues || [],
      fixedVersion: result.fixedVersion || null,
      cost: cost,
      duration: duration,
      skipped: false
    };

  } catch (error) {
    console.error('AI quality validation failed:', error.message);
    return {
      isQualityGood: true, // Assume original is fine on error
      issues: [`AI validation error: ${error.message}`],
      fixedVersion: null,
      cost: 0,
      error: true
    };
  }
}

/**
 * Register quality check result schema
 */
registerSchema('qualityCheckResult', {
  required: ['isQualityGood', 'issues'],
  types: {
    isQualityGood: 'boolean',
    issues: 'array',
    fixedVersion: 'object?'
  },
  description: 'AI quality check result'
});

/**
 * Detect suspicious signals that warrant AI quality check
 */
function detectSuspiciousSignals(data, schemaName) {
  const signals = [];

  if (schemaName === 'websiteAnalysis') {
    // Check company name
    if (data.companyName) {
      if (data.companyName.length > 60) {
        signals.push('Company name too long');
      }
      if (/\b(top|best|leading|#1|award.?winning)\b/i.test(data.companyName)) {
        signals.push('Company name contains SEO keywords');
      }
    }

    // Check critiques
    if (data.critiques && Array.isArray(data.critiques)) {
      data.critiques.forEach((critique, i) => {
        if (critique.length < 20) {
          signals.push(`Critique ${i + 1} too short (${critique.length} chars)`);
        }
        // Check for technical jargon that should be translated
        const jargon = ['H1', 'SEO', 'CTA', 'USP', 'KPI', 'meta description', 'canonical tag', 'schema markup'];
        const foundJargon = jargon.filter(term => critique.includes(term));
        if (foundJargon.length > 0) {
          signals.push(`Critique ${i + 1} contains jargon: ${foundJargon.join(', ')}`);
        }
      });
    }

    // Check summary
    if (data.summary && data.summary.length < 10) {
      signals.push('Summary too short');
    }
  }

  if (schemaName === 'grokExtraction') {
    // Check company name for Grok extraction
    if (data.companyInfo?.name) {
      if (/\b(top|best|leading|premier|#1)\b/i.test(data.companyInfo.name)) {
        signals.push('Company name contains SEO spam');
      }
    }
  }

  return signals;
}

/**
 * Build quality check prompt based on schema
 */
function buildQualityCheckPrompt(data, schemaName, schema) {
  if (schemaName === 'websiteAnalysis') {
    return `You are a quality validator for website analysis responses. Check this response for formatting and quality issues:

DATA TO VALIDATE:
${JSON.stringify(data, null, 2)}

CHECK FOR:

1. **Company Name Quality**
   - Is it a real company name (not gibberish)?
   - Does it contain SEO spam keywords like "Top", "Best", "Leading", "#1"?
   - Is it reasonable length (not a full sentence)?

2. **Critique Quality** (check each critique)
   - Is it specific and actionable (not generic like "improve design")?
   - Does it use BUSINESS LANGUAGE (not technical jargon like "H1 tag", "meta description", "CTA")?
   - Is it detailed enough (at least 20 characters)?
   - Does it explain business impact (not just technical problems)?

3. **Summary Quality**
   - Is it meaningful and specific (not just "looks good" or "needs work")?
   - Does it match the critiques?

RETURN THIS EXACT JSON FORMAT:
{
  "isQualityGood": true or false,
  "issues": [
    "Issue 1: Company name contains SEO keyword 'Top'",
    "Issue 2: Critique 1 uses technical jargon 'H1 tag'"
  ],
  "fixedVersion": {
    "companyName": "Fixed name here (if needed)",
    "critiques": ["Fixed critique 1", "Fixed critique 2", "Fixed critique 3"],
    "summary": "Fixed summary (if needed)"
  }
}

RULES:
- If quality is good, return isQualityGood: true and empty issues array
- If fixable, include fixedVersion with corrections
- Only fix what's broken, don't change good content
- Be strict about technical jargon in critiques
- Return ONLY the JSON, no explanations`;
  }

  if (schemaName === 'grokExtraction') {
    return `You are a quality validator for data extraction responses. Check for formatting issues:

DATA TO VALIDATE:
${JSON.stringify(data, null, 2)}

CHECK FOR:
1. Company name contains SEO spam ("Top", "Best", "Leading", etc.)
2. Data fields are properly populated (not placeholder text)
3. Email/phone formats are valid

RETURN JSON:
{
  "isQualityGood": true or false,
  "issues": ["List of issues found"],
  "fixedVersion": { ... } // Only if you can fix issues
}

Return ONLY the JSON.`;
  }

  // Generic prompt for other schemas
  return `Validate this JSON data for quality and formatting issues:

${JSON.stringify(data, null, 2)}

Return: { "isQualityGood": boolean, "issues": [], "fixedVersion": null }`;
}
