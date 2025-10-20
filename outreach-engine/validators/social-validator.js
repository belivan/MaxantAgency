/**
 * SOCIAL MEDIA VALIDATOR - Validate social DMs using platform-specific rules
 *
 * Validates against:
 * - Platform character limits
 * - Banned words per platform
 * - Tone requirements
 * - URL restrictions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load validation rules
const rulesPath = join(__dirname, '..', 'config', 'validation', 'social-quality.json');
const RULES = JSON.parse(readFileSync(rulesPath, 'utf-8'));

/**
 * Validate social media DM
 * @param {object} dm - DM object {message, platform}
 * @returns {object} Validation result
 */
export function validateSocialDM(dm) {
  const { message, platform } = dm;

  // Validate platform
  if (!RULES.platforms[platform]) {
    throw new Error(`Unknown platform: ${platform}. Must be one of: ${Object.keys(RULES.platforms).join(', ')}`);
  }

  const platformRules = RULES.platforms[platform];

  const charCheck = checkCharacterLimit(message, platformRules);
  const bannedCheck = checkBannedWords(message, platformRules);
  const urlCheck = checkUrls(message, platformRules);
  const toneCheck = checkTone(message, platformRules);
  const lengthCheck = checkOptimalLength(message, platformRules);

  // Calculate score
  let score = 100;
  const issues = [];

  // Apply penalties
  if (!charCheck.valid) {
    score += charCheck.penalty;
    issues.push(...charCheck.issues);
  }

  if (!bannedCheck.valid) {
    score += bannedCheck.penalty;
    issues.push(...bannedCheck.issues);
  }

  if (!urlCheck.valid) {
    score += urlCheck.penalty;
    issues.push(...urlCheck.issues);
  }

  if (!toneCheck.valid) {
    score += toneCheck.penalty;
    issues.push(...toneCheck.issues);
  }

  if (!lengthCheck.optimal) {
    score += lengthCheck.penalty;
    issues.push(...lengthCheck.issues);
  }

  score = Math.max(0, score);

  return {
    valid: score >= RULES.thresholds.acceptable,
    score: Math.round(score),
    issues,
    breakdown: {
      characters: charCheck,
      bannedWords: bannedCheck,
      urls: urlCheck,
      tone: toneCheck,
      length: lengthCheck
    },
    platform,
    threshold: RULES.thresholds.acceptable,
    rating: getScoreRating(score)
  };
}

/**
 * Check character limit
 * @param {string} message - Message text
 * @param {object} rules - Platform rules
 * @returns {object} Check result
 */
function checkCharacterLimit(message, rules) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!rules || typeof rules !== 'object') {
    throw new Error('Rules must be an object');
  }

  try {
    const length = message.length;
    const maxChars = rules.maxChars;

    if (length > maxChars) {
      return {
        valid: false,
        length,
        maxChars,
        penalty: -50,
        issues: [{
          severity: 'critical',
          issue: `Message exceeds character limit (${length}/${maxChars})`,
          value: length
        }]
      };
    }

    return {
      valid: true,
      length,
      maxChars,
      penalty: 0,
      issues: []
    };
  } catch (error) {
    throw new Error(`Failed to check character limit: ${error.message}`);
  }
}

/**
 * Check for banned words
 * @param {string} message - Message text
 * @param {object} rules - Platform rules
 * @returns {object} Check result
 */
function checkBannedWords(message, rules) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!rules || typeof rules !== 'object') {
    throw new Error('Rules must be an object');
  }

  try {
    const messageLower = message.toLowerCase();
    const found = [];

    for (const word of rules.bannedWords || []) {
      if (messageLower.includes(word.toLowerCase())) {
        found.push(word);
      }
    }

    if (found.length > 0) {
      return {
        valid: false,
        found,
        penalty: -30,
        issues: [{
          severity: 'error',
          issue: `Contains banned words: ${found.join(', ')}`,
          value: found
        }]
      };
    }

    return {
      valid: true,
      found: [],
      penalty: 0,
      issues: []
    };
  } catch (error) {
    throw new Error(`Failed to check banned words: ${error.message}`);
  }
}

/**
 * Check for URLs
 * @param {string} message - Message text
 * @param {object} rules - Platform rules
 * @returns {object} Check result
 */
function checkUrls(message, rules) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!rules || typeof rules !== 'object') {
    throw new Error('Rules must be an object');
  }

  try {
    const issues = [];
    let penalty = 0;

    // Check for banned patterns (URLs)
    const bannedPatterns = rules.bannedPatterns || [];
    const foundPatterns = [];

    for (const pattern of bannedPatterns) {
      if (message.includes(pattern)) {
        foundPatterns.push(pattern);
        penalty += -25;
      }
    }

    if (foundPatterns.length > 0) {
      issues.push({
        severity: 'critical',
        issue: `Contains banned patterns (URLs): ${foundPatterns.join(', ')}`,
        value: foundPatterns
      });
    }

    return {
      valid: issues.length === 0,
      foundPatterns,
      penalty,
      issues
    };
  } catch (error) {
    throw new Error(`Failed to check URLs: ${error.message}`);
  }
}

/**
 * Check tone appropriateness
 * @param {string} message - Message text
 * @param {object} rules - Platform rules
 * @returns {object} Check result
 */
function checkTone(message, rules) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!rules || typeof rules !== 'object') {
    throw new Error('Rules must be an object');
  }

  try {
    const requiredTone = rules.requiredTone;
    const messageLower = message.toLowerCase();

    const toneIndicators = RULES.tone_detection[requiredTone];
    if (!toneIndicators) {
      return { valid: true, penalty: 0, issues: [] };
    }

    // Check for indicators
    const hasIndicators = toneIndicators.indicators.some(word =>
      messageLower.includes(word.toLowerCase())
    );

    // Check for avoid words
    const hasAvoid = toneIndicators.avoid.some(word =>
      messageLower.includes(word.toLowerCase())
    );

    const issues = [];
    let penalty = 0;

    if (!hasIndicators) {
      issues.push({
        severity: 'warning',
        issue: `Message may not match ${requiredTone} tone`,
        value: { expected: toneIndicators.indicators }
      });
      penalty += -10;
    }

    if (hasAvoid) {
      const foundAvoid = toneIndicators.avoid.filter(word =>
        messageLower.includes(word.toLowerCase())
      );
      issues.push({
        severity: 'warning',
        issue: `Contains inappropriate words for ${requiredTone} tone: ${foundAvoid.join(', ')}`,
        value: foundAvoid
      });
      penalty += -15;
    }

    return {
      valid: issues.length === 0,
      requiredTone,
      hasIndicators,
      hasAvoid,
      penalty,
      issues
    };
  } catch (error) {
    throw new Error(`Failed to check tone: ${error.message}`);
  }
}

/**
 * Check optimal length
 * @param {string} message - Message text
 * @param {object} rules - Platform rules
 * @returns {object} Check result
 */
function checkOptimalLength(message, rules) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!rules || typeof rules !== 'object') {
    throw new Error('Rules must be an object');
  }

  try {
    const length = message.length;
    const optimal = rules.optimalLength;

    if (!optimal) {
      return { optimal: true, penalty: 0, issues: [] };
    }

    const [min, max] = optimal;
    const issues = [];
    let penalty = 0;

    if (length < min) {
      issues.push({
        severity: 'info',
        issue: `Message shorter than optimal (${length} < ${min} chars)`,
        value: length
      });
      penalty += -5;
    } else if (length > max) {
      issues.push({
        severity: 'info',
        issue: `Message longer than optimal (${length} > ${max} chars)`,
        value: length
      });
      penalty += -10;
    }

    return {
      optimal: length >= min && length <= max,
      length,
      optimalRange: optimal,
      penalty,
      issues
    };
  } catch (error) {
    throw new Error(`Failed to check optimal length: ${error.message}`);
  }
}

/**
 * Get rating based on score
 * @param {number} score - Score (0-100)
 * @returns {string} Rating
 */
function getScoreRating(score) {
  if (score >= RULES.thresholds.excellent) return 'excellent';
  if (score >= RULES.thresholds.good) return 'good';
  if (score >= RULES.thresholds.acceptable) return 'acceptable';
  if (score >= RULES.thresholds.needsReview) return 'needs review';
  return 'poor';
}

/**
 * Validate multiple DM variants
 * @param {array} variants - Array of DM objects
 * @param {string} platform - Platform name
 * @returns {object} Validation results
 */
export function validateSocialVariants(variants, platform) {
  if (!variants || !Array.isArray(variants)) {
    throw new Error('Variants must be an array');
  }
  if (!platform || typeof platform !== 'string') {
    throw new Error('Platform must be a string');
  }

  try {
    const results = variants.map(variant =>
      validateSocialDM({ message: variant, platform })
    );

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const allValid = results.every(r => r.valid);

    return {
      variants: results,
      summary: {
        allValid,
        averageScore: Math.round(avgScore),
        count: results.length,
        platform
      }
    };
  } catch (error) {
    throw new Error(`Failed to validate social variants: ${error.message}`);
  }
}
