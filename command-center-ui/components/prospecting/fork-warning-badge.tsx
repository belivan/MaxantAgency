'use client';

/**
 * Fork Warning Badge
 * Shows warning when user modifications will trigger auto-fork
 */

import { AlertTriangle, GitBranch } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ForkWarningBadgeProps {
  show: boolean;
  prospectCount: number;
  modificationType: 'icp' | 'prompts' | 'models';
  inline?: boolean;
}

export function ForkWarningBadge({ show, prospectCount, modificationType, inline = false }: ForkWarningBadgeProps) {
  if (!show) return null;

  const messages = {
    icp: 'Changing ICP brief',
    prompts: 'Editing AI prompts',
    models: 'Changing AI models'
  };

  const message = messages[modificationType];

  if (inline) {
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-400 bg-orange-50 dark:bg-orange-950">
        <GitBranch className="w-3 h-3 mr-1" />
        {message} will create new project (v2)
      </Badge>
    );
  }

  return (
    <Alert className="border-orange-400 bg-orange-50 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
        <strong className="font-semibold">Auto-Fork Warning:</strong>{' '}
        {message} with {prospectCount} existing {prospectCount === 1 ? 'prospect' : 'prospects'} will automatically create a forked project.
        {' '}Your original data will be preserved.
      </AlertDescription>
    </Alert>
  );
}
