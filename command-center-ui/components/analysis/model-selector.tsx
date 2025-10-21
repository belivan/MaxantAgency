'use client';

/**
 * AI Model Selector Component
 * Allows selection of AI models for each analysis module
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Zap, DollarSign, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface AIModel {
  value: string;
  label: string;
  provider: string;
  description: string;
  cost: '$' | '$$' | '$$$';
  speed: 'Very Fast' | 'Fast' | 'Medium' | 'Slow';
}

export interface AnalysisModule {
  value: string;
  label: string;
  description: string;
  defaultModel: string;
}

export interface ModuleModelSelection {
  [moduleName: string]: string;
}

interface ModelSelectorProps {
  modules: readonly AnalysisModule[];
  models: readonly AIModel[];
  selectedModels: ModuleModelSelection;
  onChange: (selection: ModuleModelSelection) => void;
  disabled?: boolean;
}

export function ModelSelector({
  modules,
  models,
  selectedModels,
  onChange,
  disabled
}: ModelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModelChange = (moduleName: string, modelValue: string) => {
    onChange({
      ...selectedModels,
      [moduleName]: modelValue
    });
  };

  const getModelDetails = (modelValue: string): AIModel | undefined => {
    return models.find(m => m.value === modelValue);
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case '$': return 'text-green-600';
      case '$$': return 'text-yellow-600';
      case '$$$': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'Very Fast': return 'text-green-600';
      case 'Fast': return 'text-blue-600';
      case 'Medium': return 'text-yellow-600';
      case 'Slow': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between p-4 hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">AI Model Selection</span>
              <Badge variant="secondary" className="text-xs">Advanced</Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4 border-t">
            <p className="text-sm text-muted-foreground">
              Choose which AI model to use for each analysis module. Default selections are optimized for quality and cost.
            </p>

            {modules.map((module) => {
              const selectedModelValue = selectedModels[module.value] || module.defaultModel;
              const modelDetails = getModelDetails(selectedModelValue);

              return (
                <div key={module.value} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label htmlFor={`model-${module.value}`} className="font-medium">
                        {module.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  </div>

                  <Select
                    value={selectedModelValue}
                    onValueChange={(value) => handleModelChange(module.value, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger id={`model-${module.value}`} className="w-full">
                      <SelectValue>
                        {modelDetails && (
                          <div className="flex items-center justify-between w-full">
                            <span>{modelDetails.label}</span>
                            <div className="flex items-center space-x-2 ml-2">
                              <Badge variant="outline" className="text-xs px-1">
                                {modelDetails.provider}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {/* Group by provider */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Anthropic Claude
                      </div>
                      {models.filter(m => m.provider === 'Anthropic').map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-start justify-between w-full min-w-[300px]">
                            <div className="flex-1">
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className={`flex items-center space-x-1 ${getCostColor(model.cost)}`}>
                                <DollarSign className="w-3 h-3" />
                                <span className="text-xs">{model.cost}</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${getSpeedColor(model.speed)}`}>
                                <Zap className="w-3 h-3" />
                                <span className="text-xs">{model.speed}</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}

                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                        xAI Grok
                      </div>
                      {models.filter(m => m.provider === 'xAI').map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-start justify-between w-full min-w-[300px]">
                            <div className="flex-1">
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className={`flex items-center space-x-1 ${getCostColor(model.cost)}`}>
                                <DollarSign className="w-3 h-3" />
                                <span className="text-xs">{model.cost}</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${getSpeedColor(model.speed)}`}>
                                <Zap className="w-3 h-3" />
                                <span className="text-xs">{model.speed}</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}

                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                        OpenAI GPT
                      </div>
                      {models.filter(m => m.provider === 'OpenAI').map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-start justify-between w-full min-w-[300px]">
                            <div className="flex-1">
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className={`flex items-center space-x-1 ${getCostColor(model.cost)}`}>
                                <DollarSign className="w-3 h-3" />
                                <span className="text-xs">{model.cost}</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${getSpeedColor(model.speed)}`}>
                                <Zap className="w-3 h-3" />
                                <span className="text-xs">{model.speed}</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Show current selection details */}
                  {modelDetails && (
                    <div className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">
                        {modelDetails.provider} • {modelDetails.description}
                      </span>
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-1 ${getCostColor(modelDetails.cost)}`}>
                          <DollarSign className="w-3 h-3" />
                          <span>{modelDetails.cost}</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${getSpeedColor(modelDetails.speed)}`}>
                          <Clock className="w-3 h-3" />
                          <span>{modelDetails.speed}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Reset to defaults button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const defaults: ModuleModelSelection = {};
                modules.forEach(m => {
                  defaults[m.value] = m.defaultModel;
                });
                onChange(defaults);
              }}
              disabled={disabled}
              className="w-full"
            >
              Reset to Recommended Defaults
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
