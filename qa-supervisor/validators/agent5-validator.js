/**
 * Agent 5 Validator - Database Setup Tool
 *
 * Validates that Agent 5 (database-tools) complies with specification
 */

import path from 'path';
import {
  readJSON,
  getProjectRoot
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';
import { runChecklistValidation } from './validator-engine.js';

/**
 * Validate Agent 5 compliance
 */
export async function validateAgent5() {
  const projectRoot = getProjectRoot();
  const checklistPath = path.join(projectRoot, 'qa-supervisor', 'checklists', 'agent5-checklist.json');

  // Load checklist
  const checklist = readJSON(checklistPath);

  logger.section(`${checklist.agent}`);

  // Run validation using generic engine
  const results = await runChecklistValidation(checklist, projectRoot);

  return results;
}

export default {
  validateAgent5
};
