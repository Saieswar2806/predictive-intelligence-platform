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
    return <div className="text-rose-600 text-sm">Failed to load maintenance records.</div>;
  }

  // Rank engines by maintenance priority: lowest RUL & highest anomaly severity first
  const prioritizedEngines = [...fleetData.engines].sort((a, b) => {
    if (a.risk_level === 'HIGH' && b.risk_level !== 'HIGH') return -1;
    if (b.risk_level === 'HIGH' && a.risk_level !== 'HIGH') return 1;
    return a.predicted_rul - b.predicted_rul;
  });

  return (
    <div className="space-y-6">
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
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Prescriptive Maintenance Intervention Comparison
          </h3>
          <p className="text-xs text-slate-500">
            Comparative technical recovery trade-offs for turbofan lifecycle extension
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Compressor Core Wash</span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">
                ON-WING
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detergent solution injection through fan duct removing atmospheric salt, ash, and particulate fouling.
            </p>
            <div className="pt-2 border-t border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">HPC Fouling Recovery:</span>
                <span className="font-bold text-emerald-600">~55% Recovered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">EGT Margin Recovery:</span>
                <span className="font-bold text-emerald-600">+8°C Margin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Typical Downtime:</span>
                <span className="text-slate-700">4 Hours</span>
              </div>
            </div>
          </div>

          {/* Action 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Hot-Section Blade Repair</span>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded">
                LINE STATION
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Borescope inspection of HPT stage 1 blades, leading-edge blending, and thermal barrier touch-up.
            </p>
            <div className="pt-2 border-t border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">HPT Creep Wear Recovery:</span>
                <span className="font-bold text-emerald-600">~40% Recovered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RUL Extension:</span>
                <span className="font-bold text-emerald-600">+25 – 35 Cycles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Typical Downtime:</span>
                <span className="text-slate-700">18 Hours</span>
              </div>
            </div>
          </div>

          {/* Action 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Full Depot Overhaul</span>
              <span className="text-[10px] font-mono bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded">
                SHOP VISIT
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete module disassembly, rotor rebalancing, life-limited parts (LLP) replacement, test cell run.
            </p>
            <div className="pt-2 border-t border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Subsystem Recovery:</span>
                <span className="font-bold text-emerald-600">100% (Pristine)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RUL Reset:</span>
                <span className="font-bold text-emerald-600">Full Design Life</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Typical Downtime:</span>
                <span className="text-slate-700">28 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prioritized Turbofan Maintenance Schedule */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Turbofan Maintenance Priority Ranking
          </h3>
          <p className="text-xs text-slate-500">
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
                  <tr key={eng.engine_id} className={`hover:bg-slate-50/80 transition-colors ${isUrgent ? 'bg-rose-50/30' : ''}`}>
                    <td className="font-mono font-bold text-slate-700">#{idx + 1}</td>
                    <td className="font-mono font-bold text-slate-900">
                      ENG-{eng.engine_id.toString().padStart(3, '0')}
                    </td>
                    <td className="font-mono text-slate-600">{eng.current_cycle}</td>
                    <td className="font-mono font-bold">
                      <span className={eng.predicted_rul < 25 ? 'text-rose-600' : 'text-slate-900'}>
                        {eng.predicted_rul} cycles
                      </span>
                    </td>
                    <td className="font-mono">{eng.health_index.toFixed(2)}</td>
                    <td>
                      <StatusBadge status={eng.risk_level} size="sm" />
                    </td>
                    <td className="font-mono text-xs text-slate-700">
                      {eng.predicted_rul < 20
                        ? 'Immediate (Within 5 cycles)'
                        : eng.predicted_rul < 45
                        ? 'Next A-Check (Within 15 cycles)'
                        : 'Routine C-Check window'}
                    </td>
                    <td className="text-xs font-medium text-slate-800">
                      {eng.predicted_rul < 20
                        ? 'Borescope HPT Stage 1 & Schedule Removal'
                        : eng.predicted_rul < 45
                        ? 'Perform Detergent Compressor Core Wash'
                        : 'Continue Standard Flight Monitoring'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing Top 15 Highest Priority Turbofans</span>
          <span className="font-mono text-[11px]">DECISION SUPPORT ONLY • FAA / EASA COMPLIANCE REQUIRED</span>
        </div>
      </div>

      {/* Regulatory & Safety Disclaimer */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Decision-Support Notice:</strong> Maintenance recommendations generated by this predictive intelligence
          platform are intended strictly for engineering decision support and planning prioritization. All maintenance
          actions, component removals, and airframe deferrals must comply with applicable Type Certificate Data Sheets (TCDS),
          Aircraft Maintenance Manuals (AMM), and certified human engineering sign-off.
        </p>
      </div>
    </div>
  );
};
