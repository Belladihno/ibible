export interface InstantlyLeadData {
  email: string;
  first_name?: string;
  last_name?: string;
  campaign_id: string;
}

export interface InstantlyApiResponse {
  success: boolean;
  message?: string;
  contact?: Record<string, any>;
}

export interface ApolloLeadData {
  email: string;
  first_name?: string;
  last_name?: string;
  sequence_id: string;
}

export interface ApolloApiResponse {
  success: boolean;
  message?: string;
  contact?: Record<string, any>;
}

export interface WaitlistSyncJob {
  email: string;
  name?: string;
}

export interface SalesToolResponse {
  success: boolean;
  tool: 'instantly' | 'apollo';
  error?: string;
}
