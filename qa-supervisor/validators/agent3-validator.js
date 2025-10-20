/**
 * Agent 3 Validator - Outreach Engine
 *
 * Validates that Agent 3 (outreach-engine) complies with specification
 */

import path from 'path';
import {
  readJSON,
  getProjectRoot
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';
import { runChecklistValidation } from './validator-engine.js';

/**
 * Validate Agent 3 compliance
 */
export async function validateAgent3() {
  const projectRoot = getProjectRoot();
  const checklistPath = path.join(projectRoot, 'qa-supervisor', 'checklists', 'agent3-checklist.json');

  // Load checklist
  const checklist = readJSON(checklistPath);

  logger.section(`${checklist.agent}`);

  // Run validation using generic engine
  const results = await runChecklistValidation(checklist, projectRoot);

  return results;
}

export default {
  validateAgent3
};
