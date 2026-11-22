export type MaintenanceRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type AnomalySeverity = 'Normal' | 'Warning Deviation' | 'Critical Anomaly';

export interface RootCauseSensor {
  feature: string;
  z_score: number;
  current_value: number;
  baseline_mean: number;
}

export interface HealthAssessment {
  anomaly_score: number;
  reconstruction_error?: number;
  is_anomaly: boolean;
  severity: AnomalySeverity;
  health_index: number;
  root_cause_sensors: RootCauseSensor[];
}

export interface PredictionProvenance {
  engine_id: number;
  current_cycle: number;
  history_depth: number;
  is_cold_start: boolean;
  features_approximated: boolean;
  calculation_method: string;
  warnings: string[];
  feature_count: number;
  model_version: string;
  dataset_version: string;
  timestamp: string;
}

export interface PredictionResponse {
  engine_id: number;
  cycle: number;
  predicted_rul_cycles: number;
  maintenance_risk: MaintenanceRisk;
  urgency_action: string;
  health_assessment: HealthAssessment;
  disclaimer: string;
  created_at?: string;
  model_version?: string;
  dataset_version?: string;
  provenance?: PredictionProvenance;
}

export interface FleetEngineSummary {
  engine_id: number;
  current_cycle: number;
  predicted_rul: number;
  health_index: number;
  anomaly_status: AnomalySeverity;
  risk_level: MaintenanceRisk;
  sensors: Record<string, number>;
}

export interface FleetOverviewResponse {
  total_engines: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  anomalies_detected: number;
  avg_predicted_rul: number;
  avg_health_index: number;
  engines: FleetEngineSummary[];
}

export interface EngineHistoricalCycle {
  cycle: number;
  op_setting_1: number;
  op_setting_2: number;
  sensor_2: number;
  sensor_3: number;
  sensor_4: number;
  sensor_7: number;
  sensor_8: number;
  sensor_9: number;
  sensor_11: number;
  sensor_12: number;
  sensor_14: number;
  sensor_15: number;
  sensor_17: number;
  sensor_20: number;
  sensor_21: number;
  ground_truth_rul: number;
}

export interface EngineHistoryResponse {
  engine_id: number;
  total_recorded_cycles: number;
  history: EngineHistoricalCycle[];
}

export interface SubsystemHealth {
  wear_pct: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export interface PrescriptiveRecommendation {
  action: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
  flight_restriction: string;
}

export interface DigitalTwinState {
  engine_id: number;
  cycle: number;
  flight_hours: number;
  overall_health_index: number;
  stress_parameters: {
    thermal_stress: number;
    contamination: number;
    thrust_derate: number;
  };
  subsystems: {
    'Fan & LPC': SubsystemHealth;
    'High Pressure Compressor (HPC)': SubsystemHealth;
    'Combustor Section': SubsystemHealth;
    'High Pressure Turbine (HPT)': SubsystemHealth;
    'Low Pressure Turbine (LPT)': SubsystemHealth;
  };
  prescriptive_maintenance: PrescriptiveRecommendation;
  latest_telemetry: Record<string, number>;
  live_predictions?: {
    predicted_rul?: number;
    health_assessment?: HealthAssessment;
    note?: string;
  };
  maintenance_event?: {
    action: string;
    summary: string;
    subsystems: Record<string, SubsystemHealth>;
  };
}

export interface FeatureContribution {
  feature: string;
  description: string;
  feature_value: number;
  impact_cycles: number;
  abs_impact: number;
  direction: string;
}

export interface ExplainResponse {
  engine_id: number;
  cycle: number;
  predicted_rul: number;
  diagnostic_summary: string;
  top_feature_contributions: FeatureContribution[];
}

export interface ModelMetricSet {
  MAE: number;
  RMSE: number;
  R2: number;
  NASA_PHM_Score: number;
}

export interface ModelComparisonData {
  validation: ModelMetricSet;
  test: ModelMetricSet;
}

export type ModelsComparisonResponse = Record<string, ModelComparisonData>;

export interface MLOpsStatusResponse {
  model_version: string;
  selected_model: string;
  dataset: string;
  rul_cap_cycles: number;
  total_training_cycles: number;
  held_out_test_engines: number;
  best_test_rmse: number;
  best_test_mae: number;
  best_test_nasa_score: number;
  benchmark_summary: ModelsComparisonResponse;
  artifacts: Array<{
    name: string;
    size_bytes: number;
    last_modified: string;
  }>;
  api_status: string;
}

export interface MaintenanceScenarioDetail {
  action_name: string;
  estimated_rul_cycles: number;
  rul_extension_cycles: number;
  downtime_hours: number;
  subsystem_wear_change: string;
  feasibility: string;
}

export interface MaintenanceScenariosComparison {
  current_state: {
    cycle: number;
    current_health_index: number;
    projected_baseline_rul: number;
  };
  scenarios: {
    no_action: MaintenanceScenarioDetail;
    compressor_wash: MaintenanceScenarioDetail;
    hot_section_inspection: MaintenanceScenarioDetail;
    major_overhaul: MaintenanceScenarioDetail;
  };
}

export interface SensorDriftDetail {
  recent_mean: number;
  baseline_mean: number;
  baseline_std: number;
  z_score: number;
  drift_alert: boolean;
}

export interface MLOpsDriftResponse {
  status: 'STABLE' | 'MODERATE_DRIFT' | 'SIGNIFICANT_DRIFT' | 'INSUFFICIENT_TELEMETRY' | 'UNAVAILABLE';
  drift_detected: boolean;
  samples_analyzed: number;
  drifted_sensors_count: number;
  sensor_drifts: Record<string, SensorDriftDetail>;
  timestamp: string;
}
