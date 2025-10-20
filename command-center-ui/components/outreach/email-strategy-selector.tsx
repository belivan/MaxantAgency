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
            <div>
              <Select
                value={selectedStrategy}
                onValueChange={onStrategyChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy..." />
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default EmailStrategySelector;
