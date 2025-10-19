'use client';

type Props = {
  current: number;
  total: number;
  currentStep?: string;
  estimatedTimeRemaining?: number; // in seconds
  operation: string; // e.g., "Analyzing", "Generating", "Composing"
};

export default function ProgressBar({ current, total, currentStep, estimatedTimeRemaining, operation }: Props) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-2 rounded-lg border border-brand-600/30 bg-brand-950/20 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-400">
          {operation} {current} of {total}
        </span>
        {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
          <span className="text-xs text-slate-400">
            ~{formatTime(estimatedTimeRemaining)} remaining
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Current step */}
      {currentStep && (
        <p className="text-xs text-slate-400">{currentStep}</p>
      )}

      {/* Percentage */}
      <p className="text-xs text-right text-slate-500">{percentage}%</p>
    </div>
  );
}
