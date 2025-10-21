'use client';

import clsx from 'clsx';
import { useState } from 'react';

export type AnalyzerOptions = {
  tier: 'tier1' | 'tier2' | 'tier3';
  emailType: 'local' | 'national';
  modules: string[];
  textModel?: string;
  visionModel?: string;
  metadata?: {
    campaignId?: string;
    projectId?: string;
    clientName?: string;
  };
  autoEmail?: boolean;
};

type Props = {
  disabled: boolean;
  loading: boolean;
  selectionSummary: string;
  onRun: (options: AnalyzerOptions) => Promise<void> | void;
};

const moduleOptions = [
  { value: 'seo', label: 'SEO' },
  { value: 'visual', label: 'Visual' },
  { value: 'industry', label: 'Industry' },
  { value: 'competitor', label: 'Competitor' }
];

const textModels = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini (Fast & Cheap)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'grok-4-fast', label: 'Grok 4 Fast' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }
];

const visionModels = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Vision)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Cheaper)' }
];

export default function AnalyzerPanel({ disabled, loading, selectionSummary, onRun }: Props) {
  const [tier, setTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [emailType, setEmailType] = useState<'local' | 'national'>('local');
  const [modules, setModules] = useState<string[]>(['seo']);
  const [textModel, setTextModel] = useState('gpt-5-mini');
  const [visionModel, setVisionModel] = useState('gpt-4o');
  const [campaignId, setCampaignId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientName, setClientName] = useState('');

  const toggleModule = (value: string) => {
    setModules((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await onRun({
      tier,
      emailType,
      modules,
      textModel,
      visionModel,
      metadata: {
        campaignId: campaignId || undefined,
        projectId: projectId || undefined,
        clientName: clientName || undefined
      }
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Analyzer</h2>
          <p className="text-xs text-slate-500">Configure modules and run the analyzer on selected prospects.</p>
        </div>
        <span className="text-xs text-slate-500">{selectionSummary}</span>
      </div>

      <div className="space-y-4 text-sm text-slate-300">
        <label className="flex flex-col gap-2">
          Depth Tier
          <select value={tier} onChange={(event) => setTier(event.target.value as any)} disabled={loading || disabled}>
            <option value="tier1">Tier 1 – Fast</option>
            <option value="tier2">Tier 2 – Standard</option>
            <option value="tier3">Tier 3 – Comprehensive</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          Email Template Type
          <select value={emailType} onChange={(event) => setEmailType(event.target.value as any)} disabled={loading || disabled}>
            <option value="local">Local</option>
            <option value="national">National</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          Text Model (for analysis & emails)
          <select value={textModel} onChange={(event) => setTextModel(event.target.value)} disabled={loading || disabled}>
            {textModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          Vision Model (for screenshots)
          <select value={visionModel} onChange={(event) => setVisionModel(event.target.value)} disabled={loading || disabled}>
            {visionModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modules</legend>
          {moduleOptions.map((option) => {
            const checked = modules.includes(option.value);
            return (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => toggleModule(option.value)}
                  disabled={loading || disabled}
                />
                {option.label}
              </label>
            );
          })}
        </fieldset>

        <div className="grid gap-3 text-xs text-slate-400">
          <label className="flex flex-col gap-1">
            Campaign ID (optional)
            <input
              type="text"
              placeholder="fall-offer"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              disabled={loading}
            />
          </label>
          <label className="flex flex-col gap-1">
            Project ID
            <input
              type="text"
              placeholder="client-acme"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={loading}
            />
          </label>
          <label className="flex flex-col gap-1">
            Client Name
            <input
              type="text"
              placeholder="Acme Transport"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || loading}
        className={clsx(
          'w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors',
          'hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400'
        )}
      >
        {loading ? 'Running Analyzer…' : 'Run Analyzer'}
      </button>
    </div>
  );
}

