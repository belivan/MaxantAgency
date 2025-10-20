/**
 * Agent 7 Validator - QA Supervisor
 *
 * Validates that the QA Supervisor itself complies with its own standards
 */

import path from 'path';
import {
  readJSON,
  getProjectRoot
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';
import { runChecklistValidation } from './validator-engine.js';

/**
 * Validate QA Supervisor (self-validation)
 */
export async function validateAgent7() {
  const projectRoot = getProjectRoot();
  const checklistPath = path.join(projectRoot, 'qa-supervisor', 'checklists', 'agent7-checklist.json');

  // Load checklist
  const checklist = readJSON(checklistPath);

  logger.section(`${checklist.agent}`);

  // Run validation using generic engine
  const results = await runChecklistValidation(checklist, projectRoot);

  return results;
}

export default {
  validateAgent7
};
