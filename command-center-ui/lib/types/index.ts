/**
 * Centralized Type Exports
 * Import all types from a single location
 */

// Prospect types
export * from './prospect';

// Lead types
export * from './lead';

// Email types
export * from './email';

// Social types
export * from './social';

// Analytics types
export * from './analytics';

// Project types
export * from './project';

// Campaign types
export * from './campaign';

// Common shared types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  error?: string;
}

export interface SSEMessage<T = any> {
  type: 'progress' | 'complete' | 'error' | 'log' | 'status';
  data: T;
  timestamp: string;
}
