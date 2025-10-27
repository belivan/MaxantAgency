'use client';

/**
 * Analysis Results Component
 * Table showing recent analyses with grades and priority badges
 */

import { useState, useEffect } from 'react';
import { ExternalLink, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { GradeBadge } from './grade-badge';
import { PriorityBadge } from './priority-badge';
import { Badge } from '@/components/ui/badge';

interface AnalysisResult {
  id: string;
  company_name: string;
  url: string;
  grade: string;
  overall_score: number;
  lead_priority: number;
  industry: string;
  analyzed_at: string;
  has_report: boolean;
}

export function AnalysisResults({ projectId, limit = 10 }: { projectId?: string | null; limit?: number }) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: limit.toString(),
          sort: 'analyzed_at',
          order: 'desc'
        });

        if (projectId) {
          params.append('project_id', projectId);
        }

        const response = await fetch(`/api/leads?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setResults(result.data || []);
          setTotal(result.total || 0);
        }
      } catch (error) {
        console.error('Failed to load analysis results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [projectId, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Analyses
            </CardTitle>
            <CardDescription className="mt-1">
              {total > 0 ? `${total} total analyses` : 'No analyses yet'}
            </CardDescription>
          </div>
          {total > limit && (
            <Button variant="outline" size="sm" asChild>
              <a href="/leads">View All</a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No analyses yet. Start analyzing prospects to see results here.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Analyzed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {result.company_name}
                        </span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          {new URL(result.url).hostname}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <GradeBadge
                        grade={result.grade}
                        score={result.overall_score}
                        size="sm"
                        showScore
                      />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge
                        priority={result.lead_priority}
                        score={result.lead_priority}
                        size="sm"
                        showScore={false}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {result.industry || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(result.analyzed_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/leads/${result.id}`}>
                          View Details
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AnalysisResults;
