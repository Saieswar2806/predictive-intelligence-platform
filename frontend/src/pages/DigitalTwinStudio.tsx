import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Wrench,
  AlertOctagon,
  Flame,
  Wind,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { DigitalTwinState, SubsystemHealth } from '../types/api';
import { TurbofanScene } from '../three/TurbofanScene';
import { EngineSubsystemKey } from '../three/TurbofanCutawayModel';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const SUBSYSTEM_DETAILS: Record<
  EngineSubsystemKey,
  { name: string; station: string; role: string; primaryFailureMode: string }
> = {
  fan: {
    name: 'Fan & Low Pressure Compressor (LPC)',
    station: 'Station 2.0 – 2.5',
    role: 'Primary bypass thrust generation and initial core air pressurization.',
    primaryFailureMode: 'Blade tip clearance erosion, aerodynamic stall margin decay.',
  },
  hpc: {
    name: 'High Pressure Compressor (HPC)',
    station: 'Station 2.5 – 3.0',
    role: '9-stage axial compression delivering high-pressure air (P30, T30) to combustor.',
    primaryFailureMode: 'Compressor blade fouling, particulate deposition, tip rubbing.',
  },
  combustor: {
    name: 'Annular Combustor Section',
    station: 'Station 3.0 – 4.0',
    role: 'High-temperature kerosene combustion generating high-energy gas stream.',
    primaryFailureMode: 'Thermal distress, liner hot spots, fuel nozzle coking.',
  },
  hpt: {
    name: 'High Pressure Turbine (HPT)',
    station: 'Station 4.0 – 4.5',
    role: 'Extracts gas energy to drive the high-pressure compressor core shaft.',
    primaryFailureMode: 'First-stage blade thermal creep, TBC spallation, cooling hole erosion.',
  },
  lpt: {
    name: 'Low Pressure Turbine (LPT)',
    station: 'Station 4.5 – 5.0',
    role: 'Extracts downstream gas energy to drive the primary intake fan.',
    primaryFailureMode: 'Inter-stage seal wear, aerodynamic unbalance, casing clearance growth.',
  },
  casing: {
    name: 'Aerodynamic Nacelle & Core Cowling',
    station: 'Station Outer Boundary',
    role: 'Structural bypass containment, acoustic dampening, and aerodynamic streamlining.',
    primaryFailureMode: 'Acoustic tile delamination, cowl latch fatigue, vibration fretting.',
  },
  exhaust: {
    name: 'Exhaust Nozzle & Centerbody Plug',
    station: 'Station 8.0 – 9.0',
    role: 'Core gas acceleration and bypass air mixing for optimal propulsive efficiency.',
    primaryFailureMode: 'Thermal nozzle distortion, acoustic cracking, aerodynamic drag rise.',
  },
};

export const DigitalTwinStudio: React.FC = () => {
  const [twinState, setTwinState] = useState<DigitalTwinState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Inspector Focus
  const [selectedSubsystem, setSelectedSubsystem] = useState<EngineSubsystemKey>('hpt');

  // Stress Simulation Parameters
  const [thermalStress, setThermalStress] = useState<number>(1.0);
  const [contamination, setContamination] = useState<number>(1.0);
  const [thrustDerate, setThrustDerate] = useState<number>(0.0);
  const [stepCycles, setStepCycles] = useState<number>(5);

  // Simulation Telemetry History for chart
  const [historyTelemetry, setHistoryTelemetry] = useState<
    Array<{ cycle: number; t50: number; t30: number; rul: number }>
  >([]);

  useEffect(() => {
    initDigitalTwin();
  }, []);

  const initDigitalTwin = async () => {
    setLoading(true);
    try {
      const state = await api.simulateTwin({
        engine_id: 1,
        cycles_to_advance: 1,
        thermal_stress: 1.0,
        contamination: 1.0,
        thrust_derate: 0.0,
      });
      setTwinState(state);
      setHistoryTelemetry([
        {
          cycle: state.cycle,
          t50: state.latest_telemetry.sensor_4 || 1400.0,
          t30: state.latest_telemetry.sensor_3 || 1585.0,
          rul: state.live_predictions?.predicted_rul || 120.0,
        },
      ]);
    } catch (err) {
      console.error('Failed to init digital twin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepSimulation = async (action?: string) => {
    setSimulating(true);
    try {
      const state = await api.simulateTwin({
        engine_id: 1,
        cycles_to_advance: action ? 1 : stepCycles,
        thermal_stress: thermalStress,
        contamination: contamination,
        thrust_derate: thrustDerate,
        maintenance_action: action,
      });
      setTwinState(state);
      setHistoryTelemetry((prev) => [
        ...prev.slice(-30),
        {
          cycle: state.cycle,
          t50: state.latest_telemetry.sensor_4 || 1400.0,
          t30: state.latest_telemetry.sensor_3 || 1585.0,
          rul: state.live_predictions?.predicted_rul || 120.0,
        },
      ]);
    } catch (err) {
      console.error('Simulation step error:', err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading || !twinState) {
    return <LoadingSpinner message="Spinning up 3D Digital Twin simulation kernel..." size="lg" />;
  }

  const selectedInfo = SUBSYSTEM_DETAILS[selectedSubsystem];
  const subsystems = twinState.subsystems;
  const currentSubWear =
    selectedSubsystem === 'fan'
      ? subsystems['Fan & LPC'].wear_pct
      : selectedSubsystem === 'hpc'
      ? subsystems['High Pressure Compressor (HPC)'].wear_pct
      : selectedSubsystem === 'combustor'
      ? subsystems['Combustor Section'].wear_pct
      : selectedSubsystem === 'hpt'
      ? subsystems['High Pressure Turbine (HPT)'].wear_pct
      : selectedSubsystem === 'lpt'
      ? subsystems['Low Pressure Turbine (LPT)'].wear_pct
      : 5;

  return (
    <div className="space-y-7 font-sans">
      {/* ==================================================================== */}
      {/* 1. TOP BENTO KPI METRICS                                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E4DE] rounded-2xl p-5 shadow-bento border-l-4 border-l-blue-600">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Simulated Flight Cycle</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-charcoal-900 font-sans">{twinState.cycle}</span>
            <span className="text-xs text-charcoal-500 font-medium">({twinState.flight_hours} hrs logged)</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4DE] rounded-2xl p-5 shadow-bento border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Overall Health Index (HI)</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-emerald-700 font-sans">
              {twinState.overall_health_index.toFixed(2)}
            </span>
            <span className="text-xs text-charcoal-500">[0.00 – 1.00]</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4DE] rounded-2xl p-5 shadow-bento border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Estimated RUL</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-charcoal-900 font-sans">
              {twinState.live_predictions?.predicted_rul ?? '—'}
            </span>
            <span className="text-xs text-charcoal-500">cycles remaining</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4DE] rounded-2xl p-5 shadow-bento border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Maintenance Urgency</p>
          <div className="mt-2.5 flex items-center space-x-2">
            <StatusBadge status={twinState.prescriptive_maintenance.urgency} size="lg" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SPATIAL CUTAWAY 3D VIEWPORT & COMPONENT DIAGNOSTICS               */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Large Central 3D Scene Viewport (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div className="pb-4 border-b border-[#E5E4DE] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-xl font-bold text-charcoal-900 font-sans tracking-tight">
                Turbofan Cutaway Digital Twin (Station View)
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-xs text-charcoal-500">
              <span>SELECTED:</span>
              <span className="font-bold text-blue-600 uppercase">{selectedSubsystem}</span>
            </div>
          </div>

          <div className="h-[490px] w-full rounded-2xl overflow-hidden my-4 relative shadow-inner">
            <TurbofanScene
              selectedComponent={selectedSubsystem}
              onSelectComponent={setSelectedSubsystem}
              fanSpeed={1.2}
              overallHealthIndex={twinState.overall_health_index}
              thermalStress={thermalStress}
              predictedRul={twinState.live_predictions?.predicted_rul || 112}
              subsystemsWear={{
                fan: subsystems['Fan & LPC'].wear_pct,
                hpc: subsystems['High Pressure Compressor (HPC)'].wear_pct,
                combustor: subsystems['Combustor Section'].wear_pct,
                hpt: subsystems['High Pressure Turbine (HPT)'].wear_pct,
                lpt: subsystems['Low Pressure Turbine (LPT)'].wear_pct,
              }}
            />
          </div>

          {/* Subsystem quick-selection pill bar */}
          <div className="pt-3.5 border-t border-[#E5E4DE] flex flex-wrap gap-2">
            {[
              { id: 'fan', label: 'Fan & LPC' },
              { id: 'hpc', label: 'HPC Compressor' },
              { id: 'combustor', label: 'Combustor' },
              { id: 'hpt', label: 'HPT Turbine' },
              { id: 'lpt', label: 'LPT Turbine' },
              { id: 'casing', label: 'Cowling / Nacelle' },
              { id: 'exhaust', label: 'Exhaust Plug' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubsystem(sub.id as EngineSubsystemKey)}
                className={`px-3 py-1.5 text-xs rounded-xl transition-all font-semibold ${
                  selectedSubsystem === sub.id
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-[#F4F3EE] text-charcoal-600 hover:bg-[#EAE9E4]'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Component Technical Inspector Panel (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div className="space-y-5">
            <div className="pb-4 border-b border-[#E5E4DE]">
              <span className="text-xs uppercase tracking-wider text-charcoal-500 font-bold">
                COMPONENT DIAGNOSTICS
              </span>
              <h3 className="text-lg font-bold text-charcoal-900 tracking-tight mt-1 font-sans">{selectedInfo.name}</h3>
              <p className="text-xs text-blue-600 font-semibold mt-1">{selectedInfo.station}</p>
            </div>

            {/* Wear level progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-charcoal-600 font-semibold">Degradation / Wear Level</span>
                <span className="font-bold text-charcoal-900 text-sm">{currentSubWear}%</span>
              </div>
              <div className="w-full bg-[#FAF9F5] rounded-full h-3 overflow-hidden border border-[#E5E4DE]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    currentSubWear > 65
                      ? 'bg-rose-500'
                      : currentSubWear > 35
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, currentSubWear)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="p-4 bg-[#FAF9F5] border border-[#E5E4DE] rounded-xl">
                <p className="font-bold text-charcoal-800 mb-1 text-xs">Functional Aerodynamic Role:</p>
                <p className="text-charcoal-600 text-xs leading-relaxed">{selectedInfo.role}</p>
              </div>

              <div className="p-4 bg-[#FAF9F5] border border-[#E5E4DE] rounded-xl">
                <p className="font-bold text-charcoal-800 mb-1 text-xs">Physical Failure Mechanics:</p>
                <p className="text-charcoal-600 text-xs leading-relaxed">{selectedInfo.primaryFailureMode}</p>
              </div>
            </div>
          </div>

          {/* Prescriptive Advisory Callout */}
          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2 text-blue-800 font-semibold text-xs mb-1">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Prescriptive Maintenance Action:</span>
            </div>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              {twinState.prescriptive_maintenance.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. WHAT-IF STRESS LAB & TELEMETRY RESPONSE TRAJECTORY                */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Stress & Operational Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento space-y-5">
          <div className="pb-4 border-b border-[#E5E4DE]">
            <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
              What-If Operational Stress Lab
            </h3>
            <p className="text-sm text-charcoal-500 mt-1 font-normal">
              Inject operational stresses to simulate accelerated multi-component degradation
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-charcoal-700 font-semibold flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Thermal Stress Multiplier</span>
                </span>
                <span className="text-blue-600 font-bold">{thermalStress.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={thermalStress}
                onChange={(e) => setThermalStress(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-[#EAE9E4] rounded-lg cursor-pointer"
              />
              <span className="text-xs text-charcoal-500 mt-1 block">1.0 = Nominal • 2.0 = Hot Desert Ambient Takeoff</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-charcoal-700 font-semibold flex items-center space-x-1.5">
                  <Wind className="w-4 h-4 text-amber-500" />
                  <span>Particulate / Sand Contamination</span>
                </span>
                <span className="text-amber-600 font-bold">{contamination.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={contamination}
                onChange={(e) => setContamination(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-[#EAE9E4] rounded-lg cursor-pointer"
              />
              <span className="text-xs text-charcoal-500 mt-1 block">Accelerates HPC blade fouling and tip clearance loss</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-charcoal-700 font-semibold flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Thrust Derating (Life Extension)</span>
                </span>
                <span className="text-emerald-700 font-bold">{(thrustDerate * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.25"
                step="0.05"
                value={thrustDerate}
                onChange={(e) => setThrustDerate(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-[#EAE9E4] rounded-lg cursor-pointer"
              />
              <span className="text-xs text-charcoal-500 mt-1 block">Derated climb throttles core EGT to prolong HPT life</span>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <select
              value={stepCycles}
              onChange={(e) => setStepCycles(parseInt(e.target.value))}
              aria-label="Advance Simulation Cycles"
              className="text-xs border border-[#E5E4DE] rounded-xl px-3 py-2.5 bg-[#FAF9F5] text-charcoal-800 font-medium cursor-pointer"
            >
              <option value="1">Advance +1 cycle</option>
              <option value="5">Advance +5 cycles</option>
              <option value="10">Advance +10 cycles</option>
              <option value="20">Advance +20 cycles</option>
            </select>

            <button
              onClick={() => handleStepSimulation()}
              disabled={simulating}
              className="flex-1 flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulating ? 'Simulating...' : 'Advance Simulation'}</span>
            </button>
          </div>

          {/* Maintenance Action Buttons */}
          <div className="pt-4 border-t border-[#E5E4DE]">
            <p className="text-xs uppercase tracking-wider text-charcoal-500 mb-2.5 font-bold">
              Simulate Maintenance Actions
            </p>
            <div className="grid grid-cols-3 gap-2.5 text-xs font-semibold">
              <button
                onClick={() => handleStepSimulation('compressor_wash')}
                disabled={simulating}
                className="p-2.5 border border-[#E5E4DE] bg-[#FAF9F5] hover:bg-[#F2F1EC] rounded-xl text-center text-charcoal-700 transition-colors shadow-xs"
              >
                🧼 Core Wash
              </button>
              <button
                onClick={() => handleStepSimulation('hot_section_inspection')}
                disabled={simulating}
                className="p-2.5 border border-[#E5E4DE] bg-[#FAF9F5] hover:bg-[#F2F1EC] rounded-xl text-center text-charcoal-700 transition-colors shadow-xs"
              >
                🔧 Blade Repair
              </button>
              <button
                onClick={() => handleStepSimulation('major_overhaul')}
                disabled={simulating}
                className="p-2.5 border border-[#E5E4DE] bg-[#FAF9F5] hover:bg-[#F2F1EC] rounded-xl text-center text-charcoal-700 transition-colors shadow-xs"
              >
                🔄 Overhaul
              </button>
            </div>
          </div>
        </div>

        {/* Live Simulation Telemetry & Degradation Trajectory Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E5E4DE] rounded-2xl p-6 shadow-bento flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E4DE] mb-4">
              <div>
                <h3 className="text-xl font-bold text-charcoal-900 tracking-tight font-sans">
                  Simulated Degradation Trajectory (EGT & RUL Response)
                </h3>
                <p className="text-sm text-charcoal-500 mt-1 font-normal">
                  Live response of LPT exhaust gas temperature (T50) & predicted remaining life
                </p>
              </div>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyTelemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE9E4" />
                  <XAxis dataKey="cycle" tick={{ fontSize: 12, fill: '#606670' }} axisLine={{ stroke: '#D6D4CC' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#606670' }} axisLine={{ stroke: '#D6D4CC' }} domain={['auto', 'auto']} />
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
                  <Line
                    type="monotone"
                    dataKey="t50"
                    stroke="#EA580C"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name="LPT Temp T50 (°R)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rul"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name="Predicted RUL (cycles)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E4DE] flex items-center justify-between text-xs text-charcoal-500 font-sans">
            <span>LIVE INFERENCE: ACTIVE</span>
            <span>MODEL: XGBOOST REGRESSOR (ZERO LEAKAGE)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
