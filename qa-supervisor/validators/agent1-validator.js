/**
 * Agent 1 Validator - Prospecting Engine
 *
 * Validates that Agent 1 (prospecting-engine) complies with specification
 */

import path from 'path';
import {
  readJSON,
  getProjectRoot
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';
import { runChecklistValidation } from './validator-engine.js';

/**
 * Validate Agent 1 compliance
 */
export async function validateAgent1() {
  const projectRoot = getProjectRoot();
  const checklistPath = path.join(projectRoot, 'qa-supervisor', 'checklists', 'agent1-checklist.json');

  // Load checklist
  const checklist = readJSON(checklistPath);

  logger.section(`${checklist.agent}`);

  // Run validation using generic engine
  const results = await runChecklistValidation(checklist, projectRoot);

  return results;
}

export default {
  validateAgent1
};
