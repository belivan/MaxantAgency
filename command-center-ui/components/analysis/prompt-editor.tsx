'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  RotateCcw,
  AlertCircle,
  Lock,
  FileText
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface PromptConfig {
  version: string;
  name: string;
  description: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  outputFormat: {
    type: string;
    schema: any;
  };
  costEstimate?: {
    model: string;
    estimatedCost: string;
  };
}

export interface AnalysisPrompts {
  design?: PromptConfig;
  seo?: PromptConfig;
  content?: PromptConfig;
  social?: PromptConfig;
  industry?: PromptConfig;
  _meta?: {
    collectedAt: string;
    version: string;
  };
}

interface PromptEditorProps {
  prompts: AnalysisPrompts;
  defaultPrompts: AnalysisPrompts;
  onChange: (prompts: AnalysisPrompts) => void;
  locked?: boolean;
  leadsCount?: number;
}

export function PromptEditor({
  prompts,
  defaultPrompts,
  onChange,
  locked = false,
  leadsCount = 0
}: PromptEditorProps) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  const promptKeys: Array<keyof AnalysisPrompts> = ['design', 'seo', 'content', 'social'];

  const toggleExpand = (key: string) => {
    setExpandedPrompt(expandedPrompt === key ? null : key);
  };

  const toggleEdit = (key: string) => {
    if (locked) return;
    setEditingPrompt(editingPrompt === key ? null : key);
  };

  const resetPrompt = (key: keyof AnalysisPrompts) => {
    if (locked || key === '_meta') return;
    const updated = {
      ...prompts,
      [key]: defaultPrompts[key]
    };
    onChange(updated);
    setEditingPrompt(null);
  };

  const updatePrompt = (key: keyof AnalysisPrompts, field: keyof PromptConfig, value: any) => {
    if (locked || key === '_meta') return;

    const currentPrompt = prompts[key] as PromptConfig;
    const updated = {
      ...prompts,
      [key]: {
        ...currentPrompt,
        [field]: value
      }
    };
    onChange(updated);
  };

  const isModified = (key: keyof AnalysisPrompts) => {
    if (key === '_meta') return false;
    const current = prompts[key] as PromptConfig;
    const defaultVal = defaultPrompts[key] as PromptConfig;

    if (!current || !defaultVal) return false;

    return (
      current.model !== defaultVal.model ||
      current.temperature !== defaultVal.temperature ||
      current.systemPrompt !== defaultVal.systemPrompt ||
      current.userPromptTemplate !== defaultVal.userPromptTemplate
    );
  };

  const modifiedCount = promptKeys.filter(isModified).length;
  const hasModifications = modifiedCount > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Analysis Prompts
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI prompts for website analysis
          </p>
        </div>

        {locked && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Locked ({leadsCount} leads)
          </Badge>
        )}
      </div>

      {/* Lock Warning */}
      {locked && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            Prompts Locked
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            This project has {leadsCount} lead{leadsCount !== 1 ? 's' : ''}.
            The analysis prompts cannot be modified to maintain historical accuracy.
            <br />
            💡 Tip: Modify prompts and run analysis to auto-create a new project with custom settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Modification Warning */}
      {hasModifications && !locked && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            {modifiedCount} Prompt{modifiedCount !== 1 ? 's' : ''} Modified
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {leadsCount > 0 ? (
              <>
                When you analyze prospects, a new project will be created automatically
                to preserve the historical accuracy of existing {leadsCount} lead{leadsCount !== 1 ? 's' : ''}.
              </>
            ) : (
              <>
                These custom prompts will be saved to the project when you run analysis.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Prompt Cards */}
      <div className="space-y-3">
        {promptKeys.map((key) => {
          const prompt = prompts[key] as PromptConfig;
          const defaultPrompt = defaultPrompts[key] as PromptConfig;

          if (!prompt) return null;

          const isExpanded = expandedPrompt === key;
          const isEditing = editingPrompt === key;
          const modified = isModified(key);

          return (
            <Card key={key} className={modified ? 'border-blue-400' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {prompt.name}
                      {modified && (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">
                          Modified
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {prompt.description}
                    </CardDescription>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(key)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>Model: <strong>{prompt.model}</strong></span>
                  <span>Temperature: <strong>{prompt.temperature}</strong></span>
                  {prompt.costEstimate && (
                    <span>Cost: <strong>{prompt.costEstimate.estimatedCost}</strong></span>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-model`}>AI Model</Label>
                    <Input
                      id={`${key}-model`}
                      value={prompt.model}
                      onChange={(e) => updatePrompt(key, 'model', e.target.value)}
                      disabled={locked || !isEditing}
                      className={locked || !isEditing ? 'opacity-60 cursor-not-allowed' : ''}
                    />
                  </div>

                  {/* Temperature */}
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-temp`}>
                      Temperature ({prompt.temperature})
                    </Label>
                    <input
                      id={`${key}-temp`}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={prompt.temperature}
                      onChange={(e) => updatePrompt(key, 'temperature', parseFloat(e.target.value))}
                      disabled={locked || !isEditing}
                      className="w-full"
                    />
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-system`}>System Prompt</Label>
                    <Textarea
                      id={`${key}-system`}
                      value={prompt.systemPrompt}
                      onChange={(e) => updatePrompt(key, 'systemPrompt', e.target.value)}
                      disabled={locked || !isEditing}
                      className={`font-mono text-xs ${locked || !isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows={8}
                    />
                  </div>

                  {/* User Prompt Template */}
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-user`}>
                      User Prompt Template
                      <span className="text-xs text-muted-foreground ml-2">
                        (Use {`{{variable}}`} for substitution)
                      </span>
                    </Label>
                    <Textarea
                      id={`${key}-user`}
                      value={prompt.userPromptTemplate}
                      onChange={(e) => updatePrompt(key, 'userPromptTemplate', e.target.value)}
                      disabled={locked || !isEditing}
                      className={`font-mono text-xs ${locked || !isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows={6}
                    />
                  </div>

                  {/* Variables */}
                  {prompt.variables && prompt.variables.length > 0 && (
                    <div className="space-y-2">
                      <Label>Required Variables</Label>
                      <div className="flex flex-wrap gap-2">
                        {prompt.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {!locked && (
                      <>
                        <Button
                          variant={isEditing ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleEdit(key)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          {isEditing ? 'Editing' : 'Edit'}
                        </Button>

                        {modified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetPrompt(key)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset to Default
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}