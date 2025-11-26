export interface GoogleModel {
  name: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  [key: string]: unknown;
}

export interface GoogleModelListResponse {
  models: GoogleModel[];
}
