import { executeProspectingStep } from './prospecting-step.js';
import { executeAnalysisStep } from './analysis-step.js';
import { executeOutreachStep } from './outreach-step.js';
import { executeSenderStep } from './sender-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute a single step based on engine type
 *
 * @param {Object} stepConfig - Step configuration
 * @returns {Promise<Object>} Step results
 */
export async function executeStep(stepConfig) {
  const { engine, name } = stepConfig;

  log.info('Executing step', { name, engine });

  switch (engine) {
    case 'prospecting':
      return await executeProspectingStep(stepConfig);

    case 'analysis':
      return await executeAnalysisStep(stepConfig);

    case 'outreach':
      // Check if this is compose or send based on endpoint
      if (stepConfig.endpoint.includes('compose')) {
        return await executeOutreachStep(stepConfig);
      } else if (stepConfig.endpoint.includes('send')) {
        return await executeSenderStep(stepConfig);
      }
      // Default to outreach (compose)
      return await executeOutreachStep(stepConfig);

    case 'sender':
      return await executeSenderStep(stepConfig);

    default:
      throw new Error(`Unknown engine type: ${engine}`);
  }
}

export {
  executeProspectingStep,
  executeAnalysisStep,
  executeOutreachStep,
  executeSenderStep
};
