import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  BarChart2,
  ShieldAlert,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { FleetOverviewResponse, FleetEngineSummary } from '../types/api';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { SectionHeader } from '../components/common/SectionHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { TurbofanScene } from '../three/TurbofanScene';
import { EngineSubsystemKey } from '../three/TurbofanCutawayModel';

interface CommandCenterProps {
  onSelectEngine: (engineId: number) => void;
  onNavigateToTwin: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSelectEngine, onNavigateToTwin }) => {
  const [fleetData, setFleetData] = useState<FleetOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubsystem, setSelectedSubsystem] = useState<EngineSubsystemKey | null>('fan');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFleetOverview();
      setFleetData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fleet overview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying turbofan fleet telemetry from API..." size="lg" />;
  }

  if (error || !fleetData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-lg text-sm">
        <h3 className="font-bold text-rose-900 mb-1">Fleet Telemetry Query Failed</h3>
        <p className="text-xs text-rose-700 mb-4">{error || 'Unable to connect to backend'}</p>
        <button
          onClick={loadFleet}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Filter engines
  const filteredEngines = fleetData.engines.filter((e) => {
    if (filterRisk === 'ALL') return true;
    return e.risk_level === filterRisk;
  });

  // Histogram data for RUL distribution
  const rulBins = [
    { range: '0-20 cyc', count: fleetData.engines.filter((e) => e.predicted_rul < 20).length },
    { range: '21-40 cyc', count: fleetData.engines.filter((e) => e.predicted_rul >= 20 && e.predicted_rul < 40).length },
    { range: '41-60 cyc', count: fleetData.engines.filter((e) => e.predicted_rul >= 40 && e.predicted_rul < 60).length },
    { range: '61-80 cyc', count: fleetData.engines.filter((e) => e.predicted_rul >= 60 && e.predicted_rul < 80).length },
    { range: '81-100 cyc', count: fleetData.engines.filter((e) => e.predicted_rul >= 80 && e.predicted_rul < 100).length },
    { range: '100+ cyc', count: fleetData.engines.filter((e) => e.predicted_rul >= 100).length },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Monitored Turbofans"
          value={fleetData.total_engines}
          subtitle="Commercial CFM56 / GE90 Class"
          icon={Layers}
          variant="accent"
        />
        <MetricCard
          title="Nominal / Healthy"
          value={fleetData.healthy_count}
          subtitle="Normal flight envelope"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Inspection Required"
          value={fleetData.warning_count}
          subtitle="RUL < 55 flight cycles"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCard
          title="Critical Maintenance"
          value={fleetData.critical_count}
          subtitle="AOG risk / removal due"
          icon={ShieldAlert}
          variant="danger"
        />
        <MetricCard
          title="Avg Fleet RUL"
          value={`${fleetData.avg_predicted_rul} cyc`}
          subtitle={`Health Index: ${fleetData.avg_health_index}`}
          icon={Clock}
          variant="default"
        />
      </div>

      {/* Hero: 3D Twin Preview & Fleet Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Turbofan Preview Box */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Interactive Digital Twin Live Preview</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-mono">
                  R3F // WEBGL
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Cutaway preview of turbofan core with animated rotor spool and thermal emission
              </p>
            </div>
            <button
              onClick={onNavigateToTwin}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full rounded-md overflow-hidden relative">
            <TurbofanScene
              selectedComponent={selectedSubsystem}
              onSelectComponent={setSelectedSubsystem}
              fanSpeed={1.0}
              overallHealthIndex={fleetData.avg_health_index}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono text-[11px]">ACTIVE SUBSYSTEM: {selectedSubsystem?.toUpperCase()}</span>
            <span className="font-mono text-[11px] text-emerald-600">PHYSICS KERNEL: NASA C-MAPSS FD001</span>
          </div>
        </div>

        {/* Fleet RUL Distribution Chart */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Fleet Remaining Useful Life</h3>
                <p className="text-xs text-slate-500">Predicted cycles distribution across all 100 turbofans</p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rulBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Turbofans" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>RUL Cap Benchmark: 125 cycles</span>
            <span className="font-semibold text-rose-600">
              {fleetData.critical_count} Engines at High Risk
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Telemetry Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Turbofan Fleet Status Matrix</h3>
            <p className="text-xs text-slate-500">Live evaluation of latest flight cycle state per engine</p>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-md text-xs font-medium">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterRisk === risk
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full eng-table text-left">
            <thead>
              <tr>
                <th>Engine ID</th>
                <th>Flight Cycle</th>
                <th>Predicted RUL</th>
                <th>Health Index</th>
                <th>Anomaly Status</th>
                <th>Risk Priority</th>
                <th>Fan Inlet T24</th>
                <th>HPC Temp T30</th>
                <th>LPT Temp T50</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEngines.slice(0, 15).map((eng) => (
                <tr key={eng.engine_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="font-mono font-semibold text-slate-900">ENG-{eng.engine_id.toString().padStart(3, '0')}</td>
                  <td className="font-mono text-slate-600">{eng.current_cycle}</td>
                  <td className="font-mono font-semibold">
                    <span
                      className={
                        eng.predicted_rul < 25
                          ? 'text-rose-600'
                          : eng.predicted_rul < 55
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }
                    >
                      {eng.predicted_rul} cycles
                    </span>
                  </td>
                  <td className="font-mono">{eng.health_index.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={eng.anomaly_status} size="sm" />
                  </td>
                  <td>
                    <StatusBadge status={eng.risk_level} size="sm" />
                  </td>
                  <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_2?.toFixed(1)} °R</td>
                  <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_3?.toFixed(1)} °R</td>
                  <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_4?.toFixed(1)} °R</td>
                  <td className="text-right">
                    <button
                      onClick={() => onSelectEngine(eng.engine_id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing 15 of {filteredEngines.length} engines</span>
          <span className="font-mono text-[11px]">DATASET: C-MAPSS FD001 (100 ENGINES)</span>
        </div>
      </div>
    </div>
  );
};
