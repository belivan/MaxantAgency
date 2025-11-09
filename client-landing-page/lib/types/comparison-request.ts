export type BenchmarkPreference = 'auto' | 'manual';
export type RequestStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface ComparisonRequest {
  id: string;
  website_url: string;
  company_name: string;
  email: string;
  industry: string | null;
  business_type: string | null;
  benchmark_preference: BenchmarkPreference;
  competitor_url: string | null;
  phone_number: string | null;
  additional_notes: string | null;
  status: RequestStatus;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComparisonRequestFormData {
  website_url: string;
  company_name: string;
  email: string;
  industry?: string;
  benchmark_preference: BenchmarkPreference;
  competitor_url?: string;
  phone_number?: string;
  additional_notes?: string;
}

export interface ComparisonRequestResponse {
  success: boolean;
  request_id?: string;
  error?: string;
  message?: string;
}
