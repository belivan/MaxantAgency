/**
 * Test JSON Validator Module
 * Tests validation logic with various AI response formats
 */

import { validateJSON, formatValidationResult, validateOrThrow } from './modules/json-validator.js';

console.log('🧪 Testing JSON Validator Module\n');

// Test 1: Valid website analysis response
console.log('TEST 1: Valid website analysis response');
console.log('='.repeat(60));
const validResponse = `{
  "companyName": "Test Company",
  "critiques": [
    "Page load time is 5 seconds - visitors expect 2-3 seconds",
    "Your headline doesn't explain what makes you different",
    "Phone number isn't tappable on mobile devices"
  ],
  "summary": "The site has a solid foundation but needs performance and mobile improvements"
}`;

const test1 = validateJSON(validResponse, 'websiteAnalysis');
console.log(formatValidationResult(test1));
console.log('\n');

// Test 2: Valid response wrapped in markdown code fence
console.log('TEST 2: Valid response with markdown code fence');
console.log('='.repeat(60));
const markdownResponse = `Here's the analysis:

\`\`\`json
{
  "companyName": "Test Company",
  "critiques": [
    "First critique",
    "Second critique",
    "Third critique"
  ],
  "summary": "Overall summary"
}
\`\`\`

Hope this helps!`;

const test2 = validateJSON(markdownResponse, 'websiteAnalysis');
console.log(formatValidationResult(test2));
console.log('\n');

// Test 3: Missing required field
console.log('TEST 3: Missing required field (summary)');
console.log('='.repeat(60));
const missingFieldResponse = `{
  "companyName": "Test Company",
  "critiques": ["One", "Two", "Three"]
}`;

const test3 = validateJSON(missingFieldResponse, 'websiteAnalysis');
console.log(formatValidationResult(test3));
console.log('\n');

// Test 4: Wrong type (critiques should be array)
console.log('TEST 4: Wrong type (critiques as string instead of array)');
console.log('='.repeat(60));
const wrongTypeResponse = `{
  "companyName": "Test Company",
  "critiques": "This should be an array",
  "summary": "Summary text"
}`;

const test4 = validateJSON(wrongTypeResponse, 'websiteAnalysis');
console.log(formatValidationResult(test4));
console.log('\n');

// Test 5: Not enough critiques
console.log('TEST 5: Array too short (only 2 critiques, need 3)');
console.log('='.repeat(60));
const shortArrayResponse = `{
  "companyName": "Test Company",
  "critiques": ["One", "Two"],
  "summary": "Summary"
}`;

const test5 = validateJSON(shortArrayResponse, 'websiteAnalysis');
console.log(formatValidationResult(test5));
console.log('\n');

// Test 6: Invalid JSON syntax
console.log('TEST 6: Invalid JSON syntax');
console.log('='.repeat(60));
const invalidJSONResponse = `{
  "companyName": "Test Company",
  "critiques": ["One", "Two", "Three"],
  "summary": "Summary"  <-- missing closing brace`;

const test6 = validateJSON(invalidJSONResponse, 'websiteAnalysis');
console.log(formatValidationResult(test6));
console.log('\n');

// Test 7: Grok extraction response (complex nested structure)
console.log('TEST 7: Valid Grok extraction response');
console.log('='.repeat(60));
const grokResponse = `{
  "companyInfo": {
    "name": "Acme Corp",
    "industry": "Web Design",
    "location": "Philadelphia, PA"
  },
  "contactInfo": {
    "email": "info@acme.com",
    "phone": "215-555-1234"
  },
  "socialProfiles": {
    "linkedIn": {
      "company": "https://linkedin.com/company/acme"
    },
    "instagram": null
  },
  "teamInfo": {
    "founder": {
      "name": "John Doe"
    },
    "keyPeople": []
  },
  "contentInfo": {
    "recentPosts": [],
    "hasActiveBlog": false
  },
  "businessIntel": {
    "services": ["Web Design", "SEO"],
    "valueProposition": "Fast, affordable websites"
  }
}`;

const test7 = validateJSON(grokResponse, 'grokExtraction');
console.log(formatValidationResult(test7));
console.log('\n');

// Test 8: validateOrThrow (should throw)
console.log('TEST 8: validateOrThrow with invalid response (should throw)');
console.log('='.repeat(60));
try {
  validateOrThrow(missingFieldResponse, 'websiteAnalysis', 'Test analysis');
  console.log('❌ Should have thrown an error!');
} catch (error) {
  console.log('✅ Correctly threw an error:');
  console.log(error.message);
}
console.log('\n');

// Test 9: validateOrThrow with valid response (should succeed)
console.log('TEST 9: validateOrThrow with valid response (should succeed)');
console.log('='.repeat(60));
try {
  const data = validateOrThrow(validResponse, 'websiteAnalysis', 'Test analysis');
  console.log('✅ Validation succeeded!');
  console.log('Extracted data:', JSON.stringify(data, null, 2));
} catch (error) {
  console.log('❌ Should not have thrown:', error.message);
}
console.log('\n');

// Summary
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
const results = [test1, test2, test3, test4, test5, test6, test7];
const passed = results.filter(r => r.isValid).length;
const failed = results.filter(r => !r.isValid).length;

console.log(`Total tests: ${results.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed (expected): ${failed} ❌`);
console.log(`\nExpected failures: Tests 3, 4, 5, 6 should fail validation`);
console.log(`Expected passes: Tests 1, 2, 7 should pass validation`);
console.log('\n✅ JSON Validator test complete!');
