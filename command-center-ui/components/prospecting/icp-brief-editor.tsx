'use client';

/**
 * ICP Brief Editor
 * JSON editor for Ideal Customer Profile briefs with validation
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileJson } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isValidJSON, parseJSON } from '@/lib/utils/validation';
import { cn } from '@/lib/utils';

interface ICPBriefEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
}

const DEFAULT_BRIEF = {
  business_type: "Restaurant",
  industry: "Food & Hospitality",
  target_description: "Italian restaurants in Philadelphia with 4+ star ratings",
  size_range: {
    min_employees: 10,
    max_employees: 100
  },
  location: {
    city: "Philadelphia",
    state: "PA",
    country: "USA"
  },
  exclusions: ["Fast food chains", "Cafes"],
  additional_criteria: {
    min_rating: 4.0,
    has_reviews: true
  }
};

const BRIEF_TEMPLATES = [
  {
    name: 'Restaurants',
    brief: DEFAULT_BRIEF
  },
  {
    name: 'Retail Stores',
    brief: {
      business_type: "Retail Store",
      industry: "Retail",
      target_description: "Independent boutique clothing stores",
      location: {
        city: "New York",
        state: "NY"
      }
    }
  },
  {
    name: 'Home Services',
    brief: {
      business_type: "Home Services",
      industry: "Home Improvement",
      target_description: "Plumbing and HVAC contractors",
      location: {
        city: "Boston",
        state: "MA"
      },
      additional_criteria: {
        licensed: true,
        insured: true
      }
    }
  }
];

export function ICPBriefEditor({ value, onChange, onValidChange }: ICPBriefEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Validate JSON
    const result = parseJSON(newValue);
    if (result.success) {
      setError(null);
      onValidChange?.(true);
    } else {
      setError(result.error);
      onValidChange?.(false);
    }
  };

  const loadTemplate = (templateBrief: any) => {
    const formatted = JSON.stringify(templateBrief, null, 2);
    handleChange(formatted);
  };

  const formatJSON = () => {
    const result = parseJSON(value);
    if (result.success) {
      const formatted = JSON.stringify(result.data, null, 2);
      handleChange(formatted);
    }
  };

  const isValid = !error && value.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileJson className="w-5 h-5" />
            <span>ICP Brief</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {isValid ? (
              <Badge variant="default" className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Valid JSON</span>
              </Badge>
            ) : error ? (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Invalid JSON</span>
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Templates */}
        <div className="space-y-2">
          <Label>Quick Templates</Label>
          <div className="flex flex-wrap gap-2">
            {BRIEF_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => loadTemplate(template.brief)}
              >
                {template.name}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={formatJSON}
              disabled={!isValid}
            >
              Format JSON
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <Label htmlFor="icp-brief">
            Brief Configuration
            <span className="text-muted-foreground text-xs ml-2">
              (JSON format)
            </span>
          </Label>
          <Textarea
            id="icp-brief"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'font-mono text-sm min-h-[300px]',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            placeholder={JSON.stringify(DEFAULT_BRIEF, null, 2)}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">JSON Error</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Required fields:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><code className="text-xs">business_type</code> - Type of business</li>
            <li><code className="text-xs">industry</code> - Industry category</li>
            <li><code className="text-xs">target_description</code> - Detailed description</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default ICPBriefEditor;
