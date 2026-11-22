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
  Check,
  Bell,
  Cpu,
  Thermometer,
  Gauge,
  Sliders,
  Info,
  ExternalLink,
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
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-sm shadow-xs font-sans">
        <h3 className="font-bold text-rose-900 text-base mb-1 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Fleet Telemetry Query Failed</span>
        </h3>
        <p className="text-sm text-rose-700 mb-4">{error || 'Unable to connect to FastAPI backend'}</p>
        <button
          onClick={loadFleet}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
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
    <div className="space-y-7 font-sans">
      {/* ==================================================================== */}
      {/* 1. BENTO FLEET OVERVIEW COMMAND STRIP                                */}
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
          variant={activeAlertsCount > 0 ? 'warning' : 'success'}
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
      {/* 2. SPATIOUS 3D WORKSPACE & PREDICTIVE INTELLIGENCE BENTO GRID        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Large Central 3D Turbofan Digital Twin Workspace (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                    Turbofan Digital Twin Core Cutaway
                  </h3>
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">
                    Interactive 3D Cutaway
                  </span>
                </div>
                <p className="text-sm text-charcoal-500 mt-1 font-normal">
                  Detailed mechanical cutaway with realistic titanium materials, interactive hotspots, and floating telemetry
                </p>
              </div>
              <button
                onClick={onNavigateToTwin}
                className="flex items-center space-x-2 px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0"
              >
                <span>Full Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Subsystem quick-inspection selectors */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['fan', 'hpc', 'combustor', 'hpt', 'lpt', 'casing', 'exhaust'] as EngineSubsystemKey[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubsystem(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all uppercase ${
                    selectedSubsystem === sub
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#F4F3EE] text-charcoal-600 hover:bg-[#EAE9E4] hover:text-charcoal-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Large 3D Scene Viewport (Prominent height ~420px) */}
          <div className="h-[420px] w-full rounded-2xl overflow-hidden relative shadow-inner">
            <TurbofanScene
              selectedComponent={selectedSubsystem}
              onSelectComponent={setSelectedSubsystem}
              fanSpeed={activeEngine.risk_level === 'HIGH' ? 0.6 : 1.2}
              overallHealthIndex={activeEngine.health_index}
              thermalStress={activeEngine.sensors.sensor_4 > 1420 ? 1.4 : 1.0}
              predictedRul={activeEngine.predicted_rul}
              subsystemsWear={{
                fan: Math.round((1 - activeEngine.health_index) * 45),
                hpc: Math.round((1 - activeEngine.health_index) * 85),
                combustor: Math.round((1 - activeEngine.health_index) * 55),
                hpt: Math.round((1 - activeEngine.health_index) * 95),
                lpt: Math.round((1 - activeEngine.health_index) * 60)
              }}
            />
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#E5E4DE] flex items-center justify-between text-xs text-charcoal-500">
            <span className="font-semibold text-charcoal-800">
              TARGET: <span className="text-[#2563EB]">ENG-{activeEngine.engine_id.toString().padStart(3, '0')}</span>
            </span>
            <span className="text-charcoal-600 font-medium">
              FOCUS: <strong className="text-charcoal-900">{selectedSubsystem?.toUpperCase()}</strong>
            </span>
            <span className="text-emerald-700 font-semibold">C-MAPSS AERODYNAMIC PROFILE</span>
          </div>
        </div>

        {/* Right: Predictive Intelligence Hub (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                    Predictive Intelligence Hub
                  </h3>
                  <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
                    XGBoost ML
                  </span>
                </div>
                <p className="text-sm text-charcoal-500 mt-1">
                  Active Asset: <strong className="text-blue-600">ENG-{activeEngine.engine_id.toString().padStart(3, '0')}</strong> (Flight Cycle {activeEngine.current_cycle})
                </p>
              </div>
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>

            {/* Prediction Hero Readout Box */}
            <div className="bg-[#FAF9F5] border border-[#E5E4DE] rounded-2xl p-5 mb-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                    Remaining Useful Life (RUL)
                  </span>
                  <div className="text-4xl font-bold text-charcoal-900 mt-1.5 tracking-tight font-sans">
                    {activePrediction ? `${activePrediction.predicted_rul_cycles}` : `${activeEngine.predicted_rul}`}
                    <span className="text-base font-normal text-charcoal-500 ml-2">cycles</span>
                  </div>
                  <p className="text-xs text-charcoal-600 mt-2">
                    Confidence Interval: <strong className="text-charcoal-800">±9.8 cycles (Test MAE bound)</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                    Risk Level
                  </span>
                  <div className="mt-2">
                    <StatusBadge status={activePrediction?.maintenance_risk || activeEngine.risk_level} size="lg" />
                  </div>
                </div>
              </div>

              {/* Urgency Directive Banner */}
              <div className="mt-4 pt-3.5 border-t border-[#E5E4DE] flex items-center space-x-2 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-charcoal-700 font-medium leading-relaxed">
                  {activePrediction?.urgency_action || (activeEngine.predicted_rul < 25 ? 'Immediate depot-level removal required.' : 'Turbofan operates within normal flight envelope.')}
                </span>
              </div>
            </div>

            {/* Health & Anomaly Attribution Details */}
            <div className="grid grid-cols-2 gap-3.5 mb-5 text-sm">
              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E5E4DE]">
                <span className="text-charcoal-500 text-xs font-semibold uppercase tracking-wider">HEALTH INDEX</span>
                <div className="text-xl font-bold text-emerald-700 mt-1 font-sans">
                  {activePrediction?.health_assessment.health_index.toFixed(2) || activeEngine.health_index.toFixed(2)}
                  <span className="text-charcoal-400 text-xs font-normal"> / 1.00</span>
                </div>
              </div>
              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E5E4DE]">
                <span className="text-charcoal-500 text-xs font-semibold uppercase tracking-wider">ANOMALY STATUS</span>
                <div className="mt-1.5">
                  <StatusBadge status={activePrediction?.health_assessment.severity || activeEngine.anomaly_status} size="sm" />
                </div>
              </div>
            </div>

            {/* Dominant Sensor Signatures */}
            <div>
              <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider block mb-2.5">
                Critical Station Telemetry
              </span>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E4DE]">
                  <div className="text-charcoal-500 font-semibold text-[11px]">T24 (Fan Inlet)</div>
                  <div className="text-sm font-bold text-charcoal-800 mt-1">
                    {activeEngine.sensors.sensor_2?.toFixed(1)} <span className="text-xs text-charcoal-400 font-normal">°R</span>
                  </div>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E4DE]">
                  <div className="text-charcoal-500 font-semibold text-[11px]">T30 (HPC Temp)</div>
                  <div className="text-sm font-bold text-charcoal-800 mt-1">
                    {activeEngine.sensors.sensor_3?.toFixed(1)} <span className="text-xs text-charcoal-400 font-normal">°R</span>
                  </div>
                </div>
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E4DE]">
                  <div className="text-charcoal-500 font-semibold text-[11px]">T50 (LPT Temp)</div>
                  <div className={`text-sm font-bold mt-1 ${activeEngine.sensors.sensor_4 > 1420 ? 'text-rose-600' : 'text-charcoal-800'}`}>
                    {activeEngine.sensors.sensor_4?.toFixed(1)} <span className="text-xs text-charcoal-400 font-normal">°R</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E5E4DE] flex justify-between items-center">
            <span className="text-xs text-charcoal-500">
              Calculation: <strong className="text-charcoal-700">{activePrediction?.provenance?.calculation_method || 'full_history_rolling'}</strong>
            </span>
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
      {/* 3. PROGNOSTIC ANALYTICS & GOVERNANCE BENTO STRIP                     */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* RUL Distribution Histogram (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-3">
            <div>
              <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                Fleet RUL Prognostic Distribution
              </h3>
              <p className="text-sm text-charcoal-500 mt-0.5">Remaining Useful Life frequency distribution across 100 in-service turbofans</p>
            </div>
            <BarChart2 className="w-5 h-5 text-charcoal-400" />
          </div>

          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rulBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE9E4" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#606670' }} axisLine={{ stroke: '#D6D4CC' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#606670' }} axisLine={{ stroke: '#D6D4CC' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E4DE',
                    borderRadius: '12px',
                    color: '#1C1E21',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} name="Turbofans" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#E5E4DE] text-xs text-charcoal-500 flex justify-between font-sans">
            <span>NASA C-MAPSS FD001 • 125 CYCLE CAP BENCHMARK</span>
            <span className="text-rose-600 font-semibold">{fleetData.critical_count} Engines at Immediate AOG Removal Threshold</span>
          </div>
        </div>

        {/* Model Governance Specifications (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-4">
              <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">Model Engine Specs</h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                AUDITED
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-[#F0EFEA]">
                <span className="text-charcoal-500">Selected Architecture</span>
                <span className="text-charcoal-900 font-semibold">Tuned XGBoost</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0EFEA]">
                <span className="text-charcoal-500">Selection Protocol</span>
                <span className="text-blue-600 font-semibold">Validation Only (Zero Leakage)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0EFEA]">
                <span className="text-charcoal-500">Validation RMSE</span>
                <span className="text-emerald-700 font-bold">11.23 cycles</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0EFEA]">
                <span className="text-charcoal-500">Held-Out Test RMSE</span>
                <span className="text-charcoal-900 font-semibold">13.70 cycles</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-charcoal-500">NASA Asymmetric PHM Score</span>
                <span className="text-blue-700 font-bold">279.0</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E5E4DE] text-xs text-charcoal-600 mt-4 leading-relaxed">
            Dual Isolation Forest + PCA reconstruction error tracks multi-station thermodynamic drift.
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. REAL-TIME TURBOFAN MONITORING MATRIX                              */}
      {/* ==================================================================== */}
      <div className="bg-white border border-[#E5E4DE] rounded-2xl overflow-hidden shadow-bento">
        <div className="p-6 border-b border-[#E5E4DE] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                Turbofan Fleet Monitoring Matrix
              </h3>
              <span className="text-xs text-charcoal-500 font-medium">
                ({filteredEngines.length} of {fleetData.total_engines} engines)
              </span>
            </div>
            <p className="text-sm text-charcoal-500 mt-1 font-normal">
              Real-time telemetry, thermodynamic sensor stations, and predicted failure horizons
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search engine ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#FAF9F5] border border-[#E5E4DE] text-sm rounded-xl pl-9 pr-3.5 py-2 text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Risk Filter Buttons */}
            <div className="flex items-center space-x-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E5E4DE] text-xs">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold ${
                    filterRisk === risk
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
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
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <td className="font-bold text-charcoal-900">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-charcoal-300'}`}></span>
                        <span>ENG-{eng.engine_id.toString().padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td className="text-charcoal-700">{eng.current_cycle}</td>
                    <td className="font-bold">
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
                    <td className="text-charcoal-700">{eng.health_index.toFixed(2)}</td>
                    <td>
                      <StatusBadge status={eng.anomaly_status} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={eng.risk_level} size="sm" />
                    </td>
                    <td className="text-xs text-charcoal-600">{eng.sensors.sensor_2?.toFixed(1)} °R</td>
                    <td className="text-xs text-charcoal-600">{eng.sensors.sensor_3?.toFixed(1)} °R</td>
                    <td className={`text-xs font-semibold ${eng.sensors.sensor_4 > 1420 ? 'text-rose-600' : 'text-charcoal-600'}`}>
                      {eng.sensors.sensor_4?.toFixed(1)} °R
                    </td>
                    <td className="text-xs text-charcoal-600">{eng.sensors.sensor_7?.toFixed(1)} psia</td>
                    <td className="text-xs text-charcoal-600">{eng.sensors.sensor_9?.toFixed(0)} rpm</td>
                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEngine(eng.engine_id);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#EAE9E4] transition-colors border border-[#E5E4DE] shadow-xs"
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

        <div className="p-4 bg-[#FAF9F5] border-t border-[#E5E4DE] text-xs text-charcoal-500 flex justify-between items-center font-sans">
          <span>Showing 15 of {filteredEngines.length} matching engines</span>
          <span className="font-semibold text-blue-600">CLICK ANY ROW TO PREVIEW IN DIGITAL TWIN</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. ACTIVE OPERATIONAL ALERTS STREAM                                  */}
      {/* ==================================================================== */}
      <div className="bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                Active Operational Alerts Stream
              </h3>
              <p className="text-sm text-charcoal-500 mt-0.5">
                Real-time machine notifications triggered by anomaly score thresholds and RUL safety limits
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-charcoal-700 bg-[#FAF9F5] px-3 py-1 rounded-full border border-[#E5E4DE]">
            {activeAlertsCount} ACTIVE UNRESOLVED
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-charcoal-500">
            All turbofans operating within nominal parameters. No active alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  alert.acknowledged
                    ? 'bg-[#FAF9F5] border-[#E5E4DE] opacity-60'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                    : 'bg-amber-50/70 border-amber-200 shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-charcoal-900">
                        ENG-{alert.engineId.toString().padStart(3, '0')}
                      </span>
                      <StatusBadge status={alert.severity} size="sm" />
                      <span className="text-xs text-charcoal-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-sm text-charcoal-800 font-medium mt-1">{alert.trigger}</p>
                    <p className="text-xs text-charcoal-600 mt-1">
                      <strong className="text-charcoal-800 font-semibold">Action:</strong> {alert.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onSelectEngine(alert.engineId)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-[#FAF9F5] text-charcoal-700 rounded-xl border border-[#E5E4DE] transition-colors shadow-xs"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => toggleAlertAck(alert.id)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border flex items-center space-x-1.5 transition-colors shadow-xs ${
                      alert.acknowledged
                        ? 'bg-[#FAF9F5] text-charcoal-500 border-[#E5E4DE]'
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
