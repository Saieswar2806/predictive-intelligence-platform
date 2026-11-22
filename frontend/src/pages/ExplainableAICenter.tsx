import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
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
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { ExplainResponse, FeatureContribution } from '../types/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ExplainableAICenter: React.FC = () => {
  const [selectedEngine, setSelectedEngine] = useState<number>(1);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExplanation(selectedEngine);
  }, [selectedEngine]);

  const loadExplanation = async (engId: number) => {
    setLoading(true);
    setError(null);
    try {
      // First get the engine's latest historical reading
      const hist = await api.getEngineHistory(engId);
      if (!hist.history || hist.history.length === 0) {
        throw new Error(`Engine ${engId} telemetry not found`);
      }
      const last = hist.history[hist.history.length - 1];
      const sensorDict: Record<string, number> = {
        sensor_2: last.sensor_2,
        sensor_3: last.sensor_3,
        sensor_4: last.sensor_4,
        sensor_7: last.sensor_7,
        sensor_8: last.sensor_8,
        sensor_9: last.sensor_9,
        sensor_11: last.sensor_11,
        sensor_12: last.sensor_12,
        sensor_14: last.sensor_14,
        sensor_15: last.sensor_15,
        sensor_17: last.sensor_17,
        sensor_20: last.sensor_20,
        sensor_21: last.sensor_21,
      };

      const exp = await api.getExplanation({
        engine_id: engId,
        cycle: last.cycle,
        op_setting_1: 0.0015,
        op_setting_2: 0.0003,
        op_setting_3: 100.0,
        sensors: sensorDict,
      }, 10);
      setExplanation(exp);
    } catch (err: any) {
      setError(err.message || 'Failed to compute SHAP explanations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Engine Selection Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
            SELECT ENGINE FOR SHAP DECOMPOSITION:
          </label>
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(parseInt(e.target.value))}
            className="border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 text-slate-900"
          >
            {Array.from({ length: 100 }, (_, i) => i + 1).map((id) => (
              <option key={id} value={id}>
                ENG-{id.toString().padStart(3, '0')}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>SHAP TREE-EXPLAINER KERNEL</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating Shapley value decomposition for engine..." size="lg" />
      ) : error || !explanation ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-lg text-sm">
          <h3 className="font-bold text-rose-900 mb-1">SHAP Decomposition Unavailable</h3>
          <p className="text-xs text-rose-700 mb-4">{error || 'Unable to compute feature attributions'}</p>
        </div>
      ) : (
        <>
          {/* Engineering Diagnostic Translation Callout */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-slate-500 tracking-wider uppercase">
                ENGINEERING DIAGNOSTIC SYNTHESIS
              </span>
              <span className="text-xs font-mono text-blue-600 font-bold">
                PREDICTED RUL: {explanation.predicted_rul.toFixed(1)} FLIGHT CYCLES
              </span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-sans">
              {explanation.diagnostic_summary}
            </p>
          </div>

          {/* Local Feature Impact Waterfall / Horizontal Bar Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Local Shapley Value Feature Attributions (Cycle {explanation.cycle})
                </h3>
                <p className="text-xs text-slate-500">
                  Exact cycle impact each sensor measurement adds (+) or subtracts (-) from base RUL
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono">
                <span className="flex items-center space-x-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                  <span>Extends Life (+)</span>
                </span>
                <span className="flex items-center space-x-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                  <span>Degradation Penalty (-)</span>
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={explanation.top_feature_contributions}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <YAxis
                    type="category"
                    dataKey="description"
                    tick={{ fontSize: 10, fill: '#334155' }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val > 0 ? '+' : ''}${val} cycles`, 'SHAP Impact']}
                  />
                  <Bar dataKey="impact_cycles" radius={[0, 4, 4, 0]}>
                    {explanation.top_feature_contributions.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.impact_cycles >= 0 ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Granular Feature Contribution Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Turbodynamic Feature Breakdown & Physical Attribution
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full eng-table text-left">
                <thead>
                  <tr>
                    <th>Thermodynamic Sensor Description</th>
                    <th>Feature Key</th>
                    <th>Measured Sensor Value</th>
                    <th>SHAP Impact (Cycles)</th>
                    <th>Attribution Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {explanation.top_feature_contributions.map((feat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-semibold text-slate-900">{feat.description}</td>
                      <td className="font-mono text-xs text-slate-500">{feat.feature}</td>
                      <td className="font-mono text-xs text-slate-700">{feat.feature_value.toFixed(3)}</td>
                      <td className="font-mono font-bold">
                        <span className={feat.impact_cycles >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {feat.impact_cycles > 0 ? '+' : ''}
                          {feat.impact_cycles.toFixed(2)} cyc
                        </span>
                      </td>
                      <td>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            feat.impact_cycles >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {feat.direction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
