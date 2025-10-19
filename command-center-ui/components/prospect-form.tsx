'use client';

import clsx from 'clsx';
import { useCallback } from 'react';

export type ProspectFormValues = {
  count: number;
  city: string;
  verify: boolean;
  model: string;
  autoAnalyze: boolean;
  autoEmail: boolean;
};

type Props = {
  values: ProspectFormValues;
  briefText: string;
  loading: boolean;
  loadingBrief: boolean;
  onBriefChange: (value: string) => void;
  onValuesChange: (value: ProspectFormValues) => void;
  onSubmit: (values: ProspectFormValues) => Promise<void> | void;
};

const models = [
  { value: 'grok-4-fast', label: 'Grok 4 Fast (Recommended - Real Companies via Web Search)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast but may generate fake companies)' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet' }
];

export default function ProspectForm({
  values,
  briefText,
  loading,
  loadingBrief,
  onBriefChange,
  onValuesChange,
  onSubmit
}: Props) {
  const handleNumericChange = useCallback(
    (field: keyof ProspectFormValues, fallback = 0) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        onValuesChange({ ...values, [field]: Number.isNaN(value) ? fallback : value });
      },
    [onValuesChange, values]
  );

  const handleCityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onValuesChange({ ...values, city: event.target.value });
    },
    [onValuesChange, values]
  );

  const handleModelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onValuesChange({ ...values, model: event.target.value });
    },
    [onValuesChange, values]
  );

  const handleVerifyToggle = useCallback(() => {
    onValuesChange({ ...values, verify: !values.verify });
  }, [onValuesChange, values]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSubmit(values);
    },
    [onSubmit, values]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Prospect Generation</h2>
          <p className="text-xs text-slate-500">Edit the brief JSON, tweak parameters, and generate a fresh prospect list.</p>
        </div>
        <button
          type="submit"
          disabled={loading || loadingBrief}
          className={clsx(
            'h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow transition-colors',
            'hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400'
          )}
        >
          {loading ? 'Generating…' : 'Generate Prospects'}
        </button>
      </div>

      <div>
        <label htmlFor="brief" className="mb-2 block text-sm font-medium text-slate-300">
          Brief JSON
        </label>
        <textarea
          id="brief"
          name="brief"
          rows={12}
          className="w-full font-mono text-xs"
          value={briefText}
          onChange={(event) => onBriefChange(event.target.value)}
          disabled={loading}
        />
        <p className="mt-2 text-xs text-slate-500">
          Paste or edit the JSON used to brief the LLM. The structure mirrors <code>client-orchestrator/brief.json</code>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Company Count
          <input
            type="number"
            min={1}
            max={100}
            value={values.count}
            onChange={handleNumericChange('count', 20)}
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          City / Region Bias
          <input
            type="text"
            placeholder="e.g. Philadelphia, PA"
            value={values.city}
            onChange={handleCityChange}
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Model
          <select value={values.model} onChange={handleModelChange} disabled={loading}>
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4" checked={values.verify} onChange={handleVerifyToggle} disabled={loading} />
          Verify URLs before saving (HEAD request)
        </label>
      </div>
    </form>
  );
}

