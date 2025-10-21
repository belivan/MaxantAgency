'use client';

import { useState, useEffect } from 'react';

type Stats = {
  prospects: {
    total: number;
    pending: number;
    queued: number;
    analyzed: number;
  };
  leads: {
    total: number;
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
    withEmail: number;
  };
  emails: {
    total: number;
    pending: number;
    approved: number;
    sent: number;
    rejected: number;
  };
};

export default function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats({
        prospects: data.prospects,
        leads: data.leads,
        emails: data.emails
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-400">
        Loading statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="mb-6 text-xl font-semibold text-slate-100">Pipeline Overview</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Prospects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Prospects
              </h3>
              <span className="text-2xl font-bold text-brand-400">{stats.prospects.total}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Pending Analysis</span>
                <span className="font-medium">{stats.prospects.pending}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Queued</span>
                <span className="font-medium">{stats.prospects.queued}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Analyzed</span>
                <span className="font-medium text-green-400">{stats.prospects.analyzed}</span>
              </div>
            </div>
          </div>

          {/* Leads */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Analyzed Leads
              </h3>
              <span className="text-2xl font-bold text-emerald-400">{stats.leads.total}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Grade A</span>
                <span className="font-medium text-green-400">{stats.leads.A}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Grade B</span>
                <span className="font-medium text-blue-400">{stats.leads.B}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>With Email</span>
                <span className="font-medium">{stats.leads.withEmail}</span>
              </div>
            </div>
          </div>

          {/* Emails */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Emails
              </h3>
              <span className="text-2xl font-bold text-purple-400">{stats.emails.total}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Pending Review</span>
                <span className="font-medium text-yellow-400">{stats.emails.pending}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Approved</span>
                <span className="font-medium text-blue-400">{stats.emails.approved}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Sent</span>
                <span className="font-medium text-green-400">{stats.emails.sent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-gradient-to-br from-brand-600/20 to-brand-800/20 p-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-100">Ready to Contact</h3>
          <p className="mb-4 text-3xl font-bold text-brand-400">
            {stats.leads.A + stats.leads.B}
          </p>
          <p className="text-xs text-slate-400">Grade A & B leads with complete data</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 p-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-100">Conversion Rate</h3>
          <p className="mb-4 text-3xl font-bold text-emerald-400">
            {stats.leads.total > 0
              ? Math.round((stats.leads.withEmail / stats.leads.total) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-slate-400">Leads with email addresses</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-gradient-to-br from-purple-600/20 to-purple-800/20 p-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-100">Email Success</h3>
          <p className="mb-4 text-3xl font-bold text-purple-400">
            {stats.emails.total > 0
              ? Math.round((stats.emails.sent / stats.emails.total) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-slate-400">Emails sent successfully</p>
        </div>
      </div>
    </div>
  );
}
