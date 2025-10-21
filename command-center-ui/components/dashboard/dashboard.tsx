'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProspectForm, { ProspectFormValues } from '@/components/prospecting/prospect-form';
import AnalyzerPanel, { AnalyzerOptions } from '@/components/analysis/analyzer-panel';
import ProspectTable, { ProspectRow } from '@/components/prospecting/prospect-table';

type ProspectResponse = {
  companies: ProspectRow[];
  urls: string[];
  runId: string;
};

type AnalyzeResponse = {
  success: boolean;
  results?: any[];
  logs?: any[];
  error?: string;
};

export default function Dashboard() {
  const [briefText, setBriefText] = useState('');
  const [formValues, setFormValues] = useState<ProspectFormValues>({
    count: 20,
    city: '',
    verify: true,
    model: 'gpt-4o-mini',
    autoAnalyze: false,
    autoEmail: false
  });
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [prospectData, setProspectData] = useState<ProspectResponse | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [analysisLogs, setAnalysisLogs] = useState<any[]>([]);

  useEffect(() => {
    const loadBrief = async () => {
      try {
        const res = await fetch('/api/brief', { cache: 'no-store' });
        const json = await res.json();
        if (json?.brief) {
          setBriefText(JSON.stringify(json.brief, null, 2));
        }
      } catch (error: any) {
        console.error('Failed to load brief', error);
        setAlert('Failed to load default brief. Paste your own JSON to continue.');
      } finally {
        setLoadingBrief(false);
      }
    };

    loadBrief();
  }, []);

  const handleGenerate = useCallback(
    async (values: ProspectFormValues) => {
      setAlert(null);
      setAnalysisSummary('');
      setAnalysisLogs([]);

      let parsedBrief: any;
      try {
        parsedBrief = JSON.parse(briefText || '{}');
      } catch (error) {
        setAlert('Brief must be valid JSON before generating prospects.');
        return;
      }

      setLoadingProspects(true);
      try {
        const res = await fetch('/api/prospects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            brief: parsedBrief,
            count: values.count,
            city: values.city || undefined,
            model: values.model,
            verify: values.verify
          })
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to generate prospects');
        }

        const payload: ProspectResponse = {
          companies: json.companies || [],
          urls: json.urls || [],
          runId: json.runId
        };
        setProspectData(payload);
        setSelectedUrls(payload.urls || []);
        setAlert(`Generated ${payload.urls.length} verified URLs (Run ID: ${payload.runId}).`);
      } catch (error: any) {
        console.error(error);
        setAlert(error.message || 'Prospect generation failed');
      } finally {
        setLoadingProspects(false);
      }
    },
    [briefText]
  );

  const handleAnalyze = useCallback(
    async (options: AnalyzerOptions) => {
      if (!selectedUrls.length) {
        setAlert('Select at least one prospect before running the analyzer.');
        return;
      }

      setAnalysisRunning(true);
      setAnalysisSummary('');
      setAlert(null);
      setAnalysisLogs([]);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            urls: selectedUrls,
            options
          })
        });

        const json: AnalyzeResponse = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Analyzer run failed');
        }

        const count = json.results?.length ?? 0;
        setAnalysisSummary(`Analyzer completed. ${count} site${count === 1 ? '' : 's'} processed successfully.`);
        setAnalysisLogs(json.logs || []);
      } catch (error: any) {
        console.error(error);
        setAlert(error.message || 'Analyzer run failed');
      } finally {
        setAnalysisRunning(false);
      }
    },
    [selectedUrls]
  );

  const selectionInfo = useMemo(() => {
    const total = prospectData?.urls.length ?? 0;
    const selected = selectedUrls.length;
    return `${selected} selected of ${total}`;
  }, [prospectData?.urls.length, selectedUrls.length]);

  return (
    <div className="space-y-10">
      {alert && (
        <div className="rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
          {alert}
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProspectForm
            values={formValues}
            briefText={briefText}
            onBriefChange={setBriefText}
            onValuesChange={setFormValues}
            onSubmit={handleGenerate}
            loading={loadingProspects}
            loadingBrief={loadingBrief}
          />
        </div>
        <AnalyzerPanel
          disabled={!selectedUrls.length || analysisRunning}
          selectionSummary={selectionInfo}
          onRun={handleAnalyze}
          loading={analysisRunning}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">Prospect Results</h2>
          {prospectData && (
            <span className="text-xs text-slate-500">Run ID: {prospectData.runId}</span>
          )}
        </div>
        <ProspectTable
          prospects={prospectData?.companies || []}
          selectedUrls={selectedUrls}
          onSelectionChange={setSelectedUrls}
        />
      </section>

      {analysisSummary && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-100">Analyzer Summary</h3>
          <div className="rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
            <p>{analysisSummary}</p>
            {analysisLogs.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-brand-400">View raw logs</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-950/70 p-3 text-xs text-slate-400">
                  {JSON.stringify(analysisLogs, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

