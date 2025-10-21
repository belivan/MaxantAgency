'use client';

/**
 * Prospecting Prompt Editor Component
 * Allows editing AI prompts for each prospecting module
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, RotateCcw, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ForkWarningBadge } from './fork-warning-badge';

export interface ProspectingPromptConfig {
  version: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  examples?: any[];
}

export interface ProspectingPrompts {
  queryUnderstanding?: ProspectingPromptConfig;
  websiteExtraction?: ProspectingPromptConfig;
  relevanceCheck?: ProspectingPromptConfig;
}

interface ProspectingPromptEditorProps {
  prompts: ProspectingPrompts;
  defaultPrompts: ProspectingPrompts;
  onChange: (prompts: ProspectingPrompts) => void;
  disabled?: boolean;
  showForkWarning?: boolean;
  prospectCount?: number;
}

export function ProspectingPromptEditor({
  prompts,
  defaultPrompts,
  onChange,
  disabled,
  showForkWarning = false,
  prospectCount = 0
}: ProspectingPromptEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const modules = [
    {
      key: 'queryUnderstanding',
      label: 'Query Understanding',
      description: 'Converts ICP brief into search query',
      variables: defaultPrompts.queryUnderstanding?.variables || []
    },
    {
      key: 'websiteExtraction',
      label: 'Website Extraction',
      description: 'Extracts data from screenshots',
      variables: defaultPrompts.websiteExtraction?.variables || []
    },
    {
      key: 'relevanceCheck',
      label: 'Relevance Check',
      description: 'Scores prospect-ICP match',
      variables: defaultPrompts.relevanceCheck?.variables || []
    }
  ];

  const handlePromptChange = (
    moduleKey: string,
    field: keyof ProspectingPromptConfig,
    value: any
  ) => {
    onChange({
      ...prompts,
      [moduleKey]: {
        ...prompts[moduleKey as keyof ProspectingPrompts],
        [field]: value
      }
    });
  };

  const handleResetModule = (moduleKey: string) => {
    onChange({
      ...prompts,
      [moduleKey]: defaultPrompts[moduleKey as keyof ProspectingPrompts]
    });
  };

  const handleResetAll = () => {
    onChange(defaultPrompts);
  };

  const isModified = (moduleKey: string): boolean => {
    const current = prompts[moduleKey as keyof ProspectingPrompts];
    const defaultConfig = defaultPrompts[moduleKey as keyof ProspectingPrompts];

    if (!current || !defaultConfig) return false;

    return (
      current.systemPrompt !== defaultConfig.systemPrompt ||
      current.userPromptTemplate !== defaultConfig.userPromptTemplate
    );
  };

  const hasAnyModifications = modules.some(m => isModified(m.key));

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="font-semibold">Prompt Editor</span>
              <Badge variant="secondary" className="text-xs">Expert</Badge>
              {hasAnyModifications && (
                <Badge variant="outline" className="text-xs text-orange-600">Modified</Badge>
              )}
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Editing prompts affects AI behavior. Test thoroughly before using in production.
                Variables like <code className="text-xs bg-muted px-1 rounded">{'{{industry}}'}</code> are replaced at runtime.
              </AlertDescription>
            </Alert>

            {/* Fork Warning */}
            <ForkWarningBadge
              show={showForkWarning}
              prospectCount={prospectCount}
              modificationType="prompts"
              inline={true}
            />

            {/* Module tabs */}
            <div className="flex space-x-2 border-b">
              {modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setActiveModule(activeModule === module.key ? null : module.key)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeModule === module.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={disabled}
                >
                  {module.label}
                  {isModified(module.key) && (
                    <span className="ml-1 text-orange-600">*</span>
                  )}
                </button>
              ))}
            </div>

            {/* Active module editor */}
            {activeModule && (() => {
              const module = modules.find(m => m.key === activeModule);
              const promptConfig = prompts[activeModule as keyof ProspectingPrompts];

              if (!module || !promptConfig) return null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{module.label}</h3>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    {isModified(module.key) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetModule(module.key)}
                        disabled={disabled}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor={`system-${module.key}`}>
                      System Prompt
                      <span className="text-xs text-muted-foreground ml-2">
                        (AI role and instructions)
                      </span>
                    </Label>
                    <Textarea
                      id={`system-${module.key}`}
                      value={promptConfig.systemPrompt}
                      onChange={(e) => handlePromptChange(module.key, 'systemPrompt', e.target.value)}
                      disabled={disabled}
                      rows={8}
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* User Prompt Template */}
                  <div className="space-y-2">
                    <Label htmlFor={`user-${module.key}`}>
                      User Prompt Template
                      <span className="text-xs text-muted-foreground ml-2">
                        (Task description with variables)
                      </span>
                    </Label>
                    <Textarea
                      id={`user-${module.key}`}
                      value={promptConfig.userPromptTemplate}
                      onChange={(e) => handlePromptChange(module.key, 'userPromptTemplate', e.target.value)}
                      disabled={disabled}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* Available Variables */}
                  <div className="space-y-2">
                    <Label>Available Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {module.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs font-mono">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded">
                    <div>Version: {promptConfig.version}</div>
                    <div>Model: {promptConfig.model}</div>
                    <div>Name: {promptConfig.name}</div>
                  </div>
                </div>
              );
            })()}

            {/* Reset all button */}
            {hasAnyModifications && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                disabled={disabled}
                className="w-full"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset All Prompts to Defaults
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}