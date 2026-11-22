import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TurbofanCutawayModel, EngineSubsystemKey } from './TurbofanCutawayModel';
import { Activity, Flame, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

interface TurbofanSceneProps {
  selectedComponent: EngineSubsystemKey | null;
  onSelectComponent: (comp: EngineSubsystemKey) => void;
  fanSpeed?: number;
  overallHealthIndex?: number;
  thermalStress?: number;
  predictedRul?: number;
  subsystemsWear?: {
    fan?: number;
    hpc?: number;
    combustor?: number;
    hpt?: number;
    lpt?: number;
  };
  interactive?: boolean;
}

export const TurbofanScene: React.FC<TurbofanSceneProps> = ({
  selectedComponent,
  onSelectComponent,
  fanSpeed = 1.0,
  overallHealthIndex = 0.95,
  thermalStress = 1.0,
  predictedRul = 112,
  subsystemsWear = { fan: 5, hpc: 8, combustor: 4, hpt: 10, lpt: 6 },
  interactive = true,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const setCameraView = (view: 'iso' | 'side' | 'front' | 'turbine') => {
    if (!controlsRef.current) return;
    if (view === 'iso') {
      controlsRef.current.object.position.set(3.8, 2.2, 4.2);
      controlsRef.current.target.set(0, 0, -0.3);
    } else if (view === 'side') {
      controlsRef.current.object.position.set(5.5, 0.4, -0.4);
      controlsRef.current.target.set(0, 0, -0.4);
    } else if (view === 'front') {
      controlsRef.current.object.position.set(0, 0.2, 5.0);
      controlsRef.current.target.set(0, 0, 1.2);
    } else if (view === 'turbine') {
      controlsRef.current.object.position.set(2.8, 1.0, -1.8);
      controlsRef.current.target.set(0, 0, -1.8);
    }
    controlsRef.current.update();
  };

  const getSubsystemTitle = (sub: EngineSubsystemKey | null) => {
    switch (sub) {
      case 'fan': return 'Fan & Low Pressure Compressor';
      case 'hpc': return 'High Pressure Compressor (HPC)';
      case 'combustor': return 'Annular Combustor Section';
      case 'hpt': return 'High Pressure Turbine (HPT)';
      case 'lpt': return 'Low Pressure Turbine (LPT)';
      case 'casing': return 'Aerodynamic Nacelle & Duct';
      case 'exhaust': return 'Exhaust Mixer & Tail Plug';
      default: return 'Core Gas Turbine Spool';
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#F7F6F2] via-[#EFECE4] to-[#E3E0D6] rounded-2xl border border-[#E5E4DE] shadow-sm select-none">
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[3.8, 2.2, 4.2]} fov={40} />

        {/* Warm Studio Engineering Illumination */}
        <ambientLight intensity={1.1} color="#FFFBF5" />
        <directionalLight position={[6, 9, 5]} intensity={1.6} castShadow color="#FFFFFF" />
        <directionalLight position={[-6, 4, -4]} intensity={0.9} color="#E0E7FF" />
        <directionalLight position={[0, -4, 0]} intensity={0.3} color="#D1D5DB" />
        <pointLight
          position={[0, 0.2, -1.5]}
          intensity={1.8}
          color={thermalStress > 1.3 ? '#EA580C' : '#0284C7'}
          distance={4.5}
        />

        <Suspense fallback={null}>
          <TurbofanCutawayModel
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
            fanSpeed={fanSpeed}
            overallHealthIndex={overallHealthIndex}
            thermalStress={thermalStress}
            subsystemsWear={subsystemsWear}
          />

          {/* Warm Studio Reflection Ground Disc */}
          <mesh position={[0, -1.8, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.6, 4.4, 64]} />
            <meshStandardMaterial color="#BDBAA9" transparent opacity={0.28} roughness={0.8} />
          </mesh>
        </Suspense>

        {interactive && (
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={2.2}
            maxDistance={8.5}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 6}
          />
        )}
      </Canvas>

      {/* FLOATING WHITE TELEMETRY CARDS (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}

      {/* Floating Card 1: Engine Health Index Callout (Top-Left) */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-[#E5E4DE] rounded-xl px-3.5 py-2.5 shadow-sm pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Fleet Health</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className="text-lg font-bold text-charcoal-900 font-sans">
            {Math.round(overallHealthIndex * 100)}%
          </span>
          <span className="text-xs font-medium text-emerald-700">Nominal Margin</span>
        </div>
      </div>

      {/* Floating Card 2: Camera Presets (Top-Right) */}
      <div className="absolute top-4 right-4 flex items-center space-x-1 bg-white/95 backdrop-blur-md border border-[#E5E4DE] p-1.5 rounded-xl text-xs font-sans text-charcoal-700 shadow-sm z-10">
        <span className="text-charcoal-400 px-1 font-semibold text-[11px] hidden sm:inline">PRESET:</span>
        <button
          onClick={() => setCameraView('iso')}
          className="px-2.5 py-1 rounded-lg hover:bg-[#F2F1EC] font-semibold text-charcoal-800 transition-colors"
          title="Isometric CAD Perspective"
        >
          ISO
        </button>
        <button
          onClick={() => setCameraView('side')}
          className="px-2.5 py-1 rounded-lg hover:bg-[#F2F1EC] font-semibold text-charcoal-800 transition-colors"
          title="Side Profile"
        >
          SIDE
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2.5 py-1 rounded-lg hover:bg-[#F2F1EC] font-semibold text-charcoal-800 transition-colors"
          title="Front Intake Fan"
        >
          INLET
        </button>
        <button
          onClick={() => setCameraView('turbine')}
          className="px-2.5 py-1 rounded-lg hover:bg-[#F2F1EC] font-semibold text-charcoal-800 transition-colors"
          title="Hot Turbine Core"
        >
          CORE
        </button>
      </div>

      {/* Floating Card 3: Selected Component Diagnostic Overlay (Bottom-Left) */}
      {selectedComponent && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-[#E5E4DE] px-4 py-3 rounded-xl shadow-sm pointer-events-none max-w-xs">
          <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>{selectedComponent.toUpperCase()} INSPECTION</span>
          </div>
          <p className="text-sm font-bold text-charcoal-900 mt-0.5">{getSubsystemTitle(selectedComponent)}</p>
          <div className="mt-1.5 flex items-center space-x-3 text-xs text-charcoal-600">
            <span>Wear: <strong className="text-charcoal-900 font-semibold">{subsystemsWear[selectedComponent as keyof typeof subsystemsWear] ?? 12}%</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">TBO Cleared</span>
          </div>
        </div>
      )}

      {/* Floating Card 4: Prognostic Telemetry Overlay (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md border border-[#E5E4DE] px-4 py-2.5 rounded-xl shadow-sm pointer-events-none hidden sm:flex items-center space-x-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 block">Forecast RUL</span>
          <span className="text-base font-bold text-charcoal-900 font-sans">{predictedRul} cycles</span>
        </div>
        <div className="h-7 w-px bg-[#E5E4DE]"></div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500 block">Core Exhaust EGT</span>
          <span className={`text-base font-bold font-sans ${thermalStress > 1.3 ? 'text-amber-600' : 'text-charcoal-900'}`}>
            {thermalStress > 1.3 ? '1,424 °R' : '1,404 °R'}
          </span>
        </div>
      </div>
    </div>
  );
};
