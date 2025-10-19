'use client';

import clsx from 'clsx';
import { useState } from 'react';

type Props = {
  selectedLeadIds: string[];
  leads: Array<{ id: string; url: string; company_name?: string }>;
};

type EmailResult = {
  url: string;
  company: string;
  subject: string;
  body: string;
  qualityScore?: number;
  supabaseId?: string;
  notionPageId?: string;
};

const strategies = [
  { value: 'compliment-sandwich', label: 'Compliment Sandwich (Recommended)' },
  { value: 'problem-first', label: 'Problem-First' },
  { value: 'achievement-focused', label: 'Achievement-Focused' },
  { value: 'question-based', label: 'Question-Based' }
];

export default function EmailComposer({ selectedLeadIds, leads }: Props) {
  const [strategy, setStrategy] = useState('compliment-sandwich');
  const [generateVariants, setGenerateVariants] = useState(false);
  const [verify, setVerify] = useState(false);
  const [composing, setComposing] = useState(false);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedLeads = leads.filter(lead => selectedLeadIds.includes(lead.id));

  const handleCompose = async () => {
    if (selectedLeads.length === 0) {
      setError('Select at least one lead to compose emails');
      return;
    }

    setComposing(true);
    setError(null);
    setResults([]);

    try {
      const newResults: EmailResult[] = [];

      for (const lead of selectedLeads) {
        try {
          const response = await fetch('/api/compose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: lead.url,
              strategy,
              generateVariants,
              verify
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Composition failed');
          }

          newResults.push({
            url: lead.url,
            company: data.lead?.company || lead.company_name || 'Unknown',
            subject: data.email?.subject || data.email?.subjects?.[0] || 'No subject',
            body: data.email?.body || data.email?.bodies?.[0] || 'No body',
            qualityScore: data.validation?.score || data.validation?.subjects?.[0]?.score,
            supabaseId: data.supabase_id,
            notionPageId: data.notion_page_id
          });
        } catch (err: any) {
          console.error(`Failed to compose for ${lead.url}:`, err);
          newResults.push({
            url: lead.url,
            company: lead.company_name || 'Unknown',
            subject: 'Error',
            body: err.message || 'Composition failed'
          });
        }
      }

      setResults(newResults);
    } catch (err: any) {
      setError(err.message || 'Failed to compose emails');
    } finally {
      setComposing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Email Composer</h2>
            <p className="text-xs text-slate-500">
              Compose personalized emails for selected leads using AI
            </p>
          </div>
          <span className="text-sm text-slate-400">
            {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Email Strategy
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              disabled={composing}
              className="rounded border-slate-700 bg-slate-800 px-3 py-2"
            >
              {strategies.map((strat) => (
                <option key={strat.value} value={strat.value}>
                  {strat.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={generateVariants}
                onChange={(e) => setGenerateVariants(e.target.checked)}
                disabled={composing}
                className="h-4 w-4"
              />
              Generate A/B variants
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={verify}
                onChange={(e) => setVerify(e.target.checked)}
                disabled={composing}
                className="h-4 w-4"
              />
              Re-verify website data
            </label>
          </div>

          <button
            onClick={handleCompose}
            disabled={composing || selectedLeads.length === 0}
            className={clsx(
              'w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow transition-colors',
              'hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {composing ? 'Composing Emails...' : `Compose ${selectedLeads.length} Email${selectedLeads.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">
            Generated Emails ({results.length})
          </h3>

          {results.map((result, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-100">{result.company}</h4>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:underline"
                  >
                    {result.url}
                  </a>
                </div>
                {result.qualityScore && (
                  <span className="rounded bg-green-600 px-3 py-1 text-xs font-bold text-white">
                    Score: {result.qualityScore}/100
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={result.subject}
                    readOnly
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Body
                  </label>
                  <textarea
                    value={result.body}
                    readOnly
                    rows={8}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${result.subject}\n\n${result.body}`);
                  }}
                  className="rounded bg-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600"
                >
                  Copy to Clipboard
                </button>

                {result.notionPageId && (
                  <a
                    href={`https://notion.so/${result.notionPageId.replace(/-/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600"
                  >
                    View in Notion
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
