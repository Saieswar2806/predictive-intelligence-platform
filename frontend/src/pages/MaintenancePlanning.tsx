import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  AlertTriangle,
  Calendar,
  Shield,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { FleetOverviewResponse, FleetEngineSummary } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const MaintenancePlanning: React.FC = () => {
  const [fleetData, setFleetData] = useState<FleetOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    setLoading(true);
    try {
      const data = await api.getFleetOverview();
      setFleetData(data);
    } catch (err) {
      console.error('Failed to load fleet maintenance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating maintenance scheduling windows..." size="lg" />;
  }

  if (!fleetData) {
    return <div className="text-rose-600 font-mono text-sm p-4 bg-rose-50 border border-rose-200 rounded-lg">Failed to load maintenance records.</div>;
  }

  // Rank engines by maintenance priority: lowest RUL & highest anomaly severity first
  const prioritizedEngines = [...fleetData.engines].sort((a, b) => {
    if (a.risk_level === 'HIGH' && b.risk_level !== 'HIGH') return -1;
    if (b.risk_level === 'HIGH' && a.risk_level !== 'HIGH') return 1;
    return a.predicted_rul - b.predicted_rul;
  });

  return (
    <div className="space-y-7">
      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Immediate Action Due"
          value={fleetData.critical_count}
          subtitle="Within 20 flight cycles"
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          title="Scheduled Shop Visits"
          value={fleetData.warning_count}
          subtitle="Window: 20 – 50 cycles"
          icon={Calendar}
          variant="warning"
        />
        <MetricCard
          title="Nominal In-Service"
          value={fleetData.healthy_count}
          subtitle="Unrestricted operation"
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Fleet Health Index"
          value={fleetData.avg_health_index.toFixed(2)}
          subtitle="Overall fleet integrity"
          icon={Shield}
          variant="accent"
        />
      </div>

      {/* Maintenance Scenario Recovery Comparison */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-200 mb-5">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            Prescriptive Maintenance Intervention Comparison
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Comparative technical recovery trade-offs for turbofan lifecycle extension
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Action 1 */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base font-mono">Compressor Core Wash</span>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-0.5 rounded-full">
                ON-WING
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detergent solution injection through fan duct removing atmospheric salt, ash, and particulate fouling.
            </p>
            <div className="pt-3 border-t border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">HPC Fouling Recovery:</span>
                <span className="font-bold text-emerald-700">~55% Recovered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">EGT Margin Recovery:</span>
                <span className="font-bold text-emerald-700">+8°C Margin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Typical Downtime:</span>
                <span className="text-slate-800 font-semibold">4 Hours</span>
              </div>
            </div>
          </div>

          {/* Action 2 */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base font-mono">Hot-Section Blade Repair</span>
              <span className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-2.5 py-0.5 rounded-full">
                LINE STATION
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Borescope inspection of HPT stage 1 blades, leading-edge blending, and thermal barrier touch-up.
            </p>
            <div className="pt-3 border-t border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">HPT Creep Wear Recovery:</span>
                <span className="font-bold text-emerald-700">~40% Recovered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">RUL Extension:</span>
                <span className="font-bold text-emerald-700">+25 – 35 Cycles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Typical Downtime:</span>
                <span className="text-slate-800 font-semibold">18 Hours</span>
              </div>
            </div>
          </div>

          {/* Action 3 */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base font-mono">Full Depot Overhaul</span>
              <span className="text-xs font-mono bg-purple-50 text-purple-700 border border-purple-200 font-semibold px-2.5 py-0.5 rounded-full">
                SHOP VISIT
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete module disassembly, rotor rebalancing, life-limited parts (LLP) replacement, test cell run.
            </p>
            <div className="pt-3 border-t border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Subsystem Recovery:</span>
                <span className="font-bold text-emerald-700">100% (Pristine)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">RUL Reset:</span>
                <span className="font-bold text-emerald-700">Full Design Life</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Typical Downtime:</span>
                <span className="text-slate-800 font-semibold">28 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prioritized Turbofan Maintenance Schedule */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            Turbofan Maintenance Priority Ranking
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Sorted by urgency based on Remaining Useful Life and multi-sensor anomaly classification
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full eng-table text-left">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Engine ID</th>
                <th>Current Cycle</th>
                <th>Predicted RUL</th>
                <th>Health Index</th>
                <th>Risk Classification</th>
                <th>Recommended Inspection Window</th>
                <th>Prescriptive Action</th>
              </tr>
            </thead>
            <tbody>
              {prioritizedEngines.slice(0, 15).map((eng, idx) => {
                const isUrgent = eng.risk_level === 'HIGH';
                return (
                  <tr key={eng.engine_id} className={`hover:bg-slate-50 transition-colors ${isUrgent ? 'bg-rose-50/60' : ''}`}>
                    <td className="font-mono font-bold text-blue-600">#{idx + 1}</td>
                    <td className="font-mono font-bold text-slate-900">
                      ENG-{eng.engine_id.toString().padStart(3, '0')}
                    </td>
                    <td className="font-mono text-slate-700">{eng.current_cycle}</td>
                    <td className="font-mono font-bold">
                      <span className={eng.predicted_rul < 25 ? 'text-rose-600' : eng.predicted_rul < 55 ? 'text-amber-600' : 'text-emerald-700'}>
                        {eng.predicted_rul} cycles
                      </span>
                    </td>
                    <td className="font-mono text-slate-700">{eng.health_index.toFixed(2)}</td>
                    <td>
                      <StatusBadge status={eng.risk_level} size="sm" />
                    </td>
                    <td className="font-mono text-xs text-slate-700 font-semibold">
                      {eng.predicted_rul < 25
                        ? 'Next 3 Cycles (Immediate)'
                        : eng.predicted_rul < 50
                        ? 'Within 15 Cycles'
                        : 'Routine Scheduled Phase'}
                    </td>
                    <td>
                      <span
                        className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
                          eng.predicted_rul < 25
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : eng.predicted_rul < 50
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {eng.predicted_rul < 25
                          ? 'Depot Removal & Overhaul'
                          : eng.predicted_rul < 50
                          ? 'Borescope Blade Inspection'
                          : 'Standard Telemetry Watch'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center font-mono">
          <span>Showing 15 highest-priority turbofans</span>
          <span>OPTIMIZED FOR MINIMUM FLEET GROUNDING DOWNTIME</span>
        </div>
      </div>
    </div>
  );
};
