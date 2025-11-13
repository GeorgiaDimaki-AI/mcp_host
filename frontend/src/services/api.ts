/**
 * API service for HTTP requests to backend
 */

const API_BASE_URL = '/api';

export interface HealthResponse {
  status: string;
  ollama: string;
}

export interface ModelsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

export const api = {
  /**
   * Check server health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },

  /**
   * Get available models
   */
  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    return response.json();
  },
};
