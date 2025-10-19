import UnifiedDashboard from '@/components/unified-dashboard';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-10 flex flex-col gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-400">Maksant Command Center</span>
          <h1 className="text-3xl font-bold text-slate-100">Complete Lead Generation Pipeline</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Generate prospects → Analyze websites → Compose personalized emails. All three apps unified in one interface.
          </p>
        </header>
        <UnifiedDashboard />
      </div>
    </main>
  );
}

