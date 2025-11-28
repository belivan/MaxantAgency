'use client';

/**
 * Analysis Step Indicator
 * Visual step progress indicator for the analysis workflow
 */

import { CheckCircle2, FolderOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisStepIndicatorProps {
  currentStep: 1 | 2;
}

const STEPS = [
  { num: 1, label: 'Select Project', icon: FolderOpen },
  { num: 2, label: 'Select & Analyze', icon: Sparkles }
];

export function AnalysisStepIndicator({ currentStep }: AnalysisStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center py-3">
      {STEPS.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.num} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs sm:text-sm font-medium transition-colors duration-300',
                  isCompleted && 'text-green-600',
                  isCurrent && 'text-primary',
                  !isCompleted && !isCurrent && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-12 sm:w-16 md:w-24 h-0.5 mx-1.5 sm:mx-2 transition-colors duration-300',
                  step.num < currentStep ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AnalysisStepIndicator;
