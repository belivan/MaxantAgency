'use client';

/**
 * Business Intelligence Badge Components
 * Small badge components for displaying business intelligence data
 */

import { cn } from '@/lib/utils';
import { Calendar, Users, MapPin, DollarSign, Mail, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface YearsInBusinessBadgeProps {
  years: number;
  foundedYear?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function YearsInBusinessBadge({ years, foundedYear, size = 'md' }: YearsInBusinessBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-green-50 dark:bg-green-950/20 border-green-600 text-green-700 dark:text-green-400',
        sizeClasses[size]
      )}
    >
      <Calendar className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {years} year{years !== 1 ? 's' : ''} {foundedYear && `(${foundedYear})`}
    </Badge>
  );
}

interface PremiumFeaturesBadgeProps {
  count: number;
  features?: string[];
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumFeaturesBadge({ count, features, size = 'md' }: PremiumFeaturesBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const title = features ? features.join(', ') : undefined;

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-blue-50 dark:bg-blue-950/20 border-blue-600 text-blue-700 dark:text-blue-400',
        sizeClasses[size]
      )}
      title={title}
    >
      <Star className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {count} premium feature{count !== 1 ? 's' : ''}
    </Badge>
  );
}

interface BudgetIndicatorBadgeProps {
  indicator: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function BudgetIndicatorBadge({ indicator, size = 'md', showLabel = true }: BudgetIndicatorBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const config = {
    high: {
      color: 'bg-green-50 dark:bg-green-950/20 border-green-600 text-green-700 dark:text-green-400',
      label: 'HIGH BUDGET'
    },
    medium: {
      color: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600 text-yellow-700 dark:text-yellow-400',
      label: 'MEDIUM BUDGET'
    },
    low: {
      color: 'bg-gray-50 dark:bg-gray-950/20 border-gray-600 text-gray-700 dark:text-gray-400',
      label: 'LOW BUDGET'
    }
  };

  const { color, label } = config[indicator];

  return (
    <Badge
      variant="outline"
      className={cn(color, sizeClasses[size], 'font-semibold')}
    >
      <DollarSign className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {showLabel ? label : indicator.toUpperCase()}
    </Badge>
  );
}

interface DecisionMakerBadgeProps {
  accessible: boolean;
  ownerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DecisionMakerBadge({ accessible, ownerName, size = 'md' }: DecisionMakerBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  if (!accessible) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-700 dark:text-red-400',
          sizeClasses[size]
        )}
      >
        <Mail className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
        No Contact
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-green-50 dark:bg-green-950/20 border-green-600 text-green-700 dark:text-green-400',
        sizeClasses[size]
      )}
      title={ownerName || undefined}
    >
      <Mail className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {ownerName || 'Contact Available'}
    </Badge>
  );
}

interface EmployeeCountBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function EmployeeCountBadge({ count, size = 'md' }: EmployeeCountBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-purple-50 dark:bg-purple-950/20 border-purple-600 text-purple-700 dark:text-purple-400',
        sizeClasses[size]
      )}
    >
      <Users className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {count} employee{count !== 1 ? 's' : ''}
    </Badge>
  );
}

interface LocationCountBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function LocationCountBadge({ count, size = 'md' }: LocationCountBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-600 text-indigo-700 dark:text-indigo-400',
        sizeClasses[size]
      )}
    >
      <MapPin className={size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} />
      {count} location{count !== 1 ? 's' : ''}
    </Badge>
  );
}

interface QuickStatBadgeProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function QuickStatBadge({ label, value, icon, variant = 'default', size = 'md' }: QuickStatBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const variantClasses = {
    default: 'bg-gray-50 dark:bg-gray-950/20 border-gray-600 text-gray-700 dark:text-gray-400',
    success: 'bg-green-50 dark:bg-green-950/20 border-green-600 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600 text-yellow-700 dark:text-yellow-400',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-700 dark:text-red-400'
  };

  return (
    <Badge
      variant="outline"
      className={cn(variantClasses[variant], sizeClasses[size])}
      title={label}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      <span className="font-semibold">{value}</span>
    </Badge>
  );
}

export default {
  YearsInBusinessBadge,
  PremiumFeaturesBadge,
  BudgetIndicatorBadge,
  DecisionMakerBadge,
  EmployeeCountBadge,
  LocationCountBadge,
  QuickStatBadge
};
