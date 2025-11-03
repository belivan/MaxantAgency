'use client';

/**
 * Enhanced Business Intelligence Component
 * Displays business intelligence data in organized sub-sections
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Building2,
  Users,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  YearsInBusinessBadge,
  PremiumFeaturesBadge,
  BudgetIndicatorBadge,
  DecisionMakerBadge,
  EmployeeCountBadge,
  LocationCountBadge
} from './business-intel-badges';

interface BusinessIntelligence {
  years_in_business?: number;
  founded_year?: number;
  employee_count?: number | null;
  location_count?: number | null;
  premium_features?: string[];
  decision_maker_accessible?: boolean;
  owner_name?: string | null;
  budget_indicator?: 'high' | 'medium' | 'low';
  pricing_visible?: boolean;
  pricing_range?: { min?: number; max?: number } | null;
  blog_active?: boolean;
  content_last_update?: string | null;
}

interface BusinessIntelEnhancedProps {
  businessIntel: BusinessIntelligence;
  className?: string;
}

export function BusinessIntelEnhanced({ businessIntel, className }: BusinessIntelEnhancedProps) {
  const hasCompanyProfile =
    businessIntel.years_in_business !== undefined ||
    businessIntel.employee_count ||
    businessIntel.location_count ||
    businessIntel.founded_year;

  const hasDigitalPresence =
    businessIntel.pricing_visible !== undefined ||
    businessIntel.blog_active !== undefined ||
    businessIntel.content_last_update;

  const hasPremiumFeatures =
    businessIntel.premium_features && businessIntel.premium_features.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Business Intelligence
        </CardTitle>
        <CardDescription>
          Insights extracted from website analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Badges Row */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          {businessIntel.years_in_business !== undefined && (
            <YearsInBusinessBadge
              years={businessIntel.years_in_business}
              foundedYear={businessIntel.founded_year}
            />
          )}
          {businessIntel.employee_count && (
            <EmployeeCountBadge count={businessIntel.employee_count} />
          )}
          {businessIntel.location_count && (
            <LocationCountBadge count={businessIntel.location_count} />
          )}
          {businessIntel.budget_indicator && (
            <BudgetIndicatorBadge indicator={businessIntel.budget_indicator} showLabel={false} />
          )}
          {businessIntel.decision_maker_accessible !== undefined && (
            <DecisionMakerBadge
              accessible={businessIntel.decision_maker_accessible}
              ownerName={businessIntel.owner_name || undefined}
            />
          )}
        </div>

        {/* Sub-Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Profile */}
          {hasCompanyProfile && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-sm">Company Profile</h4>
              </div>
              <div className="space-y-2 text-sm">
                {businessIntel.years_in_business !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      In Business
                    </span>
                    <span className="font-medium">
                      {businessIntel.years_in_business} {businessIntel.years_in_business === 1 ? 'year' : 'years'}
                      {businessIntel.founded_year && (
                        <span className="text-muted-foreground ml-1.5">
                          (Est. {businessIntel.founded_year})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {businessIntel.employee_count && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Team Size
                    </span>
                    <span className="font-medium">{businessIntel.employee_count}</span>
                  </div>
                )}
                {businessIntel.location_count && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Locations
                    </span>
                    <span className="font-medium">
                      {businessIntel.location_count} {businessIntel.location_count === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Digital Presence */}
          {hasDigitalPresence && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-sm">Digital Presence</h4>
              </div>
              <div className="space-y-2 text-sm">
                {businessIntel.pricing_visible !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Pricing Visible
                    </span>
                    <span className="font-medium">
                      {businessIntel.pricing_visible ? (
                        <span className="text-green-600 dark:text-green-400">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                      {businessIntel.pricing_range && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (${businessIntel.pricing_range.min || 0}-${businessIntel.pricing_range.max || 0})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {businessIntel.blog_active !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Blog Active
                    </span>
                    <span className="font-medium">
                      {businessIntel.blog_active ? (
                        <span className="text-green-600 dark:text-green-400">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </span>
                  </div>
                )}
                {businessIntel.content_last_update && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Last Update
                    </span>
                    <span className="font-medium text-xs">
                      {businessIntel.content_last_update}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Premium Features */}
        {hasPremiumFeatures && (
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="font-semibold text-sm">Premium Features Detected</h4>
              <Badge variant="secondary" className="ml-auto">
                {businessIntel.premium_features!.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {businessIntel.premium_features!.map((feature, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs bg-white dark:bg-gray-900"
                >
                  ✨ {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              <strong>Budget Signal:</strong> Multiple premium features suggest higher technical investment and likely budget availability.
            </p>
          </div>
        )}

        {/* Show message if no data */}
        {!hasCompanyProfile && !hasDigitalPresence && !hasPremiumFeatures && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No business intelligence data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BusinessIntelEnhanced;
