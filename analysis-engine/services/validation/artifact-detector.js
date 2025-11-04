/**
 * Screenshot Artifact Detector
 *
 * Analyzes issues to detect potential screenshot artifacts vs real design problems.
 *
 * Common Screenshot Artifacts:
 * 1. Split whitespace - Extra whitespace from screenshot splitting
 * 2. Rendering glitches - CSS/JS not fully loaded during capture
 * 3. Cropped elements - Content cut off at section boundaries
 * 4. Loading states - Spinners, placeholders, partial content
 * 5. Animation frames - Elements caught mid-animation
 * 6. Browser chrome - Scrollbars, browser UI in screenshot
 */

/**
 * Artifact type definitions
 */
export const ARTIFACT_TYPES = {
  SPLIT_BOUNDARY: 'split_boundary',
  CROPPED_CONTENT: 'cropped_content',
  LOADING_STATE: 'loading_state',
  RENDERING_GLITCH: 'rendering_glitch',
  ANIMATION_FRAME: 'animation_frame',
  BROWSER_CHROME: 'browser_chrome',
  WHITESPACE_ARTIFACT: 'whitespace_artifact',
  UNLOADED_IMAGES: 'unloaded_images'
};

/**
 * Keywords that commonly indicate artifacts
 */
const ARTIFACT_KEYWORDS = {
  whitespace: ['whitespace', 'white space', 'spacing', 'gap', 'excessive space', 'blank space', 'empty space'],
  loading: ['loading', 'spinner', 'placeholder', 'not loaded', 'failed to load', 'skeleton'],
  cropped: ['cropped', 'cut off', 'truncated', 'incomplete', 'partially visible', 'clipped'],
  glitch: ['glitch', 'rendering', 'broken', 'overlapping', 'misaligned', 'css issue'],
  browser: ['scrollbar', 'browser', 'chrome', 'toolbar', 'address bar'],
  images: ['missing image', 'blank image', 'image placeholder', 'no image', 'unloaded image', 'lazy load', 'image not', 'broken image']
};

/**
 * Analyze an issue to detect if it might be a screenshot artifact
 *
 * @param {object} issue - Issue object with title, description, metadata
 * @param {object} screenshotInfo - Screenshot metadata (section labels, count)
 * @returns {object} Artifact analysis result
 */
export function detectArtifact(issue, screenshotInfo = {}) {
  const analysis = {
    isPotentialArtifact: false,
    confidence: 0.0, // 0.0 = definitely not artifact, 1.0 = definitely artifact
    artifactType: null,
    reasoning: '',
    flags: []
  };

  const text = `${issue.title} ${issue.description}`.toLowerCase();
  const metadata = issue.metadata || {};

  // Check 1: Whitespace issues (most common artifact)
  const whitespaceScore = checkWhitespaceArtifact(text, metadata);
  if (whitespaceScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, whitespaceScore);
    analysis.artifactType = ARTIFACT_TYPES.WHITESPACE_ARTIFACT;
    analysis.flags.push('whitespace-related');
    analysis.reasoning += 'Issue mentions whitespace/spacing which is often a screenshot split artifact. ';
  }

  // Check 2: Split boundary issues
  const boundaryScore = checkSplitBoundary(metadata, screenshotInfo);
  if (boundaryScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, boundaryScore);
    analysis.artifactType = ARTIFACT_TYPES.SPLIT_BOUNDARY;
    analysis.flags.push('split-boundary');
    analysis.reasoning += 'Issue appears at screenshot section boundary. ';
  }

  // Check 3: Loading/rendering issues
  const loadingScore = checkLoadingState(text);
  if (loadingScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, loadingScore);
    analysis.artifactType = ARTIFACT_TYPES.LOADING_STATE;
    analysis.flags.push('loading-state');
    analysis.reasoning += 'Mentions loading or placeholder content. ';
  }

  // Check 4: Cropped content
  const croppedScore = checkCroppedContent(text, metadata);
  if (croppedScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, croppedScore);
    analysis.artifactType = ARTIFACT_TYPES.CROPPED_CONTENT;
    analysis.flags.push('cropped-content');
    analysis.reasoning += 'Content may be cropped at section boundary. ';
  }

  // Check 5: Rendering glitches
  const glitchScore = checkRenderingGlitch(text);
  if (glitchScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, glitchScore);
    analysis.artifactType = ARTIFACT_TYPES.RENDERING_GLITCH;
    analysis.flags.push('rendering-glitch');
    analysis.reasoning += 'Possible CSS/JS rendering issue during capture. ';
  }

  // Check 6: Browser chrome
  const browserScore = checkBrowserChrome(text);
  if (browserScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, browserScore);
    analysis.artifactType = ARTIFACT_TYPES.BROWSER_CHROME;
    analysis.flags.push('browser-chrome');
    analysis.reasoning += 'References browser UI elements. ';
  }

  // Check 7: Unloaded images
  const imagesScore = checkUnloadedImages(text);
  if (imagesScore > 0.5) {
    analysis.isPotentialArtifact = true;
    analysis.confidence = Math.max(analysis.confidence, imagesScore);
    analysis.artifactType = ARTIFACT_TYPES.UNLOADED_IMAGES;
    analysis.flags.push('unloaded-images');
    analysis.reasoning += 'Mentions missing or unloaded images. ';
  }

  // Round confidence to 2 decimals
  analysis.confidence = Math.round(analysis.confidence * 100) / 100;

  // Clean up reasoning
  analysis.reasoning = analysis.reasoning.trim();
  if (!analysis.reasoning) {
    analysis.reasoning = 'No artifact patterns detected.';
  }

  return analysis;
}

/**
 * Check if issue is related to whitespace artifacts
 */
function checkWhitespaceArtifact(text, metadata) {
  let score = 0.0;

  // Check for whitespace keywords
  for (const keyword of ARTIFACT_KEYWORDS.whitespace) {
    if (text.includes(keyword)) {
      score += 0.3;
    }
  }

  // Higher score if it's "excessive" whitespace
  if (text.includes('excessive') || text.includes('too much') || text.includes('large gap')) {
    score += 0.3;
  }

  // Higher score if it mentions horizontal whitespace (common in split sections)
  if (text.includes('horizontal') && text.includes('whitespace')) {
    score += 0.4;
  }

  return Math.min(score, 1.0);
}

/**
 * Check if issue appears at a split boundary
 */
function checkSplitBoundary(metadata, screenshotInfo) {
  if (!metadata.screenshot_numbers || metadata.screenshot_numbers.length === 0) {
    return 0.0;
  }

  // Check if issue spans multiple adjacent sections
  const numbers = metadata.screenshot_numbers.sort((a, b) => a - b);

  // If issue references consecutive screenshots (e.g., [2, 3]), it might be at boundary
  let isConsecutive = false;
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i + 1] - numbers[i] === 1) {
      isConsecutive = true;
      break;
    }
  }

  if (isConsecutive) {
    return 0.6; // Medium confidence - issue at section boundary
  }

  return 0.0;
}

/**
 * Check for loading state artifacts
 */
function checkLoadingState(text) {
  let score = 0.0;

  for (const keyword of ARTIFACT_KEYWORDS.loading) {
    if (text.includes(keyword)) {
      score += 0.4;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Check for cropped content
 */
function checkCroppedContent(text, metadata) {
  let score = 0.0;

  for (const keyword of ARTIFACT_KEYWORDS.cropped) {
    if (text.includes(keyword)) {
      score += 0.3;
    }
  }

  // Higher score if at section boundary
  if (metadata.screenshot_numbers && metadata.screenshot_numbers.length > 1) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Check for rendering glitches
 */
function checkRenderingGlitch(text) {
  let score = 0.0;

  for (const keyword of ARTIFACT_KEYWORDS.glitch) {
    if (text.includes(keyword)) {
      score += 0.3;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Check for browser chrome
 */
function checkBrowserChrome(text) {
  let score = 0.0;

  for (const keyword of ARTIFACT_KEYWORDS.browser) {
    if (text.includes(keyword)) {
      score += 0.5;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Check for unloaded/missing images
 */
function checkUnloadedImages(text) {
  let score = 0.0;

  for (const keyword of ARTIFACT_KEYWORDS.images) {
    if (text.includes(keyword)) {
      score += 0.4;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Batch analyze all issues in an analysis result
 *
 * @param {object} analysisResult - Full analysis result with desktopIssues, mobileIssues, etc.
 * @param {object} screenshotInfo - Screenshot metadata
 * @returns {object} Artifact analysis for all issues
 */
export function analyzeAllIssues(analysisResult, screenshotInfo = {}) {
  const allIssues = [
    ...(analysisResult.desktopIssues || []),
    ...(analysisResult.mobileIssues || []),
    ...(analysisResult.responsiveIssues || []),
    ...(analysisResult.sharedIssues || [])
  ];

  const results = {
    totalIssues: allIssues.length,
    potentialArtifacts: 0,
    highConfidenceArtifacts: 0,
    artifactsByType: {},
    flaggedIssues: []
  };

  for (const issue of allIssues) {
    const detection = detectArtifact(issue, screenshotInfo);

    if (detection.isPotentialArtifact) {
      results.potentialArtifacts++;

      if (detection.confidence >= 0.7) {
        results.highConfidenceArtifacts++;
      }

      // Count by type
      const type = detection.artifactType;
      if (!results.artifactsByType[type]) {
        results.artifactsByType[type] = 0;
      }
      results.artifactsByType[type]++;

      // Store flagged issue
      results.flaggedIssues.push({
        issue: {
          title: issue.title,
          category: issue.category,
          viewport: issue.metadata?.viewport
        },
        detection
      });
    }
  }

  return results;
}

export default {
  detectArtifact,
  analyzeAllIssues,
  ARTIFACT_TYPES
};
