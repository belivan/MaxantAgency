'use client';

/**
 * Enhanced Prospect Configuration Form
 * Includes model selection and prompt editing capabilities
 */

import { useState, useEffect } from 'react';
import { ProspectConfigForm } from './prospect-config-form';
import { ProjectSelector } from '@/components/shared';
import { PROSPECTING_MODULES, PROSPECTING_MODELS } from '@/lib/constants/prospecting';
import type { ProspectGenerationFormData } from '@/lib/utils/validation';
import type { ProspectingPrompts } from '@/lib/types/prospect';
import type { ModuleModelSelection } from './model-selector';

interface EnhancedProspectConfigFormProps {
  onSubmit: (data: ProspectGenerationFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  showForkWarning?: boolean;
  prospectCount?: number;
  isLoadingProject?: boolean;
  onPromptsChange?: (defaultPrompts: ProspectingPrompts, currentPrompts: ProspectingPrompts) => void;
  onModelsChange?: (modelSelections: ModuleModelSelection) => void;
  // Project selection
  selectedProjectId?: string | null;
  onProjectChange?: (projectId: string | null) => void;
  // Saved/initial values from project
  savedModelSelections?: Record<string, string>;
  savedPrompts?: ProspectingPrompts;
  // Validation
  icpValid?: boolean; // Whether ICP Brief is valid
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
            // Use saved prompts if available, otherwise use defaults
            setCustomPrompts(props.savedPrompts || data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    loadDefaultPrompts();
  }, [props.savedPrompts]);

  // Initialize selected models with saved values or defaults
  useEffect(() => {
    if (Object.keys(selectedModels).length === 0 && !isLoadingPrompts) {
      const initial: ModuleModelSelection = {};
      PROSPECTING_MODULES.forEach(module => {
        // Use saved selection if available, otherwise use default
        initial[module.value] = props.savedModelSelections?.[module.value] || module.defaultModel;
      });
      setSelectedModels(initial);
    }
  }, [isLoadingPrompts, selectedModels, props.savedModelSelections]);

  // Notify parent when prompts change (for auto-fork detection)
  useEffect(() => {
    if (props.onPromptsChange && !isLoadingPrompts) {
      props.onPromptsChange(defaultPrompts, customPrompts);
    }
  }, [defaultPrompts, customPrompts, isLoadingPrompts, props.onPromptsChange]);

  // Notify parent when models change (for auto-fork detection)
  useEffect(() => {
    if (props.onModelsChange && !isLoadingPrompts && Object.keys(selectedModels).length > 0) {
      props.onModelsChange(selectedModels);
    }
  }, [selectedModels, isLoadingPrompts, props.onModelsChange]);

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
    <ProspectConfigForm
      {...props}
      onSubmit={handleSubmit}
    >
      {/* Project Selection */}
      {props.onProjectChange && (
        <div className="space-y-2">
          <ProjectSelector
            value={props.selectedProjectId || null}
            onChange={props.onProjectChange}
            label="Project"
          />
          {!props.selectedProjectId && (
            <p className="text-xs text-muted-foreground">
              Select a project to save prospects and ICP brief
            </p>
          )}
        </div>
      )}
    </ProspectConfigForm>
  );
}
