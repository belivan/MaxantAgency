/**
 * EMAIL VALIDATOR - Validate email quality using config rules
 *
 * Uses email-quality.json rules to validate:
 * - Subject line length (50-70 chars optimal)
 * - Body length (<200 words)
 * - Spam phrases
 * - Placeholders
 * - Tone and personalization
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load validation rules
const rulesPath = join(__dirname, '..', 'config', 'validation', 'email-quality.json');
const RULES = JSON.parse(readFileSync(rulesPath, 'utf-8'));

// Load spam phrases
const spamPath = join(__dirname, '..', 'config', 'validation', 'spam-phrases.json');
const SPAM_RULES = JSON.parse(readFileSync(spamPath, 'utf-8'));

/**
 * Validate complete email (subject + body)
 * @param {object} email - Email object {subject, body}
 * @returns {object} Validation result with score
 */
export function validateEmail(email) {
  try {
    // Validate input
    if (!email) {
      throw new Error('Email object is required');
    }
    if (typeof email !== 'object') {
      throw new Error('Email must be an object');
    }

    const { subject, body } = email;

    // Validate required fields
    if (!subject) {
      throw new Error('Email subject is required');
    }
    if (!body) {
      throw new Error('Email body is required');
    }
    if (typeof subject !== 'string') {
      throw new Error('Subject must be a string');
    }
    if (typeof body !== 'string') {
      throw new Error('Body must be a string');
    }

    const subjectValidation = validateSubject(subject);
    const bodyValidation = validateBody(body);
    const placeholderCheck = checkPlaceholders(subject + ' ' + body);
    const spamCheck = checkSpam(subject, body);

    // Calculate overall score
    let score = 100;
    const issues = [];

    // Apply subject penalties
    if (!subjectValidation.isValid) {
      score += subjectValidation.penalty;
      issues.push(...subjectValidation.issues);
    }

    // Apply body penalties
    if (!bodyValidation.isValid) {
      score += bodyValidation.penalty;
      issues.push(...bodyValidation.issues);
    }

    // Apply placeholder penalty (CRITICAL - hard fail)
    if (placeholderCheck.found) {
      score += RULES.penalties.unfilled_placeholder;
      issues.push(...placeholderCheck.issues);
      // Force fail - placeholders are unacceptable
      score = Math.min(score, RULES.thresholds.acceptable - 1);
    }

    // Apply spam penalties
    if (spamCheck.found) {
      score += spamCheck.penalty;
      issues.push(...spamCheck.issues);
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      isValid: score >= RULES.thresholds.acceptable,
      score: Math.round(score),
      issues,
      breakdown: {
        subject: subjectValidation,
        body: bodyValidation,
        placeholders: placeholderCheck,
        spam: spamCheck
      },
      threshold: RULES.thresholds.acceptable,
      rating: getScoreRating(score)
    };
  } catch (error) {
    throw new Error(`Email validation failed: ${error.message}`);
  }
}

/**
 * Validate subject line
 * @param {string} subject - Subject line
 * @returns {object} Validation result
 */
export function validateSubject(subject) {
  try {
    if (!subject || typeof subject !== 'string') {
      throw new Error('Subject must be a non-empty string');
    }

    const issues = [];
    let penalty = 0;

    const length = subject.length;

    // Check length
    if (length < RULES.rules.subject.minLength) {
      issues.push({
        severity: 'warning',
        issue: `Subject too short (${length} chars, min: ${RULES.rules.subject.minLength})`,
        value: length
      });
      penalty += RULES.penalties.too_short;
    } else if (length > RULES.rules.subject.maxLength) {
      issues.push({
        severity: 'warning',
        issue: `Subject too long (${length} chars, max: ${RULES.rules.subject.maxLength})`,
        value: length
      });
      penalty += RULES.penalties.too_long;
    }

    // Check optimal length (61-70 chars)
    const [optMin, optMax] = RULES.rules.subject.optimalLength;
    const isOptimal = length >= optMin && length <= optMax;

    // Check for banned phrases
    const bannedFound = [];
    for (const phrase of RULES.rules.subject.bannedPhrases) {
      if (subject.toLowerCase().includes(phrase.toLowerCase())) {
        bannedFound.push(phrase);
        penalty += RULES.penalties.banned_phrase_subject;
      }
    }

    if (bannedFound.length > 0) {
      issues.push({
        severity: 'error',
        issue: `Contains banned phrases: ${bannedFound.join(', ')}`,
        value: bannedFound
      });
    }

    // Check lowercase requirement
    if (RULES.rules.subject.requiredLowercase) {
      if (subject !== subject.toLowerCase() && subject !== subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase()) {
        // Allow first letter capitalized
        const capsWords = subject.split(' ').filter(word => word === word.toUpperCase() && word.length > 1);
        if (capsWords.length > 0) {
          issues.push({
            severity: 'warning',
            issue: 'Subject should be lowercase for conversational tone',
            value: capsWords
          });
          penalty += 5;
        }
      }
    }

    // Check exclamation marks
    const exclamations = (subject.match(/!/g) || []).length;
    if (exclamations > RULES.rules.subject.maxExclamations) {
      issues.push({
        severity: 'warning',
        issue: `Too many exclamation marks (${exclamations})`,
        value: exclamations
      });
      penalty += RULES.penalties.excessive_exclamations;
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      length,
      isOptimal,
      issues,
      penalty
    };
  } catch (error) {
    throw new Error(`Subject validation failed: ${error.message}`);
  }
}

/**
 * Validate body
 * @param {string} body - Email body
 * @returns {object} Validation result
 */
export function validateBody(body) {
  try {
    if (!body || typeof body !== 'string') {
      throw new Error('Body must be a non-empty string');
    }

    const issues = [];
    let penalty = 0;

    // Count words and sentences
    const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
    const sentenceCount = body.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    // Check word count
    if (wordCount > RULES.rules.body.maxWords) {
      issues.push({
        severity: 'warning',
        issue: `Body too long (${wordCount} words, max: ${RULES.rules.body.maxWords})`,
        value: wordCount
      });
      penalty += RULES.penalties.too_long;
    }

    // Check sentence count
    if (sentenceCount > RULES.rules.body.maxSentences) {
      issues.push({
        severity: 'warning',
        issue: `Too many sentences (${sentenceCount}, max: ${RULES.rules.body.maxSentences})`,
        value: sentenceCount
      });
      penalty += 10;
    }

    if (sentenceCount < RULES.rules.body.minSentences) {
      issues.push({
        severity: 'warning',
        issue: `Too few sentences (${sentenceCount}, min: ${RULES.rules.body.minSentences})`,
        value: sentenceCount
      });
      penalty += 5;
    }

    // Check for banned phrases
    const bannedFound = [];
    for (const phrase of RULES.rules.body.bannedPhrases) {
      if (body.toLowerCase().includes(phrase.toLowerCase())) {
        bannedFound.push(phrase);
        penalty += RULES.penalties.banned_phrase_body;
      }
    }

    if (bannedFound.length > 0) {
      issues.push({
        severity: 'error',
        issue: `Contains buzzwords: ${bannedFound.join(', ')}`,
        value: bannedFound
      });
    }

    // Check exclamations
    const exclamations = (body.match(/!/g) || []).length;
    if (exclamations > RULES.rules.body.maxExclamations) {
      issues.push({
        severity: 'warning',
        issue: `Too many exclamation marks (${exclamations})`,
        value: exclamations
      });
      penalty += RULES.penalties.excessive_exclamations;
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      wordCount,
      sentenceCount,
      issues,
      penalty
    };
  } catch (error) {
    throw new Error(`Body validation failed: ${error.message}`);
  }
}

/**
 * Check for unfilled placeholders
 * @param {string} text - Text to check
 * @returns {object} Check result
 */
function checkPlaceholders(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a string for placeholder check');
  }

  try {
    const placeholders = [];

    for (const pattern of RULES.rules.placeholders.mustNotContain) {
      if (text.includes(pattern)) {
        placeholders.push(pattern);
      }
    }

    return {
      found: placeholders.length > 0,
      issues: placeholders.length > 0 ? [{
        severity: 'critical',
        issue: `Contains unfilled placeholders: ${placeholders.join(', ')}`,
        value: placeholders
      }] : []
    };
  } catch (error) {
    throw new Error(`Placeholder check failed: ${error.message}`);
  }
}

/**
 * Check for spam patterns
 * @param {string} subject - Subject line
 * @param {string} body - Body text
 * @returns {object} Spam check result
 */
function checkSpam(subject, body) {
  if (!subject || typeof subject !== 'string') {
    throw new Error('Subject must be a string for spam check');
  }
  if (!body || typeof body !== 'string') {
    throw new Error('Body must be a string for spam check');
  }

  try {
    const issues = [];
    let penalty = 0;
    const fullText = (subject + ' ' + body).toLowerCase();

  // Check spam categories
  for (const [category, data] of Object.entries(SPAM_RULES.categories)) {
    const found = [];

    for (const phrase of data.phrases || []) {
      if (fullText.includes(phrase.toLowerCase())) {
        found.push(phrase);
      }
    }

    if (found.length > 0) {
      const severityPenalty = {
        critical: -30,
        high: -20,
        medium: -10,
        low: -5
      };

      penalty += severityPenalty[data.severity] || -10;

      issues.push({
        severity: data.severity,
        issue: `Spam category "${category}": ${found.join(', ')}`,
        value: found
      });
    }
  }

    return {
      found: issues.length > 0,
      issues,
      penalty
    };
  } catch (error) {
    throw new Error(`Spam check failed: ${error.message}`);
  }
}

/**
 * Get rating based on score
 * @param {number} score - Score (0-100)
 * @returns {string} Rating
 */
function getScoreRating(score) {
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new Error('Score must be a number between 0 and 100');
  }

  if (score >= RULES.thresholds.excellent) return 'excellent';
  if (score >= RULES.thresholds.good) return 'good';
  if (score >= RULES.thresholds.acceptable) return 'acceptable';
  if (score >= RULES.thresholds.needsReview) return 'needs review';
  return 'poor';
}
