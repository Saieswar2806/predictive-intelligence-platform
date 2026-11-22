import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  Sliders,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  BarChart2,
  Clock,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { PredictionResponse, EngineHistoryResponse } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const MachineIntelligence: React.FC = () => {
  const [selectedEngine, setSelectedEngine] = useState<number>(1);
  const [historyData, setHistoryData] = useState<EngineHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Live Prediction state
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predicting, setPredicting] = useState<boolean>(false);

  // Editable sensor inputs for What-If inference testing
  const [sensors, setSensors] = useState<Record<string, number>>({
    sensor_2: 642.3,
    sensor_3: 1588.5,
    sensor_4: 1404.2,
    sensor_7: 553.8,
    sensor_8: 2388.08,
    sensor_9: 9054.2,
    sensor_11: 47.2,
    sensor_12: 521.6,
    sensor_13: 2388.07,
    sensor_14: 8135.0,
    sensor_15: 8.43,
    sensor_17: 392.0,
    sensor_20: 38.8,
    sensor_21: 23.32,
  });

  const [activeCycle, setActiveCycle] = useState<number>(150);

  useEffect(() => {
    loadEngineHistory(selectedEngine);
  }, [selectedEngine]);

  const loadEngineHistory = async (engId: number) => {
    setLoadingHistory(true);
    try {
      const data = await api.getEngineHistory(engId);
      setHistoryData(data);
      if (data.history.length > 0) {
        const last = data.history[data.history.length - 1];
        setActiveCycle(last.cycle);
        const sDict: Record<string, number> = {
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
        setSensors(sDict);
        // Automatically trigger live backend prediction on load
        runPrediction(engId, last.cycle, sDict);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const runPrediction = async (
    engId = selectedEngine,
    cyc = activeCycle,
    sensorDict = sensors
  ) => {
    setPredicting(true);
    try {
      const res = await api.predictRaw({
        engine_id: engId,
        cycle: cyc,
        op_setting_1: 0.0015,
        op_setting_2: 0.0003,
        op_setting_3: 100.0,
        sensors: sensorDict,
      });
      setPrediction(res);
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setPredicting(false);
    }
  };

  const handleSensorChange = (key: string, val: number) => {
    setSensors((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
            SELECT TURBOFAN:
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

        <button
          onClick={() => runPrediction()}
          disabled={predicting}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{predicting ? 'Executing Model Inference...' : 'Run Backend Inference'}</span>
        </button>
      </div>

      {/* Prediction Output KPI Bar */}
      {prediction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Predicted RUL"
            value={`${prediction.predicted_rul_cycles} cyc`}
            subtitle="Machine learning ensemble estimate"
            icon={Clock}
            variant={
              prediction.maintenance_risk === 'HIGH'
                ? 'danger'
                : prediction.maintenance_risk === 'MEDIUM'
                ? 'warning'
                : 'success'
            }
          />
          <MetricCard
            title="Risk Priority"
            value={prediction.maintenance_risk}
            subtitle={prediction.urgency_action}
            icon={AlertTriangle}
            variant={
              prediction.maintenance_risk === 'HIGH'
                ? 'danger'
                : prediction.maintenance_risk === 'MEDIUM'
                ? 'warning'
                : 'success'
            }
          />
          <MetricCard
            title="Continuous Health Index"
            value={prediction.health_assessment.health_index.toFixed(2)}
            subtitle="1.00 = Pristine • 0.05 = Critical"
            icon={Activity}
            variant="accent"
          />
          <MetricCard
            title="Anomaly Classification"
            value={prediction.health_assessment.severity}
            subtitle={`Score: ${prediction.health_assessment.anomaly_score.toFixed(4)}`}
            icon={Cpu}
            variant={prediction.health_assessment.is_anomaly ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* Sensor Readouts & Historical Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time Sensor Values & What-If Sliders */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Sensor Measurements</h3>
              <p className="text-xs text-slate-500">Live values for Cycle {activeCycle} (Adjust sliders for What-If tests)</p>
            </div>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {[
              { key: 'sensor_4', label: 'T50: LPT Outlet Temperature', unit: '°R', min: 1380, max: 1440, step: 0.5 },
              { key: 'sensor_3', label: 'T30: HPC Outlet Temperature', unit: '°R', min: 1560, max: 1620, step: 0.5 },
              { key: 'sensor_2', label: 'T24: Fan Inlet Temperature', unit: '°R', min: 640, max: 650, step: 0.1 },
              { key: 'sensor_7', label: 'P30: HPC Total Pressure', unit: 'psia', min: 548, max: 558, step: 0.1 },
              { key: 'sensor_9', label: 'Nc: Physical Core Speed', unit: 'rpm', min: 9000, max: 9150, step: 1.0 },
              { key: 'sensor_14', label: 'NRc: Corrected Core Speed', unit: 'rpm', min: 8080, max: 8180, step: 1.0 },
              { key: 'sensor_11', label: 'Ps30: Static HPC Pressure', unit: 'psia', min: 46.5, max: 48.5, step: 0.05 },
              { key: 'sensor_12', label: 'phi: Fuel Flow to Ps30 Ratio', unit: 'pps/psia', min: 518, max: 525, step: 0.1 },
              { key: 'sensor_15', label: 'BPR: Bypass Ratio', unit: 'ratio', min: 8.3, max: 8.6, step: 0.01 },
            ].map((s) => (
              <div key={s.key} className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{s.label}</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {sensors[s.key] !== undefined ? sensors[s.key].toFixed(2) : '—'} {s.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={sensors[s.key] || s.min}
                  onChange={(e) => handleSensorChange(s.key, parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => runPrediction()}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
          >
            Re-evaluate With Modified Telemetry
          </button>
        </div>

        {/* Genuine Sensor History Degradation Curves */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Turbofan ENG-{selectedEngine.toString().padStart(3, '0')} Telemetry Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  Historical flight cycles recorded from C-MAPSS dataset showing degradation curve
                </p>
              </div>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>

            {loadingHistory ? (
              <LoadingSpinner message="Loading historical engine cycles..." />
            ) : historyData ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 font-mono">
                    EXHAUST & COMPRESSOR TEMPERATURE RISE (T50 & T30 °R)
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData.history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sensor_4"
                          stroke="#e11d48"
                          strokeWidth={1.5}
                          dot={false}
                          name="LPT Temp T50 (°R)"
                        />
                        <Line
                          type="monotone"
                          dataKey="sensor_3"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          dot={false}
                          name="HPC Temp T30 (°R)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 font-mono">
                    HPC PRESSURE DECAY & CORE SPEED (P30 psia & NRc rpm)
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData.history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sensor_7"
                          stroke="#2563eb"
                          strokeWidth={1.5}
                          dot={false}
                          name="HPC Pressure P30 (psia)"
                        />
                        <Line
                          type="monotone"
                          dataKey="sensor_14"
                          stroke="#8b5cf6"
                          strokeWidth={1.5}
                          dot={false}
                          name="Core Speed NRc (rpm)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-mono">
            <span>TOTAL CYCLES: {historyData?.total_recorded_cycles || 0}</span>
            <span>MODEL: RANDOM FOREST ENSEMBLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
