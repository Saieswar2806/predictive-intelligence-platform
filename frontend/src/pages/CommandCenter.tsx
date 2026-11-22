import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  Eye,
  Radio,
  Zap,
  Check,
  Bell,
  Cpu,
  Thermometer,
  Gauge,
  Sliders,
  ExternalLink,
  Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { FleetOverviewResponse, FleetEngineSummary, PredictionResponse } from '../types/api';
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

interface AlertItem {
  id: string;
  engineId: number;
  severity: 'CRITICAL' | 'WARNING';
  timestamp: string;
  trigger: string;
  recommendation: string;
  acknowledged: boolean;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSelectEngine, onNavigateToTwin }) => {
  const [fleetData, setFleetData] = useState<FleetOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active highlighted engine for predictive intelligence & 3D preview
  const [activeEngineId, setActiveEngineId] = useState<number>(1);
  const [activePrediction, setActivePrediction] = useState<PredictionResponse | null>(null);
  const [predictingActive, setPredictingActive] = useState<boolean>(false);

  // 3D Cutaway component focus
  const [selectedSubsystem, setSelectedSubsystem] = useState<EngineSubsystemKey | null>('hpt');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Client-side Alert acknowledgement state
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFleetOverview();
      setFleetData(data);
      if (data.engines.length > 0) {
        // Find first critical engine if any, else engine 1
        const criticalEng = data.engines.find((e) => e.risk_level === 'HIGH') || data.engines[0];
        setActiveEngineId(criticalEng.engine_id);
        fetchActiveEnginePrediction(criticalEng);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load fleet overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveEnginePrediction = async (engine: FleetEngineSummary) => {
    setPredictingActive(true);
    try {
      const res = await api.predictRaw({
        engine_id: engine.engine_id,
        cycle: engine.current_cycle,
        op_setting_1: engine.sensors.op_setting_1 || 0.0015,
        op_setting_2: engine.sensors.op_setting_2 || 0.0003,
        op_setting_3: engine.sensors.op_setting_3 || 100.0,
        sensors: engine.sensors
      });
      setActivePrediction(res);
    } catch (err) {
      console.error('Failed to query live prediction for active engine:', err);
    } finally {
      setPredictingActive(false);
    }
  };

  const handleSelectActiveEngine = (engine: FleetEngineSummary) => {
    setActiveEngineId(engine.engine_id);
    fetchActiveEnginePrediction(engine);
  };

  // Generate genuine alerts stream derived from actual engine telemetry
  const alerts: AlertItem[] = useMemo(() => {
    if (!fleetData) return [];
    const list: AlertItem[] = [];

    fleetData.engines.forEach((eng) => {
      if (eng.risk_level === 'HIGH' || eng.anomaly_status === 'Critical Anomaly') {
        const id = `crit-${eng.engine_id}`;
        list.push({
          id,
          engineId: eng.engine_id,
          severity: 'CRITICAL',
          timestamp: 'Live Operational Telemetry',
          trigger: `Critical degradation: RUL forecast at ${eng.predicted_rul} cycles with anomaly flag.`,
          recommendation: 'Immediate borescope inspection & depot-level module removal required.',
          acknowledged: !!acknowledgedAlerts[id]
        });
      } else if (eng.risk_level === 'MEDIUM' || eng.anomaly_status === 'Warning Deviation') {
        const id = `warn-${eng.engine_id}`;
        list.push({
          id,
          engineId: eng.engine_id,
          severity: 'WARNING',
          timestamp: 'Live Operational Telemetry',
          trigger: `Sensor drift deviation: T50 total temp margin reduced. RUL ${eng.predicted_rul} cycles.`,
          recommendation: 'Schedule compressor detergent wash and hot section blade inspection within 15 cycles.',
          acknowledged: !!acknowledgedAlerts[id]
        });
      }
    });

    return list;
  }, [fleetData, acknowledgedAlerts]);

  const toggleAlertAck = (alertId: string) => {
    setAcknowledgedAlerts((prev) => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to NASA C-MAPSS Telemetry & Inference Server..." size="lg" />;
  }

  if (error || !fleetData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-sm font-mono shadow-xs">
        <h3 className="font-bold text-rose-900 text-base mb-1 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Fleet Telemetry Query Failed</span>
        </h3>
        <p className="text-sm text-rose-700 mb-4">{error || 'Unable to connect to FastAPI backend'}</p>
        <button
          onClick={loadFleet}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Filter engines
  const filteredEngines = fleetData.engines.filter((e) => {
    const matchesRisk = filterRisk === 'ALL' || e.risk_level === filterRisk;
    const matchesQuery =
      searchQuery === '' ||
      e.engine_id.toString().includes(searchQuery) ||
      `ENG-${e.engine_id}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesQuery;
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

  const activeEngine = fleetData.engines.find((e) => e.engine_id === activeEngineId) || fleetData.engines[0];
  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-7">
      {/* ==================================================================== */}
      {/* SECTION A: OVERVIEW & FLEET KPI COMMAND STRIP                        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Turbofans Monitored"
          value={fleetData.total_engines}
          subtitle="Commercial High-Bypass Fleet"
          icon={Layers}
          variant="accent"
        />
        <MetricCard
          title="Nominal / Healthy"
          value={fleetData.healthy_count}
          subtitle="Full operational envelope"
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
          subtitle="AOG removal priority"
          icon={ShieldAlert}
          variant="danger"
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlertsCount}
          subtitle={`${alerts.length - activeAlertsCount} acknowledged`}
          icon={Bell}
          variant={activeAlertsCount > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          title="Fleet Health Index"
          value={`${fleetData.avg_health_index.toFixed(2)}`}
          subtitle={`Avg RUL: ${fleetData.avg_predicted_rul} cyc`}
          icon={Clock}
          variant="default"
        />
      </div>

      {/* ==================================================================== */}
      {/* BALANCED 3D + ANALYTICS HERO WORKSPACE                               */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Large 3D Turbofan Digital Twin Viewport */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                    Turbofan Digital Twin Core Cutaway
                  </h3>
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    WEBGL 2.0 // R3F
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  High-fidelity aerodynamic cutaway model with dynamic wear coloring and real-time spool rotation
                </p>
              </div>
              <button
                onClick={onNavigateToTwin}
                className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0"
              >
                <span>Full Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Subsystem quick-inspection selectors */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['fan', 'hpc', 'combustor', 'hpt', 'lpt', 'casing'] as EngineSubsystemKey[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubsystem(sub)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all uppercase font-semibold ${
                    selectedSubsystem === sub
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Large 3D Scene viewport (substantial height for immersive inspection) */}
          <div className="h-96 w-full rounded-xl overflow-hidden relative shadow-inner">
            <TurbofanScene
              selectedComponent={selectedSubsystem}
              onSelectComponent={setSelectedSubsystem}
              fanSpeed={activeEngine.risk_level === 'HIGH' ? 0.6 : 1.2}
              overallHealthIndex={activeEngine.health_index}
              thermalStress={activeEngine.sensors.sensor_4 > 1420 ? 1.4 : 1.0}
              subsystemsWear={{
                fan: Math.round((1 - activeEngine.health_index) * 45),
                hpc: Math.round((1 - activeEngine.health_index) * 85),
                combustor: Math.round((1 - activeEngine.health_index) * 55),
                hpt: Math.round((1 - activeEngine.health_index) * 95),
                lpt: Math.round((1 - activeEngine.health_index) * 60)
              }}
            />
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="font-semibold text-slate-700">INSPECTING: ENG-{activeEngine.engine_id.toString().padStart(3, '0')}</span>
            <span className="text-blue-600 font-semibold">FOCUS: {selectedSubsystem?.toUpperCase()}</span>
            <span className="text-emerald-700 font-semibold">PHYSICS: C-MAPSS FD001</span>
          </div>
        </div>

        {/* Right: Predictive Intelligence & Diagnostics */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                    Predictive Intelligence Hub
                  </h3>
                  <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    XGBOOST ML
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Target: <span className="text-blue-600 font-mono font-bold">ENG-{activeEngine.engine_id.toString().padStart(3, '0')}</span> (Flight Cycle {activeEngine.current_cycle})
                </p>
              </div>
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>

            {/* Prediction Hero Readout */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                    Remaining Useful Life (RUL)
                  </span>
                  <div className="text-4xl font-bold font-mono text-slate-900 mt-1 tracking-tight">
                    {activePrediction ? `${activePrediction.predicted_rul_cycles}` : `${activeEngine.predicted_rul}`}
                    <span className="text-base font-normal text-slate-500 ml-2">cycles</span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 mt-1.5">
                    Confidence Interval: <span className="font-semibold text-slate-800">±9.8 cycles (Test MAE bound)</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                    Risk Level
                  </span>
                  <div className="mt-1.5">
                    <StatusBadge status={activePrediction?.maintenance_risk || activeEngine.risk_level} size="lg" />
                  </div>
                </div>
              </div>

              {/* Urgency Directive Banner */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center space-x-2 text-sm">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-slate-700 text-xs font-medium">
                  {activePrediction?.urgency_action || (activeEngine.predicted_rul < 25 ? 'Immediate depot-level removal required.' : 'Turbofan operates within normal flight envelope.')}
                </span>
              </div>
            </div>

            {/* Health & Anomaly Attribution Details */}
            <div className="grid grid-cols-2 gap-3.5 mb-5 text-sm font-mono">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-xs font-semibold">HEALTH INDEX</span>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  {activePrediction?.health_assessment.health_index.toFixed(2) || activeEngine.health_index.toFixed(2)}
                  <span className="text-slate-400 text-xs font-normal"> / 1.00</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-xs font-semibold">ANOMALY STATUS</span>
                <div className="mt-1">
                  <StatusBadge status={activePrediction?.health_assessment.severity || activeEngine.anomaly_status} size="sm" />
                </div>
              </div>
            </div>

            {/* Dominant Sensor Signatures */}
            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-2.5 font-bold">
                Critical Station Telemetry
              </span>
              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold">T24 (Fan Inlet)</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {activeEngine.sensors.sensor_2?.toFixed(1)} <span className="text-xs text-slate-500 font-normal">°R</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold">T30 (HPC Temp)</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {activeEngine.sensors.sensor_3?.toFixed(1)} <span className="text-xs text-slate-500 font-normal">°R</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-semibold">T50 (LPT Temp)</div>
                  <div className={`text-sm font-bold mt-1 ${activeEngine.sensors.sensor_4 > 1420 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {activeEngine.sensors.sensor_4?.toFixed(1)} <span className="text-xs text-slate-500 font-normal">°R</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-mono text-slate-500">PROVENANCE: {activePrediction?.provenance?.calculation_method || 'full_history_rolling'}</span>
            <button
              onClick={() => onSelectEngine(activeEngine.engine_id)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1.5"
            >
              <span>Deep Machine Inspection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION E: FLEET ANALYTICS & BENCHMARK PERFORMANCE                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RUL Distribution Histogram */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                Fleet RUL Prognostic Distribution
              </h3>
              <p className="text-sm text-slate-500 mt-1">Remaining Useful Life frequency distribution across 100 in-service turbofans</p>
            </div>
            <BarChart2 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rulBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '13px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Turbofans" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between font-mono">
            <span>NASA C-MAPSS FD001 • 125 CYCLE CAP BENCHMARK</span>
            <span className="text-rose-600 font-semibold">{fleetData.critical_count} Engines at Immediate AOG Removal Threshold</span>
          </div>
        </div>

        {/* Fleet Risk & ML Model Governance Summary */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">Model Engine Specs</h3>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                AUDITED
              </span>
            </div>

            <div className="space-y-3 text-sm font-mono">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Selected Architecture</span>
                <span className="text-slate-900 font-semibold">Tuned XGBoost</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Selection Protocol</span>
                <span className="text-blue-600 font-semibold">Validation Only (Zero Leakage)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Validation RMSE</span>
                <span className="text-emerald-700 font-bold">11.23 cycles</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Held-Out Test RMSE</span>
                <span className="text-slate-900 font-semibold">13.70 cycles</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">NASA Asymmetric PHM Score</span>
                <span className="text-blue-700 font-bold">279.0</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono mt-4">
            Dual Isolation Forest + PCA reconstruction error tracks residual thermodynamic drift.
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION B: REAL-TIME MACHINE TELEMETRY & MONITORING MATRIX           */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                Turbofan Fleet Monitoring Matrix
              </h3>
              <span className="text-xs font-mono text-slate-500 font-medium">
                ({filteredEngines.length} of {fleetData.total_engines} engines)
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Real-time telemetry, thermodynamic sensor stations, and predicted failure horizon</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search engine ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-sm font-mono rounded-lg pl-9 pr-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Risk Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-mono">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={`px-3 py-1.5 rounded-md transition-colors text-xs font-semibold ${
                    filterRisk === risk
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Telemetry Table */}
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
                <th>T24 (Fan Inlet)</th>
                <th>T30 (HPC Temp)</th>
                <th>T50 (LPT Temp)</th>
                <th>P30 (Pressure)</th>
                <th>Core Speed Nc</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEngines.slice(0, 15).map((eng) => {
                const isSelected = eng.engine_id === activeEngineId;
                return (
                  <tr
                    key={eng.engine_id}
                    onClick={() => handleSelectActiveEngine(eng)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="font-mono font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
                        <span>ENG-{eng.engine_id.toString().padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td className="font-mono text-slate-700">{eng.current_cycle}</td>
                    <td className="font-mono font-bold">
                      <span
                        className={
                          eng.predicted_rul < 25
                            ? 'text-rose-600'
                            : eng.predicted_rul < 55
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {eng.predicted_rul} cyc
                      </span>
                    </td>
                    <td className="font-mono text-slate-700">{eng.health_index.toFixed(2)}</td>
                    <td>
                      <StatusBadge status={eng.anomaly_status} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={eng.risk_level} size="sm" />
                    </td>
                    <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_2?.toFixed(1)} °R</td>
                    <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_3?.toFixed(1)} °R</td>
                    <td className={`font-mono text-xs font-semibold ${eng.sensors.sensor_4 > 1420 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {eng.sensors.sensor_4?.toFixed(1)} °R
                    </td>
                    <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_7?.toFixed(1)} psia</td>
                    <td className="font-mono text-xs text-slate-600">{eng.sensors.sensor_9?.toFixed(0)} rpm</td>
                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEngine(eng.engine_id);
                        }}
                        className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center font-mono">
          <span>Showing 15 of {filteredEngines.length} matching engines</span>
          <span className="font-semibold text-blue-600">CLICK ANY ROW TO PREVIEW IN DIGITAL TWIN</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION F: ACTIVE ALERTS & INCIDENT STREAM                           */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-600">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                Active Operational Alerts Stream
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Real-time machine notifications triggered by anomaly score thresholds and RUL safety limits
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {activeAlertsCount} ACTIVE UNRESOLVED
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-slate-500">
            All turbofans operating within nominal parameters. No active alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  alert.acknowledged
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                    : 'bg-amber-50/70 border-amber-200 shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        ENG-{alert.engineId.toString().padStart(3, '0')}
                      </span>
                      <StatusBadge status={alert.severity} size="sm" />
                      <span className="text-xs font-mono text-slate-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium mt-1">{alert.trigger}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-mono font-semibold text-slate-700">Action:</span> {alert.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onSelectEngine(alert.engineId)}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors shadow-xs"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => toggleAlertAck(alert.id)}
                    className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg border flex items-center space-x-1.5 transition-colors shadow-xs ${
                      alert.acknowledged
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
