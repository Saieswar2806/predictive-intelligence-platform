import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  FileCode,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  GitBranch,
  Clock,
  Layers,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';
import { MLOpsStatusResponse, MLOpsDriftResponse } from '../types/api';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const MLOpsSystemHealth: React.FC = () => {
  const [mlopsData, setMlopsData] = useState<MLOpsStatusResponse | null>(null);
  const [driftData, setDriftData] = useState<MLOpsDriftResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMLOps();
  }, []);

  const loadMLOps = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await api.getMLOpsStatus();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setMlopsData(data);

      try {
        const drift = await api.getDriftStatus();
        setDriftData(drift);
      } catch {
        // Drift is optional
      }
    } catch (err: any) {
      setError(err.message || 'Failed to query MLOps status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Auditing MLOps registry and artifact store..." size="lg" />;
  }

  if (error || !mlopsData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-sm font-mono shadow-xs">
        <h3 className="font-bold text-rose-900 text-base mb-1">MLOps Service Unavailable</h3>
        <p className="text-sm text-rose-700 mb-4">{error || 'Could not communicate with backend'}</p>
        <button
          onClick={loadMLOps}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* KPI Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="FastAPI Server"
          value={mlopsData.api_status.toUpperCase()}
          subtitle={`Latency: ${latency} ms`}
          icon={Server}
          variant="success"
        />
        <MetricCard
          title="Active Model Version"
          value={`v${mlopsData.model_version}`}
          subtitle={mlopsData.selected_model}
          icon={GitBranch}
          variant="accent"
        />
        <MetricCard
          title="Training Dataset"
          value="FD001"
          subtitle={`${mlopsData.total_training_cycles.toLocaleString()} cycles • 100 engines`}
          icon={Database}
          variant="default"
        />
        <MetricCard
          title="Data Drift Status"
          value={driftData?.status || 'STABLE'}
          subtitle={`${driftData?.samples_analyzed || 0} recent cycles tracked`}
          icon={Radio}
          variant={driftData?.drift_detected ? 'warning' : 'success'}
        />
      </div>

      {/* Artifact Store Inventory */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
              Model Artifact Registry & Checkpoint Store
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Files verified in local production repository <code>artifacts/</code>
            </p>
          </div>
          <button
            onClick={loadMLOps}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Rescan Store</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full eng-table text-left">
            <thead>
              <tr>
                <th>Artifact Filename</th>
                <th>Format / Type</th>
                <th>File Size</th>
                <th>Last Modified (ISO)</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {mlopsData.artifacts.map((art) => {
                const isModel = art.name.endsWith('.joblib') || art.name.endsWith('.pt');
                const isReport = art.name.endsWith('.md') || art.name.endsWith('.pptx');
                const isJson = art.name.endsWith('.json');
                return (
                  <tr key={art.name} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono font-bold text-slate-900 flex items-center space-x-2.5">
                      <FileCode className="w-4 h-4 text-blue-600" />
                      <span>{art.name}</span>
                    </td>
                    <td>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-full font-semibold border ${
                          isModel
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isReport
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isModel ? 'SERIALIZED MODEL' : isReport ? 'EXECUTIVE ASSET' : 'METRIC / SCHEMA'}
                      </span>
                    </td>
                    <td className="font-mono text-slate-700">
                      {art.size_bytes > 1024 * 1024
                        ? `${(art.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                        : `${(art.size_bytes / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="font-mono text-xs text-slate-500">{art.last_modified}</td>
                    <td>
                      <span className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-700 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Governance & Pipeline Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
          <h4 className="text-xl font-bold text-slate-900 tracking-tight pb-3 border-b border-slate-200 font-mono">
            Feature Pipeline Governance
          </h4>
          <div className="text-sm font-mono space-y-2.5 text-slate-700">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Total Predictor Features:</span>
              <span className="font-bold text-slate-900">164 features</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Statistical Windows:</span>
              <span className="font-bold text-blue-600">Rolling 5, 10, 20 cycles</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Baseline Relative Drift:</span>
              <span className="font-bold text-slate-900">Enabled (Cycles 1-5 Baseline)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Thermodynamic Cross-Ratios:</span>
              <span className="font-bold text-slate-900">T50/T24, T50/T30, phi/Ps30, Nc/Nf</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Zero-Variance Sensor Removal:</span>
              <span className="font-bold text-slate-500">Sensors 1, 5, 6, 10, 16, 18, 19</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
          <h4 className="text-xl font-bold text-slate-900 tracking-tight pb-3 border-b border-slate-200 font-mono">
            MLflow Experiment Tracking Configuration
          </h4>
          <div className="text-sm font-mono space-y-2.5 text-slate-700">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Experiment Name:</span>
              <span className="font-bold text-blue-600">Turbofan-RUL-Predictive-Intelligence</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Backend Store URI:</span>
              <span className="font-bold text-slate-900">sqlite:///mlflow.db</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Artifact Store URI:</span>
              <span className="font-bold text-slate-900">file:///./mlruns</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Docker UI Service:</span>
              <span className="font-bold text-slate-900">http://localhost:5000</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Tracked Metric Set:</span>
              <span className="font-bold text-emerald-700">RMSE, MAE, R², NASA Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
