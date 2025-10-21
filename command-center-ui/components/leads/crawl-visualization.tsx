'use client';

/**
 * Crawl Visualization Component
 * Visualizes multi-page crawl metadata with stats and optional tree view
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Globe,
  FileText,
  Link as LinkIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrawlMetadata {
  pages_crawled?: number;
  links_found?: number;
  total_links?: number;
  crawl_time?: number;
  crawl_time_ms?: number;
  failed_pages?: number;
  depth_distribution?: {
    level_1?: number;
    level_2?: number;
    level_3_plus?: number;
  };
  page_types?: {
    [key: string]: number;
  };
}

interface CrawlVisualizationProps {
  crawlMetadata: CrawlMetadata;
  maxPages?: number;
  className?: string;
}

export function CrawlVisualization({
  crawlMetadata,
  maxPages = 30,
  className
}: CrawlVisualizationProps) {
  const pagesCrawled = crawlMetadata.pages_crawled || 0;
  const linksFound = crawlMetadata.links_found || crawlMetadata.total_links || 0;
  const crawlTime = crawlMetadata.crawl_time || crawlMetadata.crawl_time_ms || 0;
  const failedPages = crawlMetadata.failed_pages || 0;
  const successPages = pagesCrawled - failedPages;

  // Calculate crawl efficiency
  const crawlCompletionPercentage = maxPages > 0 ? (pagesCrawled / maxPages) * 100 : 0;
  const successRate = pagesCrawled > 0 ? (successPages / pagesCrawled) * 100 : 0;

  // Depth distribution data
  const hasDepthData = crawlMetadata.depth_distribution &&
    Object.keys(crawlMetadata.depth_distribution).length > 0;

  const depthData = hasDepthData
    ? [
        { level: 'Level 1', count: crawlMetadata.depth_distribution!.level_1 || 0, color: 'bg-blue-500' },
        { level: 'Level 2', count: crawlMetadata.depth_distribution!.level_2 || 0, color: 'bg-green-500' },
        { level: 'Level 3+', count: crawlMetadata.depth_distribution!.level_3_plus || 0, color: 'bg-purple-500' }
      ]
    : [];

  const maxDepthCount = Math.max(...depthData.map(d => d.count), 1);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-teal-500" />
          Crawl Statistics
        </CardTitle>
        <CardDescription>
          Multi-page analysis metadata and performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pages Crawled */}
          <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <Badge variant="secondary" className="text-xs">
                {successPages}/{pagesCrawled}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{pagesCrawled}</div>
            <div className="text-xs text-muted-foreground">Pages Crawled</div>
          </div>

          {/* Links Found */}
          <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <LinkIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold">{linksFound}</div>
            <div className="text-xs text-muted-foreground">Links Discovered</div>
          </div>

          {/* Crawl Time */}
          <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold">
              {crawlTime > 1000 ? `${(crawlTime / 1000).toFixed(1)}s` : `${crawlTime}ms`}
            </div>
            <div className="text-xs text-muted-foreground">Crawl Duration</div>
          </div>

          {/* Success Rate */}
          <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              {failedPages > 0 ? (
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
              <Badge
                variant={failedPages > 0 ? "destructive" : "secondary"}
                className="text-xs"
              >
                {failedPages} failed
              </Badge>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              failedPages > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
            )}>
              {Math.round(successRate)}%
            </div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Crawl Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Crawl Completion</span>
            <span className="font-mono font-semibold">
              {pagesCrawled}/{maxPages} pages ({Math.round(crawlCompletionPercentage)}%)
            </span>
          </div>
          <Progress value={Math.min(crawlCompletionPercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {crawlCompletionPercentage >= 100
              ? 'Maximum pages limit reached'
              : `${maxPages - pagesCrawled} pages remaining before limit`}
          </p>
        </div>

        {/* Depth Distribution */}
        {hasDepthData && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-sm">Page Depth Distribution</h4>
            </div>
            <div className="space-y-2">
              {depthData.map((item, idx) => {
                const percentage = (item.count / maxDepthCount) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.level}</span>
                      <span className="font-mono font-semibold">{item.count} pages</span>
                    </div>
                    <div className="relative h-6 bg-muted rounded overflow-hidden">
                      <div
                        className={cn("h-full transition-all", item.color)}
                        style={{ width: `${percentage}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {percentage > 15 && `${item.count} pages`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              <strong>Level 1:</strong> Main navigation pages •{' '}
              <strong>Level 2:</strong> Sub-pages •{' '}
              <strong>Level 3+:</strong> Deep pages
            </p>
          </div>
        )}

        {/* Performance Insights */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-900 dark:text-blue-100">
            <strong>Analysis Quality:</strong>{' '}
            {successRate >= 90
              ? 'Excellent - comprehensive site coverage with minimal errors.'
              : successRate >= 75
              ? 'Good - majority of pages analyzed successfully.'
              : 'Limited - some pages could not be crawled, analysis may be incomplete.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CrawlVisualization;
