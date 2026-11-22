import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type EngineSubsystemKey = 'fan' | 'hpc' | 'combustor' | 'hpt' | 'lpt' | 'casing' | 'exhaust';

interface TurbofanCutawayModelProps {
  selectedComponent: EngineSubsystemKey | null;
  onSelectComponent: (comp: EngineSubsystemKey) => void;
  fanSpeed?: number; // 0 = stopped, 1 = nominal, 2 = high speed
  overallHealthIndex?: number; // 0.0 to 1.0
  thermalStress?: number;
  subsystemsWear?: {
    fan?: number;
    hpc?: number;
    combustor?: number;
    hpt?: number;
    lpt?: number;
  };
}

export const TurbofanCutawayModel: React.FC<TurbofanCutawayModelProps> = ({
  selectedComponent,
  onSelectComponent,
  fanSpeed = 1.0,
  overallHealthIndex = 0.95,
  thermalStress = 1.0,
  subsystemsWear = { fan: 5, hpc: 8, combustor: 4, hpt: 10, lpt: 6 }
}) => {
  const fanRotorRef = useRef<THREE.Group>(null);
  const coreSpoolRef = useRef<THREE.Group>(null);

  // Rotate fan and compressor spools smoothly
  useFrame((_, delta) => {
    if (fanRotorRef.current) {
      fanRotorRef.current.rotation.z -= delta * fanSpeed * 4.0;
    }
    if (coreSpoolRef.current) {
      coreSpoolRef.current.rotation.z -= delta * fanSpeed * 6.5;
    }
  });

  // Dynamic wear color helper
  const getSubsystemColor = (wearPct: number = 0, isSelected: boolean) => {
    if (isSelected) return '#38bdf8'; // bright cyan highlight
    if (wearPct > 65) return '#f43f5e'; // critical rose
    if (wearPct > 35) return '#fbbf24'; // warning amber
    return '#64748b'; // standard aerospace slate
  };

  // Generate fan blades procedurally (24 titanium swept blades)
  const fanBlades = useMemo(() => {
    const blades = [];
    const bladeCount = 24;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      blades.push({ angle, id: i });
    }
    return blades;
  }, []);

  // Generate compressor stages
  const compressorStages = useMemo(() => [
    { z: -0.6, radius: 0.75, length: 0.18, stages: 3 },
    { z: -0.9, radius: 0.65, length: 0.22, stages: 3 },
    { z: -1.2, radius: 0.55, length: 0.25, stages: 3 },
  ], []);

  // Combustor thermal emission color based on health/stress
  const combustorGlow = useMemo(() => {
    if (thermalStress > 1.3 || (subsystemsWear.combustor ?? 0) > 50) {
      return '#f97316'; // orange-hot distress
    }
    return '#38bdf8'; // nominal clean burn
  }, [thermalStress, subsystemsWear.combustor]);

  return (
    <group position={[0, 0, 0]} rotation={[0, -Math.PI / 3, 0]}>
      {/* 1. TRANSLUCENT OUTER COWLING / CUTAWAY DUCT */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('casing');
        }}
      >
        {/* Cutaway outer nacelle cylinder (open by 140 degrees to expose core) */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[1.65, 1.5, 3.8, 48, 1, true, Math.PI * 0.35, Math.PI * 1.3]}
          />
          <meshStandardMaterial
            color={selectedComponent === 'casing' ? '#38bdf8' : '#e2e8f0'}
            metalness={0.7}
            roughness={0.25}
            side={THREE.DoubleSide}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Structural inlet ring / lip */}
        <mesh position={[0, 0, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.65, 0.08, 16, 64]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* 2. ROTATING FAN MODULE */}
      <group ref={fanRotorRef} position={[0, 0, 1.5]}>
        {/* Aerodynamic Spinner Nose Cone */}
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.55, 1.1, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'fan' ? '#38bdf8' : '#0f172a'}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Central Rotor Disc */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.25, 32]} />
          <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* 24 Titanium Wide-Chord Swept Fan Blades */}
        {fanBlades.map((b) => (
          <group
            key={b.id}
            rotation={[0, 0, b.angle]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectComponent('fan');
            }}
          >
            <mesh position={[0, 1.05, 0]} rotation={[0.4, 0.1, 0]}>
              <boxGeometry args={[0.16, 1.0, 0.03]} />
              <meshStandardMaterial
                color={getSubsystemColor(subsystemsWear.fan, selectedComponent === 'fan')}
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. CORE SHAFT & LOW PRESSURE COMPRESSOR (LPC) */}
      <group
        position={[0, 0, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('fan');
        }}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.85, 0.6, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'fan' ? '#38bdf8' : '#334155'}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* 4. HIGH PRESSURE COMPRESSOR (HPC) */}
      <group
        ref={coreSpoolRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('hpc');
        }}
      >
        {compressorStages.map((stg, idx) => (
          <group key={idx} position={[0, 0, stg.z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[stg.radius, stg.radius * 0.9, stg.length, 32]} />
              <meshStandardMaterial
                color={getSubsystemColor(subsystemsWear.hpc, selectedComponent === 'hpc')}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
            {/* Blisk rotor rings */}
            <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[stg.radius + 0.02, 0.03, 12, 32]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. ANNULAR COMBUSTOR SECTION */}
      <group
        position={[0, 0, -1.6]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('combustor');
        }}
      >
        {/* Combustor Outer Liner */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.65, 0.5, 32, 1, true]} />
          <meshStandardMaterial
            color={getSubsystemColor(subsystemsWear.combustor, selectedComponent === 'combustor')}
            emissive={combustorGlow}
            emissiveIntensity={0.35}
            metalness={0.6}
            roughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Fuel nozzle ring */}
        <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.04, 12, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 6. HIGH PRESSURE TURBINE (HPT) */}
      <group
        position={[0, 0, -2.0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('hpt');
        }}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.64, 0.22, 32]} />
          <meshStandardMaterial
            color={getSubsystemColor(subsystemsWear.hpt, selectedComponent === 'hpt')}
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>
        {/* HPT Stage 1 blades ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.65, 0.05, 16, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'hpt' ? '#38bdf8' : '#e11d48'}
            emissive={subsystemsWear.hpt && subsystemsWear.hpt > 40 ? '#f43f5e' : '#000000'}
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 7. LOW PRESSURE TURBINE (LPT) */}
      <group
        position={[0, 0, -2.35]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('lpt');
        }}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.66, 0.75, 0.45, 32]} />
          <meshStandardMaterial
            color={getSubsystemColor(subsystemsWear.lpt, selectedComponent === 'lpt')}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* 8. EXHAUST CONE & NOZZLE */}
      <group
        position={[0, 0, -2.85]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('exhaust');
        }}
      >
        {/* Exhaust Tail Plug Cone */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.45, 0.9, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'exhaust' ? '#38bdf8' : '#1e293b'}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        {/* Outer exhaust mixer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.85, 0.95, 0.5, 32, 1, true]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.85}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 9. SENSOR MEASUREMENT PIN LOCATIONS */}
      {/* Sensor T24 (Fan Inlet) */}
      <mesh position={[1.4, 0.5, 1.4]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
      </mesh>
      {/* Sensor T30/P30 (HPC Outlet) */}
      <mesh position={[0.7, 0.45, -1.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
      {/* Sensor T50 (LPT Outlet) */}
      <mesh position={[0.75, 0.5, -2.5]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};
