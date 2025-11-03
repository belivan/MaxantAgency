'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  unifiedVisual?: PromptConfig;
  unifiedTechnical?: PromptConfig;
  social?: PromptConfig;
  accessibility?: PromptConfig;
  industry?: PromptConfig;
  leadScorer?: PromptConfig;
  issueDeduplication?: PromptConfig;
  executiveInsights?: PromptConfig;
  [key: string]: PromptConfig | AnalysisPrompts['_meta'] | undefined;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  const MULTI_PAGE_PROMPT_ORDER: Array<keyof AnalysisPrompts> = [
    'unifiedVisual',
    'unifiedTechnical',
    'social',
    'accessibility',
    'industry',
    'leadScorer',
    'issueDeduplication',
    'executiveInsights'
  ];

  const PROMPT_LABELS: Record<string, { title: string; description: string }> = {
    unifiedVisual: {
      title: 'Visual Analysis (Unified)',
      description: 'Desktop + Mobile design analysis in one call'
    },
    unifiedTechnical: {
      title: 'Technical Analysis (Unified)',
      description: 'SEO + Content quality in one call'
    },
    social: {
      title: 'Social Media Analysis',
      description: 'Presence & social proof evaluation'
    },
    accessibility: {
      title: 'Accessibility Analysis',
      description: 'WCAG 2.1 compliance review'
    },
    industry: {
      title: 'Industry Analysis',
      description: 'Industry-specific best practices critique'
    },
    leadScorer: {
      title: 'Lead Priority Scorer',
      description: 'Qualification & tier assignment'
    },
    issueDeduplication: {
      title: 'Issue Deduplication',
      description: 'AI consolidation of redundant findings (~$0.036/lead)'
    },
    executiveInsights: {
      title: 'Executive Insights Generator',
      description: 'AI-powered executive summaries & roadmaps (~$0.025/lead)'
    }
  };

  const availablePromptKeys = Array.from(
    new Set([
      ...Object.keys(defaultPrompts || {}),
      ...Object.keys(prompts || {})
    ])
  ).filter(key => key !== '_meta');

  const promptKeys = MULTI_PAGE_PROMPT_ORDER.filter(key =>
    availablePromptKeys.includes(key as string)
  );

  const toggleExpand = (key: keyof AnalysisPrompts) => {
    setExpandedPrompt(expandedPrompt === key ? null : String(key));
  };

  const toggleEdit = (key: keyof AnalysisPrompts) => {
    if (locked) return;
    setEditingPrompt(editingPrompt === key ? null : String(key));
  };

  const resetPrompt = (key: string) => {
    if (locked || key === '_meta') return;
    const updated = {
      ...prompts,
      [key]: defaultPrompts[key]
    };
    onChange(updated);
    setEditingPrompt(null);
  };

  const updatePrompt = (key: string, field: keyof PromptConfig, value: any) => {
    if (locked || key === '_meta') return;

    const basePrompt = (prompts[key] as PromptConfig) || (defaultPrompts[key] as PromptConfig);
    if (!basePrompt) return;

    const updated = {
      ...prompts,
      [key]: {
        ...basePrompt,
        [field]: value
      }
    };
    onChange(updated);
  };

  const isModified = (key: keyof AnalysisPrompts) => {
    if (key === '_meta') return false;
    const defaultVal = defaultPrompts[key] as PromptConfig;
    if (!defaultVal) return false;

    const current = (prompts[key] as PromptConfig) || defaultVal;

    return (
      current.model !== defaultVal.model ||
      current.systemPrompt !== defaultVal.systemPrompt ||
      current.userPromptTemplate !== defaultVal.userPromptTemplate
    );
  };

  const modifiedCount = promptKeys.filter((key) => isModified(key)).length;
  const hasModifications = modifiedCount > 0;

  const handleResetAll = () => {
    if (locked) return;
    const resetPrompts: AnalysisPrompts = { ...prompts };
    promptKeys.forEach((key) => {
      if (key !== '_meta' && defaultPrompts[key]) {
        resetPrompts[key] = defaultPrompts[key];
      }
    });
    resetPrompts._meta = defaultPrompts._meta;
    onChange(resetPrompts);
    setEditingPrompt(null);
  };

  const formatMetaLabel = (key: keyof AnalysisPrompts) => {
    const keyStr = String(key);
    const fallback = keyStr
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase());
    const meta = PROMPT_LABELS[keyStr];
    return {
      title: meta?.title || fallback,
      description: meta?.description || (defaultPrompts[key] as PromptConfig | undefined)?.description || ''
    };
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="font-semibold">Prompt Editor</span>
              <Badge variant="secondary" className="text-xs">Expert</Badge>
              {hasModifications && (
                <Badge variant="outline" className="text-xs text-orange-600">Modified</Badge>
              )}
              {locked && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked ({leadsCount})
                </Badge>
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
            Tip: Modify prompts and run analysis to auto-create a new project with custom settings.
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
          const prompt = (prompts[key] as PromptConfig) ?? (defaultPrompts[key] as PromptConfig);

          if (!prompt) return null;

          const isPromptExpanded = expandedPrompt === key;
          const isEditing = editingPrompt === key;
          const modified = isModified(key);
          const meta = formatMetaLabel(key);

          return (
            <Card key={key} className={modified ? 'border-blue-400' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {meta.title}
                      {modified && (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">
                          Modified
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {meta.description}
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(key)}
                  >
                    {isPromptExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

              </CardHeader>

              {isPromptExpanded && (
                <CardContent className="space-y-4 pt-0">
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
                          type="button"
                          variant={isEditing ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleEdit(key)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          {isEditing ? 'Editing' : 'Edit'}
                        </Button>

                        {modified && (
                          <Button
                            type="button"
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

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 rounded p-3">
                    <div>
                      <span className="font-medium text-muted-foreground">Model:</span>{' '}
                      <span className="font-mono">{prompt.model}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Temperature:</span>{' '}
                      <span className="font-mono">{prompt.temperature}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Version:</span>{' '}
                      <span className="font-mono">{prompt.version || '1.0'}</span>
                    </div>
                    {prompt.costEstimate?.estimatedCost && (
                      <div>
                        <span className="font-medium text-muted-foreground">Cost Estimate:</span>{' '}
                        <span className="font-mono">{prompt.costEstimate.estimatedCost}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {hasModifications && !locked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="w-full"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset All Prompts to Defaults
          </Button>
        )}
      </div>

          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
