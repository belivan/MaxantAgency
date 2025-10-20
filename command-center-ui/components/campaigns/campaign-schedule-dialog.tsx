'use client';

/**
 * Campaign Schedule Dialog
 * Create/edit automated campaign schedules
 */

import { useState } from 'react';
import { Calendar, Clock, DollarSign, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SCHEDULE_PRESETS, type CampaignConfig } from '@/lib/types';

interface CampaignScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: CampaignConfig) => void | Promise<void>;
  projectId?: string;
  isLoading?: boolean;
}

export function CampaignScheduleDialog({
  open,
  onOpenChange,
  onSubmit,
  projectId,
  isLoading
}: CampaignScheduleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('weekdays-9am');
  const [customCron, setCustomCron] = useState('');

  // ICP Brief
  const [icpBrief, setIcpBrief] = useState(`{
  "industry": "Italian restaurants",
  "location": "Philadelphia, PA",
  "target_size": "small to medium",
  "focus": "local family-owned businesses"
}`);
  const [icpValid, setIcpValid] = useState(true);

  // Steps configuration
  const [enableProspecting, setEnableProspecting] = useState(true);
  const [prospectCount, setProspectCount] = useState('20');
  const [prospectCity, setProspectCity] = useState('');

  const [enableAnalysis, setEnableAnalysis] = useState(true);
  const [analysisTier, setAnalysisTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');
  const [captureScreenshots, setCaptureScreenshots] = useState(true);

  const [enableOutreach, setEnableOutreach] = useState(true);
  const [autoSend, setAutoSend] = useState(false);

  // Budget limits
  const [dailyMax, setDailyMax] = useState('10.00');
  const [weeklyMax, setWeeklyMax] = useState('50.00');

  const selectedPreset = SCHEDULE_PRESETS.find(p => p.id === schedulePreset);
  const cronExpression = schedulePreset === 'custom' ? customCron : selectedPreset?.cron || '';

  const validateIcpBrief = (value: string) => {
    try {
      JSON.parse(value);
      setIcpValid(true);
      return true;
    } catch {
      setIcpValid(false);
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validate ICP brief
    if (!validateIcpBrief(icpBrief)) {
      alert('ICP Brief must be valid JSON');
      return;
    }

    const briefObject = JSON.parse(icpBrief);

    const config: CampaignConfig = {
      name,
      description: description || undefined,
      project_id: projectId,
      schedule: {
        cron: cronExpression,
        enabled: true
      },
      steps: [],
      budget: {
        daily_max: parseFloat(dailyMax),
        weekly_max: parseFloat(weeklyMax)
      }
    };

    // Add steps
    if (enableProspecting) {
      config.steps.push({
        type: 'prospecting',
        config: {
          brief: briefObject,  // ← ADD THE BRIEF!
          count: parseInt(prospectCount),
          city: prospectCity || undefined
        }
      });
    }

    if (enableAnalysis) {
      config.steps.push({
        type: 'analysis',
        config: {
          tier: analysisTier,
          modules: ['all'],
          capture_screenshots: captureScreenshots
        }
      });
    }

    if (enableOutreach) {
      config.steps.push({
        type: 'outreach',
        config: {
          compose: true,
          auto_send: autoSend
        }
      });
    }

    await onSubmit(config);
  };

  const isValid = name.trim() !== '' && cronExpression !== '' && icpValid && (enableProspecting || enableAnalysis || enableOutreach);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Schedule Automated Campaign</span>
          </DialogTitle>
          <DialogDescription>
            Configure an automated campaign that runs on a schedule, executing prospecting, analysis, and outreach steps automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="target" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="target">Target</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          {/* Fixed height container for all tabs */}
          <div className="h-[500px] overflow-y-auto">

          {/* Target Tab - ICP Brief */}
          <TabsContent value="target" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="icp-brief">
                ICP Brief (Ideal Customer Profile) *
              </Label>
              <Textarea
                id="icp-brief"
                placeholder="Enter JSON describing your target customers..."
                value={icpBrief}
                onChange={(e) => {
                  setIcpBrief(e.target.value);
                  validateIcpBrief(e.target.value);
                }}
                rows={12}
                className={`font-mono text-sm ${!icpValid ? 'border-destructive' : ''}`}
              />
              {!icpValid && (
                <p className="text-sm text-destructive">
                  Invalid JSON format
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This defines what businesses the campaign will search for. Must be valid JSON.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold">Example ICP Brief:</p>
              <pre className="text-xs overflow-x-auto">
{`{
  "industry": "Italian restaurants",
  "location": "Philadelphia, PA",
  "target_size": "small to medium",
  "focus": "local family-owned"
}`}
              </pre>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Philly Restaurants Weekly"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule *</Label>
              <Select value={schedulePreset} onValueChange={setSchedulePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div>
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {schedulePreset === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron Expression *</Label>
                <Input
                  id="cron"
                  placeholder="0 9 * * 1"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: minute hour day month weekday. Example: "0 9 * * 1" = Mondays at 9am
                </p>
              </div>
            )}
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps" className="space-y-6">
            {/* Prospecting Step */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-prospecting"
                  checked={enableProspecting}
                  onCheckedChange={(checked) => setEnableProspecting(checked as boolean)}
                />
                <Label htmlFor="enable-prospecting" className="font-semibold">
                  Step 1: Prospecting
                </Label>
              </div>

              {enableProspecting && (
                <div className="space-y-3 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="prospect-count">Number of Prospects</Label>
                    <Input
                      id="prospect-count"
                      type="number"
                      min="1"
                      max="100"
                      value={prospectCount}
                      onChange={(e) => setProspectCount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prospect-city">City (optional)</Label>
                    <Input
                      id="prospect-city"
                      placeholder="e.g., Philadelphia"
                      value={prospectCity}
                      onChange={(e) => setProspectCity(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Step */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-analysis"
                  checked={enableAnalysis}
                  onCheckedChange={(checked) => setEnableAnalysis(checked as boolean)}
                />
                <Label htmlFor="enable-analysis" className="font-semibold">
                  Step 2: Analysis
                </Label>
              </div>

              {enableAnalysis && (
                <div className="space-y-3 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="analysis-tier">Analysis Tier</Label>
                    <Select value={analysisTier} onValueChange={(v: any) => setAnalysisTier(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tier1">Tier 1 - Quick Scan</SelectItem>
                        <SelectItem value="tier2">Tier 2 - Standard Analysis</SelectItem>
                        <SelectItem value="tier3">Tier 3 - Deep Dive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="capture-screenshots"
                      checked={captureScreenshots}
                      onCheckedChange={(checked) => setCaptureScreenshots(checked as boolean)}
                    />
                    <Label htmlFor="capture-screenshots">Capture Screenshots</Label>
                  </div>
                </div>
              )}
            </div>

            {/* Outreach Step */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-outreach"
                  checked={enableOutreach}
                  onCheckedChange={(checked) => setEnableOutreach(checked as boolean)}
                />
                <Label htmlFor="enable-outreach" className="font-semibold">
                  Step 3: Outreach
                </Label>
              </div>

              {enableOutreach && (
                <div className="space-y-3 ml-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-send"
                      checked={autoSend}
                      onCheckedChange={(checked) => setAutoSend(checked as boolean)}
                    />
                    <Label htmlFor="auto-send">Auto-send Emails (careful!)</Label>
                  </div>
                  {autoSend && (
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      ⚠️ Emails will be sent automatically without review
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-max">Daily Maximum ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="daily-max"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailyMax}
                  onChange={(e) => setDailyMax(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Campaign will pause if daily spend exceeds this amount
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly-max">Weekly Maximum ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="weekly-max"
                  type="number"
                  step="0.01"
                  min="0"
                  value={weeklyMax}
                  onChange={(e) => setWeeklyMax(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Campaign will pause if weekly spend exceeds this amount
              </p>
            </div>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Campaign Summary</h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <div className="font-medium">{name || '(not set)'}</div>
                </div>

                <div>
                  <span className="text-muted-foreground">Schedule:</span>
                  <div className="font-medium">{selectedPreset?.label || 'Custom'}</div>
                </div>

                <div>
                  <span className="text-muted-foreground">Steps:</span>
                  <div className="font-medium">
                    {[enableProspecting && 'Prospecting', enableAnalysis && 'Analysis', enableOutreach && 'Outreach']
                      .filter(Boolean)
                      .join(' → ')}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground">Budget:</span>
                  <div className="font-medium">${dailyMax}/day, ${weeklyMax}/week</div>
                </div>
              </div>

              {/* ICP Brief Summary */}
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Target Customers:</span>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {icpBrief}
                </pre>
              </div>

              {enableProspecting && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Prospecting:</span>
                  <span className="ml-2">{prospectCount} prospects{prospectCity && ` in ${prospectCity}`}</span>
                </div>
              )}

              {enableAnalysis && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Analysis:</span>
                  <span className="ml-2">{analysisTier.toUpperCase()}{captureScreenshots && ' + Screenshots'}</span>
                </div>
              )}

              {enableOutreach && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Outreach:</span>
                  <span className="ml-2">Compose emails{autoSend && ' + Auto-send'}</span>
                </div>
              )}
            </div>
          </TabsContent>

          </div>
          {/* End fixed height container */}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Settings className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
