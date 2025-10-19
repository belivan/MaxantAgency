'use client';

import clsx from 'clsx';
import { useState, useEffect } from 'react';

export type Lead = {
  id: string;
  url: string;
  company_name?: string;
  industry?: string;
  lead_grade?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;
  location?: string;
  created_at?: string;
  analysis_cost?: number;
  analysis_time?: number;
};

type Props = {
  selectedLeads: string[];
  onSelectionChange: (leadIds: string[]) => void;
};

export default function LeadsTable({ selectedLeads, onSelectionChange }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (gradeFilter) params.append('grade', gradeFilter);
      if (emailFilter) params.append('hasEmail', 'true');
      params.append('limit', '100');

      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setLeads(data.leads || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [gradeFilter, emailFilter]);

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map(lead => lead.id));
    }
  };

  const toggleSingle = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    } else {
      onSelectionChange([...selectedLeads, leadId]);
    }
  };

  const getGradeBadgeColor = (grade?: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-600 text-white';
      case 'B':
        return 'bg-blue-600 text-white';
      case 'C':
        return 'bg-yellow-600 text-white';
      case 'D':
        return 'bg-orange-600 text-white';
      case 'F':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-400">
        Loading leads...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchLeads}
          className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Grade:
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded border-slate-700 bg-slate-800 px-3 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="A">A - Excellent</option>
            <option value="B">B - Good</option>
            <option value="C">C - Fair</option>
            <option value="D">D - Poor</option>
            <option value="F">F - Failed</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={emailFilter}
            onChange={(e) => setEmailFilter(e.target.checked)}
            className="h-4 w-4"
          />
          Has Email Only
        </label>

        <div className="ml-auto text-sm text-slate-500">
          {leads.length} lead{leads.length !== 1 ? 's' : ''} • {selectedLeads.length} selected
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
          No leads found. Analyze some prospects first!
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                    Select
                  </label>
                </th>
                <th className="px-4 py-3 text-left">Grade</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Industry</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-sm">
              {leads.map((lead) => {
                const selected = selectedLeads.includes(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={clsx(
                      'transition-colors',
                      selected ? 'bg-slate-900/80' : 'bg-slate-950/40 hover:bg-slate-900/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected}
                        onChange={() => toggleSingle(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'rounded px-2 py-1 text-xs font-bold',
                          getGradeBadgeColor(lead.lead_grade)
                        )}
                      >
                        {lead.lead_grade || '?'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">
                          {lead.company_name || 'Unknown'}
                        </span>
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-400 hover:underline"
                        >
                          {lead.url}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{lead.industry || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col text-xs">
                        {lead.contact_email && (
                          <a
                            href={`mailto:${lead.contact_email}`}
                            className="text-brand-400 hover:underline"
                          >
                            {lead.contact_email}
                          </a>
                        )}
                        {lead.contact_phone && (
                          <span className="text-slate-400">{lead.contact_phone}</span>
                        )}
                        {!lead.contact_email && !lead.contact_phone && (
                          <span className="text-slate-600">No contact</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{lead.location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {lead.analysis_cost ? `$${lead.analysis_cost.toFixed(3)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
