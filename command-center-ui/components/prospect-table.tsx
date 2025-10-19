'use client';

import clsx from 'clsx';

export type ProspectRow = {
  name?: string;
  website: string;
  industry?: string;
  why_now?: string;
  teaser?: string;
};

type Props = {
  prospects: ProspectRow[];
  selectedUrls: string[];
  onSelectionChange: (urls: string[]) => void;
};

export default function ProspectTable({ prospects, selectedUrls, onSelectionChange }: Props) {
  const allSelected = prospects.length > 0 && selectedUrls.length === prospects.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(prospects.map((row) => row.website));
    }
  };

  const toggleSingle = (website: string) => {
    if (selectedUrls.includes(website)) {
      onSelectionChange(selectedUrls.filter((url) => url !== website));
    } else {
      onSelectionChange([...selectedUrls, website]);
    }
  };

  if (!prospects.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
        Generate prospects to see them here. Each row can be selected and passed to the analyzer.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={toggleAll} />
                Select
              </label>
            </th>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Industry</th>
            <th className="px-4 py-3 text-left">Why now</th>
            <th className="px-4 py-3 text-left">Teaser</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900 text-sm">
          {prospects.map((row) => {
            const selected = selectedUrls.includes(row.website);
            return (
              <tr key={row.website} className={clsx('transition-colors', selected ? 'bg-slate-900/80' : 'bg-slate-950/40 hover:bg-slate-900/50')}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected}
                    onChange={() => toggleSingle(row.website)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-100">{row.name || 'Unknown'}</span>
                    <a href={row.website} target="_blank" rel="noreferrer" className="text-xs">
                      {row.website}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">{row.industry || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{row.why_now || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{row.teaser || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

