/**
 * User-Agent Rotation - Provides realistic browser user agents to avoid bot detection
 *
 * Strategy: Rotate between latest Chrome, Firefox, Safari, Edge user agents
 * Based on real browser statistics from 2025
 */

const USER_AGENTS = [
  // Chrome (most popular - 65% market share)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

  // Firefox (8% market share)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',

  // Safari (20% market share)
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',

  // Edge (5% market share)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
];

let currentIndex = 0;

/**
 * Get a random user agent
 * @returns {string} User agent string
 */
export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get the next user agent in rotation
 * @returns {string} User agent string
 */
export function getNextUserAgent() {
  const userAgent = USER_AGENTS[currentIndex];
  currentIndex = (currentIndex + 1) % USER_AGENTS.length;
  return userAgent;
}

/**
 * Get a specific user agent by browser type
 * @param {string} browser - 'chrome', 'firefox', 'safari', or 'edge'
 * @returns {string} User agent string
 */
export function getUserAgent(browser = 'chrome') {
  const browserMap = {
    chrome: USER_AGENTS[0],
    firefox: USER_AGENTS[3],
    safari: USER_AGENTS[5],
    edge: USER_AGENTS[7]
  };

  return browserMap[browser.toLowerCase()] || USER_AGENTS[0];
}

/**
 * Get Chrome user agent (most compatible)
 * @returns {string} Chrome user agent
 */
export function getChromeUserAgent() {
  return USER_AGENTS[0];
}

/**
 * Default export
 */
export default {
  getRandomUserAgent,
  getNextUserAgent,
  getUserAgent,
  getChromeUserAgent,
  USER_AGENTS
};