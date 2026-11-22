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
    return <LoadingSpinner message="Fetching model benchmark results from ML registry..." size="lg" />;
  }

  if (error || !benchmarks) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-sm font-mono shadow-xs">
        <h3 className="font-bold text-rose-900 text-base mb-1">Benchmark Loading Error</h3>
        <p className="text-sm text-rose-700">{error || 'Unable to retrieve benchmarks'}</p>
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

  // Select best model strictly on validation RMSE to reflect zero test leakage
  const bestModel = Object.entries(benchmarks).reduce((best, [name, data]) => {
    if (!best || data.validation.RMSE < best.data.validation.RMSE) {
      return { name, data };
    }
    return best;
  }, null as { name: string; data: any } | null);

  return (
    <div className="space-y-7">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Best Model Architecture"
          value={bestModel?.name || 'XGBoost'}
          subtitle="Selected on Validation RMSE"
          icon={Award}
          variant="accent"
        />
        <MetricCard
          title="Validation RMSE (Zero Leakage)"
          value={`${bestModel?.data.validation.RMSE.toFixed(2)} cyc`}
          subtitle="Engine-wise GroupShuffleSplit"
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
          title="Held-Out Test Engines"
          value="100 Engines"
          subtitle="Official NASA C-MAPSS Test Fleet"
          icon={Layers}
          variant="default"
        />
      </div>

      {/* Benchmark Comparison Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            Comprehensive Model Benchmarking Suite (NASA C-MAPSS FD001)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Engine-wise validation selection vs held-out test set (100 independent turbofan engines at their final operational cycle)
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
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/70' : ''}`}
                  >
                    <td className="font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{name}</span>
                      {isSelected && (
                        <span className="text-xs bg-blue-600 text-white font-mono px-2 py-0.5 rounded-full font-bold shadow-xs">
                          PRODUCTION
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-blue-600 font-semibold">{data.validation.RMSE.toFixed(2)}</td>
                    <td className="font-mono text-slate-700">{data.validation.MAE.toFixed(2)}</td>
                    <td className="font-mono font-bold text-slate-900">{data.test.RMSE.toFixed(2)}</td>
                    <td className="font-mono font-bold text-slate-900">{data.test.MAE.toFixed(2)}</td>
                    <td className="font-mono text-slate-700">{data.test.R2.toFixed(3)}</td>
                    <td className="font-mono font-bold text-blue-700">{data.test.NASA_PHM_Score.toFixed(1)}</td>
                    <td>
                      <span
                        className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
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
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-200 mb-4">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
              Validation vs Test RMSE Comparison (Lower is Better)
            </h3>
            <p className="text-sm text-slate-500 mt-1">Root Mean Squared Error on validation split and held-out test engines</p>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} domain={[0, 22]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="valRmse" fill="#2563eb" name="Validation RMSE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="testRmse" fill="#64748b" name="Held-Out Test RMSE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NASA PHM Asymmetric Metric Comparison Chart */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-200 mb-4">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
              NASA PHM Challenge Score (Penalty Asymmetry)
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Late predictions (underestimating degradation) receive exponential penalty vs early alerts
            </p>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="nasaScore" fill="#0284c7" name="NASA PHM Score (Lower is Better)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
