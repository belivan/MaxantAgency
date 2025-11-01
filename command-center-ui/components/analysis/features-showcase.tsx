'use client';

/**
 * Features Showcase Component
 * Displays 4 key analysis engine features in a beautiful grid
 */

import { GraduationCap, Target, Flame, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from './grade-badge';
import { PriorityBadge } from './priority-badge';

export function FeaturesShowcase() {
  const features = [
    {
      icon: GraduationCap,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/10',
      title: 'AI Comparative Grading',
      description: 'Context-aware A-F letter grades using industry benchmarks for accurate positioning',
      details: [
        'Weighted dimension scoring',
        'Benchmark comparison',
        'Adaptive grading criteria'
      ],
      visual: (
        <div className="flex items-center gap-2 mt-4">
          <GradeBadge grade="A" size="sm" />
          <GradeBadge grade="B" size="sm" />
          <GradeBadge grade="C" size="sm" />
          <GradeBadge grade="D" size="sm" />
          <GradeBadge grade="F" size="sm" />
        </div>
      )
    },
    {
      icon: Target,
      iconColor: 'text-success',
      bgColor: 'bg-success/5',
      borderColor: 'border-success/10',
      title: 'Industry Benchmarking',
      description: 'Compare against top-performing websites in the same industry for actionable insights',
      details: [
        'AI-powered benchmark matching',
        'Aspirational/Competitive/Baseline tiers',
        'Gap analysis & success patterns'
      ],
      visual: (
        <div className="mt-4">
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
            Match Quality: 92%
          </Badge>
        </div>
      )
    },
    {
      icon: Flame,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/5',
      borderColor: 'border-destructive/10',
      title: 'AI Grader',
      description: 'Assigns A-F website grades based on design, SEO, content, and performance. Plus Hot/Warm/Cold lead priority scoring',
      details: [
        'Quality Gap • Budget • Urgency',
        'Industry Fit • Size • Engagement',
        'Automated prioritization'
      ],
      visual: (
        <div className="flex items-center gap-2 mt-4">
          <PriorityBadge priority="hot" size="sm" />
          <PriorityBadge priority="warm" size="sm" />
          <PriorityBadge priority="cold" size="sm" />
        </div>
      )
    },
    {
      icon: Sparkles,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-500/5',
      borderColor: 'border-purple-500/10',
      title: 'Report Synthesis',
      description: 'AI-powered deduplication and executive insights generation for professional client-ready reports',
      details: [
        'Reduces redundancy by 40-70%',
        '500-word executive summaries',
        '30/60/90 strategic roadmaps'
      ],
      visual: (
        <div className="mt-4">
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
            Optional • AI Powered
          </Badge>
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <Card
            key={index}
            className={`border ${feature.borderColor} ${feature.bgColor} hover:shadow-md transition-shadow`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 ${feature.bgColor} rounded-lg`}>
                  <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
              </div>
              <CardTitle className="text-base font-semibold">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2 mb-4">
                {feature.details.map((detail, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className={`mt-0.5 ${feature.iconColor}`}>✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              {feature.visual}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default FeaturesShowcase;
