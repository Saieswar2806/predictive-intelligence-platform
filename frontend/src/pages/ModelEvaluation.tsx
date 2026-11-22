import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { ModelsComparisonResponse } from '../types/api';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ModelEvaluation: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<ModelsComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    setLoading(true);
    try {
      const data = await api.getModelsComparison();
      setBenchmarks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load model comparison');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching genuine model benchmark results from ML registry..." size="lg" />;
  }

  if (error || !benchmarks) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-lg text-sm">
        <h3 className="font-bold text-rose-900 mb-1">Benchmark Loading Error</h3>
        <p className="text-xs text-rose-700">{error || 'Unable to retrieve benchmarks'}</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = Object.entries(benchmarks).map(([name, data]) => ({
    name,
    testRmse: data.test.RMSE,
    valRmse: data.validation.RMSE,
    testMae: data.test.MAE,
    nasaScore: data.test.NASA_PHM_Score,
    r2: data.test.R2,
  }));

  const bestModel = Object.entries(benchmarks).reduce((best, [name, data]) => {
    if (!best || data.test.RMSE < best.data.test.RMSE) {
      return { name, data };
    }
    return best;
  }, null as { name: string; data: any } | null);

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Best Model Architecture"
          value={bestModel?.name || 'Random Forest'}
          subtitle="Selected for production deployment"
          icon={Award}
          variant="accent"
        />
        <MetricCard
          title="Best Test RMSE"
          value={`${bestModel?.data.test.RMSE.toFixed(2)} cyc`}
          subtitle="Official NASA held-out test engines"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="NASA PHM Challenge Score"
          value={`${bestModel?.data.test.NASA_PHM_Score.toFixed(1)}`}
          subtitle="Asymmetric late-prediction penalty"
          icon={TrendingDown}
          variant="default"
        />
        <MetricCard
          title="Engine-Wise Split"
          value="0% Leakage"
          subtitle="GroupShuffleSplit (80% train / 20% val)"
          icon={Layers}
          variant="default"
        />
      </div>

      {/* Benchmark Comparison Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Comprehensive Model Benchmarking Suite (NASA C-MAPSS FD001)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluated on held-out test set (100 independent turbofan engines at their final operational cycle)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full eng-table text-left">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Validation RMSE</th>
                <th>Validation MAE</th>
                <th>Test RMSE (cycles)</th>
                <th>Test MAE (cycles)</th>
                <th>Test R² Score</th>
                <th>NASA Challenge Score</th>
                <th>Deployment Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(benchmarks).map(([name, data]) => {
                const isSelected = name === bestModel?.name;
                return (
                  <tr
                    key={name}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-blue-600 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                          PRODUCTION
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-slate-600">{data.validation.RMSE.toFixed(2)}</td>
                    <td className="font-mono text-slate-600">{data.validation.MAE.toFixed(2)}</td>
                    <td className="font-mono font-bold text-slate-900">{data.test.RMSE.toFixed(2)}</td>
                    <td className="font-mono font-bold text-slate-900">{data.test.MAE.toFixed(2)}</td>
                    <td className="font-mono text-slate-700">{data.test.R2.toFixed(3)}</td>
                    <td className="font-mono font-bold text-blue-700">{data.test.NASA_PHM_Score.toFixed(1)}</td>
                    <td>
                      <span
                        className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isSelected ? 'Active Model' : 'Candidate'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test RMSE Comparison Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Test RMSE Comparison (Lower is Better)
            </h3>
            <p className="text-xs text-slate-500">Root Mean Squared Error on held-out test engines</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 22]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="testRmse" fill="#2563eb" radius={[4, 4, 0, 0]} name="Test RMSE (cycles)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NASA PHM Challenge Score Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              NASA PHM Asymmetric Penalty Score (Lower is Better)
            </h3>
            <p className="text-xs text-slate-500">
              Heavily penalizes over-optimistic late predictions (risk of in-flight failure)
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="nasaScore" fill="#0284c7" radius={[4, 4, 0, 0]} name="NASA Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Methodology Explanatory Callout */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-900">
          <Info className="w-4 h-4 text-blue-600" />
          <span>NASA PHM Data Challenge Methodology & Leakage Prevention</span>
        </div>
        <p className="leading-relaxed">
          <strong>Engine-Wise Cross Validation:</strong> Standard row-wise random train/test splits cause severe data leakage
          because sequential cycles of the same engine share identical baseline calibration. Our evaluation utilizes a
          strict <code>GroupShuffleSplit</code> partitioned by <code>engine_id</code>, ensuring validation engines are completely
          unseen during training.
        </p>
        <p className="leading-relaxed">
          <strong>Asymmetric Loss Formulation:</strong> The official NASA evaluation metric defines d_i = y_pred - y_true.
          An early prediction (d_i &lt; 0) carries cost s_i = exp(-d_i / 13) - 1, whereas a late prediction (d_i &ge; 0)
          carries cost s_i = exp(d_i / 10) - 1, reflecting the catastrophic hazard of operating past failure boundaries.
        </p>
      </div>
    </div>
  );
};
