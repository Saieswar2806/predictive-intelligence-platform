import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TurbofanCutawayModel, EngineSubsystemKey } from './TurbofanCutawayModel';
import { Eye, RotateCcw, Crosshair } from 'lucide-react';

interface TurbofanSceneProps {
  selectedComponent: EngineSubsystemKey | null;
  onSelectComponent: (comp: EngineSubsystemKey) => void;
  fanSpeed?: number;
  overallHealthIndex?: number;
  thermalStress?: number;
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
  subsystemsWear,
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

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200/90 rounded-xl border border-slate-300 shadow-sm">
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[3.8, 2.2, 4.2]} fov={40} />

        {/* Industrial aerospace clean studio lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 9, 5]} intensity={1.5} castShadow color="#ffffff" />
        <directionalLight position={[-6, 4, -4]} intensity={0.8} color="#93c5fd" />
        <directionalLight position={[0, -4, 0]} intensity={0.4} color="#94a3b8" />
        <pointLight position={[0, 0.2, -1.5]} intensity={1.6} color={thermalStress > 1.3 ? '#f97316' : '#0284c7'} distance={4} />

        <Suspense fallback={null}>
          <TurbofanCutawayModel
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
            fanSpeed={fanSpeed}
            overallHealthIndex={overallHealthIndex}
            thermalStress={thermalStress}
            subsystemsWear={subsystemsWear}
          />

          {/* Technical circular ground reflection ring */}
          <mesh position={[0, -1.8, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.8, 4.2, 64]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.25} roughness={0.7} />
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

      {/* Camera View Switcher Buttons */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-white/90 backdrop-blur-md border border-slate-300 p-1.5 rounded-lg text-xs font-mono text-slate-700 shadow-xs z-10">
        <span className="text-slate-500 px-1 font-semibold hidden sm:inline">VIEW:</span>
        <button
          onClick={() => setCameraView('iso')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          onClick={() => setCameraView('side')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          title="Side Profile"
        >
          SIDE
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          title="Front Intake Fan"
        >
          INLET
        </button>
        <button
          onClick={() => setCameraView('turbine')}
          className="px-2.5 py-1 rounded hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          title="Turbine Hot Section"
        >
          CORE
        </button>
      </div>

      {/* Engineering CAD Legend */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 flex items-center space-x-2 pointer-events-none select-none shadow-xs">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        <span className="font-semibold text-slate-800">AEROTWIN-3D // C-MAPSS HIGH-BYPASS DUAL-SPOOL</span>
      </div>

      {/* Selected Component Indicator Overlay */}
      {selectedComponent && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-mono text-slate-800 pointer-events-none select-none shadow-sm">
          <div className="flex items-center space-x-2 text-blue-700 font-bold uppercase">
            <Crosshair className="w-4 h-4 text-blue-600" />
            <span>ACTIVE FOCUS: {selectedComponent.toUpperCase()}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Click component directly or select subsystem tab</p>
        </div>
      )}

      {/* Subtle Hint */}
      <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-600 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-300 pointer-events-none select-none shadow-xs">
        Rotate: Left-Click • Pan: Right-Click • Zoom: Scroll
      </div>
    </div>
  );
};
