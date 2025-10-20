'use client';

/**
 * Email Strategy Selector
 * Choose email outreach strategy and view details
 */

import { useState, useEffect } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getStrategies } from '@/lib/api/outreach';
import type { EmailStrategy } from '@/lib/types';

interface EmailStrategySelectorProps {
  selectedStrategy?: string;
  onStrategyChange: (strategyId: string) => void;
  disabled?: boolean;
}

export function EmailStrategySelector({
  selectedStrategy,
  onStrategyChange,
  disabled
}: EmailStrategySelectorProps) {
  const [strategies, setStrategies] = useState<EmailStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStrategies = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getStrategies();
      setStrategies(data);

      // Auto-select first strategy if none selected
      if (!selectedStrategy && data.length > 0) {
        onStrategyChange(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load strategies:', err);
      setError(err.message || 'Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const currentStrategy = strategies.find(s => s.id === selectedStrategy);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Strategy
            </CardTitle>
            <CardDescription>
              Choose the outreach strategy for your campaign
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStrategies}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading && strategies.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : strategies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No email strategies found</p>
            <p className="text-xs mt-2">
              Make sure the outreach engine is running
            </p>
          </div>
        ) : (
          <>
            {/* Strategy Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Strategy</label>
              <Select
                value={selectedStrategy}
                onValueChange={onStrategyChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(strategy => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Details */}
            {currentStrategy && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <h4 className="font-medium mb-1">{currentStrategy.name}</h4>
                  {currentStrategy.description && (
                    <p className="text-sm text-muted-foreground">
                      {currentStrategy.description}
                    </p>
                  )}
                </div>

                {/* Strategy Metadata */}
                <div className="flex flex-wrap gap-2">
                  {currentStrategy.tone && (
                    <Badge variant="outline">
                      Tone: {currentStrategy.tone}
                    </Badge>
                  )}
                  {currentStrategy.focus && (
                    <Badge variant="outline">
                      Focus: {currentStrategy.focus}
                    </Badge>
                  )}
                  {currentStrategy.variant_count !== undefined && (
                    <Badge variant="outline">
                      {currentStrategy.variant_count} variant{currentStrategy.variant_count !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Key Points */}
                {currentStrategy.key_points && currentStrategy.key_points.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Points:</p>
                    <ul className="space-y-1">
                      {currentStrategy.key_points.map((point, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example Subject Lines */}
                {currentStrategy.example_subjects && currentStrategy.example_subjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Example Subject Lines:</p>
                    <div className="space-y-1">
                      {currentStrategy.example_subjects.slice(0, 3).map((subject, idx) => (
                        <div
                          key={idx}
                          className="text-sm p-2 border rounded bg-background"
                        >
                          "{subject}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default EmailStrategySelector;
