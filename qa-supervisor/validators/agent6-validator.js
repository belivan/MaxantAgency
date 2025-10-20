/**
 * Agent 6 Validator - Pipeline Orchestrator
 *
 * Validates that Agent 6 (pipeline-orchestrator) complies with specification
 */

import path from 'path';
import {
  readJSON,
  getProjectRoot
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';
import { runChecklistValidation } from './validator-engine.js';

/**
 * Validate Agent 6 compliance
 */
export async function validateAgent6() {
  const projectRoot = getProjectRoot();
  const checklistPath = path.join(projectRoot, 'qa-supervisor', 'checklists', 'agent6-checklist.json');

  // Load checklist
  const checklist = readJSON(checklistPath);

  logger.section(`${checklist.agent}`);

  // Run validation using generic engine
  const results = await runChecklistValidation(checklist, projectRoot);

  return results;
}

export default {
  validateAgent6
};
