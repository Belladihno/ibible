export interface InstantlyLeadData {
  email: string;
  first_name?: string;
  last_name?: string;
  campaign?: string;
  list_id?: string;
  personalization?: string;
  website?: string;
  company_name?: string;
  phone?: string;
  lt_interest_status?: number;
  pl_value_lead?: string;
  assigned_to?: string;
  skip_if_in_workspace?: boolean;
  skip_if_in_campaign?: boolean;
  skip_if_in_list?: boolean;
  custom_variables?: Record<string, any>;
}

export interface InstantlyApiResponse {
  id: string;
  timestamp_created: string;
  timestamp_updated: string;
  organization: string;
  status: number;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  campaign?: string;
  list_id?: string;
  assigned_to?: string;
  lt_interest_status?: number;
  pl_value_lead?: string;
  verification_status?: number;
  enrichment_status?: number;
  email_open_count?: number;
  email_reply_count?: number;
  email_click_count?: number;
  company_domain?: string;
  status_summary?: any;
  payload?: Record<string, any>;
  // ... many other fields as per API documentation
}

export interface WaitlistSyncJob {
  id?: string | number;
  email: string;
  name?: string;
}

export interface SalesToolResponse {
  success: boolean;
  tool: 'instantly';
  error?: string;
}

export interface JobSummary {
  id?: string | number;
  name?: string;
  data: unknown;
  state: string;
  attemptsMade?: number;
  failedReason?: string | null;
  timestamp?: string | null;
  processedOn?: string | null;
  finishedOn?: string | null;
}
