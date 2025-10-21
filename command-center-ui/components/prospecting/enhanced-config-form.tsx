'use client';

/**
 * Enhanced Prospect Configuration Form
 * Includes model selection and prompt editing capabilities
 */

import { useState, useEffect } from 'react';
import { ProspectConfigForm } from './prospect-config-form';
import { ProspectingModelSelector } from './model-selector';
import { ProspectingPromptEditor } from './prompt-editor';
import { PROSPECTING_MODULES, PROSPECTING_MODELS } from '@/lib/constants/prospecting';
import type { ProspectGenerationFormData } from '@/lib/utils/validation';
import type { ProspectingPrompts } from '@/lib/types/prospect';
import type { ModuleModelSelection } from './model-selector';

interface EnhancedProspectConfigFormProps {
  onSubmit: (data: ProspectGenerationFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  locked?: boolean;
  prospectCount?: number;
  isLoadingProject?: boolean;
}

export function EnhancedProspectConfigForm(props: EnhancedProspectConfigFormProps) {
  const [selectedModels, setSelectedModels] = useState<ModuleModelSelection>({});
  const [customPrompts, setCustomPrompts] = useState<ProspectingPrompts>({});
  const [defaultPrompts, setDefaultPrompts] = useState<ProspectingPrompts>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  // Load default prompts on mount
  useEffect(() => {
    async function loadDefaultPrompts() {
      try {
        const response = await fetch('/api/prospecting/prompts/default');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDefaultPrompts(data.data);
            setCustomPrompts(data.data); // Initialize custom prompts with defaults
          }
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    loadDefaultPrompts();
  }, []);

  // Initialize selected models with defaults
  useEffect(() => {
    if (Object.keys(selectedModels).length === 0 && !isLoadingPrompts) {
      const defaults: ModuleModelSelection = {};
      PROSPECTING_MODULES.forEach(module => {
        defaults[module.value] = module.defaultModel;
      });
      setSelectedModels(defaults);
    }
  }, [isLoadingPrompts, selectedModels]);

  // Wrap onSubmit to include model selections and custom prompts
  const handleSubmit = (data: ProspectGenerationFormData) => {
    const enhancedData: ProspectGenerationFormData = {
      ...data,
      model_selections: selectedModels,
      custom_prompts: customPrompts
    };

    props.onSubmit(enhancedData);
  };

  return (
    <div className="space-y-4">
      {/* Basic Configuration */}
      <ProspectConfigForm
        {...props}
        onSubmit={handleSubmit}
      />

      {/* Model Selection (Advanced) */}
      {!isLoadingPrompts && (
        <ProspectingModelSelector
          modules={PROSPECTING_MODULES}
          models={PROSPECTING_MODELS}
          selectedModels={selectedModels}
          onChange={setSelectedModels}
          disabled={props.disabled || props.isLoading}
        />
      )}

      {/* Prompt Editor (Expert) */}
      {!isLoadingPrompts && Object.keys(defaultPrompts).length > 0 && (
        <ProspectingPromptEditor
          prompts={customPrompts}
          defaultPrompts={defaultPrompts}
          onChange={setCustomPrompts}
          disabled={props.disabled || props.isLoading}
        />
      )}
    </div>
  );
}