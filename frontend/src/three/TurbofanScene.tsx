import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { TurbofanCutawayModel, EngineSubsystemKey } from './TurbofanCutawayModel';

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
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg">
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[3.8, 2.2, 4.2]} fov={42} />

        {/* Studio aerospace technical lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-5, 4, -5]} intensity={0.6} color="#93c5fd" />
        <pointLight position={[0, 0, 0]} intensity={1.2} color="#38bdf8" distance={4} />

        <Suspense fallback={null}>
          <TurbofanCutawayModel
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
            fanSpeed={fanSpeed}
            overallHealthIndex={overallHealthIndex}
            thermalStress={thermalStress}
            subsystemsWear={subsystemsWear}
          />
        </Suspense>

        {interactive && (
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2.5}
            maxDistance={9.0}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 6}
          />
        )}
      </Canvas>

      {/* Watermark / Engineering CAD Legend */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-2.5 py-1.5 rounded text-[11px] font-mono text-slate-300 flex items-center space-x-2 pointer-events-none select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>AEROTWIN-3D // NASA C-MAPSS FD001</span>
      </div>

      <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-2.5 py-1.5 rounded text-[10px] font-mono text-slate-400 pointer-events-none select-none">
        DRAG TO ROTATE • SCROLL TO ZOOM • CLICK COMPONENT
      </div>
    </div>
  );
};
