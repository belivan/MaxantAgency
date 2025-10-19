'use client';

import { useState } from 'react';
import clsx from 'clsx';
import StatsOverview from './stats-overview';
import ProspectForm, { ProspectFormValues } from './prospect-form';
import AnalyzerPanel, { AnalyzerOptions } from './analyzer-panel';
import ProspectTable, { ProspectRow } from './prospect-table';
import LeadsTable, { Lead } from './leads-table';
import EmailComposer from './email-composer';

type Tab = 'overview' | 'prospects' | 'leads' | 'emails';

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

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Prospects tab state
  const [briefText, setBriefText] = useState('');
  const [formValues, setFormValues] = useState<ProspectFormValues>({
    count: 20,
    city: '',
    verify: true,
    model: 'grok-4-fast'
  });
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [prospectData, setProspectData] = useState<ProspectResponse | null>(null);
  const [selectedProspectUrls, setSelectedProspectUrls] = useState<string[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [analysisLogs, setAnalysisLogs] = useState<any[]>([]);

  // Leads tab state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadsForComposer, setLeadsForComposer] = useState<Lead[]>([]);

  // Load brief on mount
  useState(() => {
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
  });

  const handleGenerateProspects = async (values: ProspectFormValues) => {
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
        headers: { 'Content-Type': 'application/json' },
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
      setSelectedProspectUrls(payload.urls || []);
      setAlert(`Generated ${payload.urls.length} verified URLs (Run ID: ${payload.runId}).`);
    } catch (error: any) {
      console.error(error);
      setAlert(error.message || 'Prospect generation failed');
    } finally {
      setLoadingProspects(false);
    }
  };

  const handleAnalyze = async (options: AnalyzerOptions) => {
    if (!selectedProspectUrls.length) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: selectedProspectUrls,
          options
        })
      });

      const json: AnalyzeResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Analyzer run failed');
      }

      const count = json.results?.length ?? 0;
      setAnalysisSummary(
        `Analyzer completed. ${count} site${count === 1 ? '' : 's'} processed successfully.`
      );
      setAnalysisLogs(json.logs || []);
    } catch (error: any) {
      console.error(error);
      setAlert(error.message || 'Analyzer run failed');
    } finally {
      setAnalysisRunning(false);
    }
  };

  const handleLeadSelection = (leadIds: string[]) => {
    setSelectedLeadIds(leadIds);
  };

  // Fetch leads to pass to email composer when switching to emails tab
  const fetchSelectedLeads = async () => {
    if (selectedLeadIds.length === 0) return;

    try {
      const response = await fetch('/api/leads');
      const data = await response.json();
      if (data.success) {
        const selected = data.leads.filter((lead: Lead) =>
          selectedLeadIds.includes(lead.id)
        );
        setLeadsForComposer(selected);
      }
    } catch (error) {
      console.error('Failed to fetch leads for composer:', error);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'emails') {
      fetchSelectedLeads();
    }
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: '📊' },
    { id: 'prospects' as Tab, label: 'Prospects', icon: '🔍' },
    { id: 'leads' as Tab, label: 'Leads', icon: '🎯' },
    { id: 'emails' as Tab, label: 'Emails', icon: '✉️' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'flex-1 rounded-md px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && <StatsOverview />}

        {activeTab === 'prospects' && (
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
                  onSubmit={handleGenerateProspects}
                  loading={loadingProspects}
                  loadingBrief={loadingBrief}
                />
              </div>
              <AnalyzerPanel
                disabled={!selectedProspectUrls.length || analysisRunning}
                selectionSummary={`${selectedProspectUrls.length} of ${prospectData?.urls.length || 0}`}
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
                selectedUrls={selectedProspectUrls}
                onSelectionChange={setSelectedProspectUrls}
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
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Analyzed Leads</h2>
                <p className="text-sm text-slate-400">
                  Select leads to compose personalized emails
                </p>
              </div>
              {selectedLeadIds.length > 0 && (
                <button
                  onClick={() => setActiveTab('emails')}
                  className="rounded-md bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-500"
                >
                  Compose {selectedLeadIds.length} Email{selectedLeadIds.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <LeadsTable
              selectedLeads={selectedLeadIds}
              onSelectionChange={handleLeadSelection}
            />
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">Email Composer</h2>
              <p className="text-sm text-slate-400">
                Generate personalized outreach emails using AI
              </p>
            </div>
            <EmailComposer selectedLeadIds={selectedLeadIds} leads={leadsForComposer} />
          </div>
        )}
      </div>
    </div>
  );
}
