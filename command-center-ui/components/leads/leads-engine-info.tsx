'use client';

/**
 * Leads Engine Info Component
 * Collapsible info panel showing pipeline position and usage instructions
 */

import { ChevronDown, ChevronUp, Users, Search, ScanSearch, Mail, FileText, CheckCircle2, MousePointerClick, ArrowRight } from 'lucide-react';

interface LeadsEngineInfoProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function LeadsEngineInfo({ isExpanded, onToggle }: LeadsEngineInfoProps) {
  return (
    <div className="group rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Leads</h3>
            <p className="text-sm text-muted-foreground hidden sm:block">Analyzed prospects with grades, scores, and actionable insights</p>
            <p className="text-sm text-muted-foreground sm:hidden">Graded prospects ready for outreach</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/50">
          <div className="pt-4 space-y-4">
            {/* Pipeline Position Indicator */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Pipeline Position</p>

              {/* Desktop: Full labels */}
              <div className="hidden sm:flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Search className="w-3.5 h-3.5" />
                  <span>Prospect</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ScanSearch className="w-3.5 h-3.5" />
                  <span>Analyze</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 rounded-md text-amber-600 dark:text-amber-400 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span>Leads</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Outreach</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Reports</span>
                </div>
              </div>

              {/* Mobile: Icons only */}
              <div className="flex sm:hidden items-center justify-between gap-1">
                <div className="p-1.5 rounded text-muted-foreground">
                  <Search className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="p-1.5 rounded text-muted-foreground">
                  <ScanSearch className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="p-1.5 bg-amber-500/20 rounded text-amber-600 dark:text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="p-1.5 rounded text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                <div className="p-1.5 rounded text-muted-foreground">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* What are leads */}
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                Leads are <span className="text-foreground font-medium">analyzed prospects</span> with website grades (A-F),
                performance scores, and AI-identified improvement opportunities.
              </p>
            </div>

            {/* How to use */}
            <div className="space-y-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How to use</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
                  <span>Click a row to view full analysis details</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Select leads to generate reports or outreach</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <Mail className="w-3.5 h-3.5 text-green-500" />
                  <span>Use action buttons for batch operations</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 sm:gap-4 pt-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">A-F Grades</span>
              <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">Top Issues</span>
              <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">Quick Wins</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsEngineInfo;
