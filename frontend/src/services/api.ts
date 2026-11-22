import {
  FleetOverviewResponse,
  EngineHistoryResponse,
  PredictionResponse,
  DigitalTwinState,
  ExplainResponse,
  ModelsComparisonResponse,
  MLOpsStatusResponse,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  async checkHealth(): Promise<{ status: string; artifacts_ready: boolean; active_digital_twins: number }> {
    return this.request('/health');
  }

  async getFleetOverview(): Promise<FleetOverviewResponse> {
    return this.request('/fleet/overview');
  }

  async getEngineHistory(engineId: number): Promise<EngineHistoryResponse> {
    return this.request(`/fleet/engine/${engineId}/history`);
  }

  async predictRaw(payload: {
    engine_id?: number;
    cycle?: number;
    op_setting_1: number;
    op_setting_2: number;
    op_setting_3: number;
    sensors: Record<string, number>;
  }): Promise<PredictionResponse> {
    return this.request('/predict/raw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getExplanation(
    payload: {
      engine_id?: number;
      cycle?: number;
      op_setting_1: number;
      op_setting_2: number;
      op_setting_3: number;
      sensors: Record<string, number>;
    },
    topN: number = 8
  ): Promise<ExplainResponse> {
    return this.request(`/explain?top_n=${topN}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async simulateTwin(payload: {
    engine_id?: number;
    cycles_to_advance: number;
    thermal_stress: number;
    contamination: number;
    thrust_derate: number;
    maintenance_action?: string | null;
  }): Promise<DigitalTwinState> {
    return this.request('/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getModelsComparison(): Promise<ModelsComparisonResponse> {
    return this.request('/models/comparison');
  }

  async getMLOpsStatus(): Promise<MLOpsStatusResponse> {
    return this.request('/mlops/status');
  }
}

export const api = new ApiService();
