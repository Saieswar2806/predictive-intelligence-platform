import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type EngineSubsystemKey = 'fan' | 'hpc' | 'combustor' | 'hpt' | 'lpt' | 'casing' | 'exhaust';

interface TurbofanCutawayModelProps {
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
  const pulseRef = useRef<number>(0);

  // Smooth rotation for fan and high-pressure compressor core spools
  useFrame((_, delta) => {
    pulseRef.current += delta * 3.0;
    if (fanRotorRef.current) {
      fanRotorRef.current.rotation.z -= delta * fanSpeed * 3.5;
    }
    if (coreSpoolRef.current) {
      coreSpoolRef.current.rotation.z -= delta * fanSpeed * 5.8;
    }
  });

  // Dynamic wear color helper with industrial materials aesthetic
  const getSubsystemColor = (wearPct: number = 0, isSelected: boolean) => {
    if (isSelected) return '#2563EB'; // Vibrant electric blue for active selection
    if (wearPct > 65) return '#DC2626'; // Critical failure red
    if (wearPct > 35) return '#D97706'; // Industrial amber wear warning
    return '#475569'; // Standard aerospace titanium slate
  };

  // Generate 24 titanium wide-chord fan blades
  const fanBlades = useMemo(() => {
    const blades = [];
    const bladeCount = 24;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      blades.push({ angle, id: i });
    }
    return blades;
  }, []);

  // HPC stages
  const compressorStages = useMemo(() => [
    { z: -0.6, radius: 0.75, length: 0.18 },
    { z: -0.9, radius: 0.65, length: 0.22 },
    { z: -1.2, radius: 0.55, length: 0.25 },
  ], []);

  // Combustor thermal glow
  const combustorGlow = useMemo(() => {
    if (thermalStress > 1.3 || (subsystemsWear.combustor ?? 0) > 40) {
      return '#EA580C'; // Safety orange thermal distress
    }
    return '#0284C7'; // Nominal clean burn blue/cyan
  }, [thermalStress, subsystemsWear.combustor]);

  return (
    <group position={[0, 0, 0]} rotation={[0, -Math.PI / 3, 0]}>
      {/* 1. TRANSLUCENT OUTER NACELLE / CUTAWAY COWLING */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent('casing');
        }}
      >
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[1.65, 1.5, 3.8, 48, 1, true, Math.PI * 0.35, Math.PI * 1.3]}
          />
          <meshStandardMaterial
            color={selectedComponent === 'casing' ? '#3B82F6' : '#475569'}
            metalness={0.8}
            roughness={0.25}
            side={THREE.DoubleSide}
            transparent
            opacity={selectedComponent === 'casing' ? 0.8 : 0.35}
            emissive={selectedComponent === 'casing' ? '#2563EB' : '#000000'}
            emissiveIntensity={selectedComponent === 'casing' ? 0.3 : 0}
          />
        </mesh>

        {/* Structural inlet lip ring */}
        <mesh position={[0, 0, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.65, 0.08, 16, 64]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* 2. ROTATING TITANIUM FAN MODULE */}
      <group ref={fanRotorRef} position={[0, 0, 1.5]}>
        {/* Aerodynamic Spinner Nose Cone */}
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.55, 1.1, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'fan' ? '#2563EB' : '#1E293B'}
            metalness={0.85}
            roughness={0.2}
            emissive={selectedComponent === 'fan' ? '#2563EB' : '#000000'}
            emissiveIntensity={selectedComponent === 'fan' ? 0.3 : 0}
          />
        </mesh>

        {/* Central Hub Disc */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.25, 32]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* 24 Titanium Wide-Chord Swept Blades */}
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
                metalness={0.92}
                roughness={0.15}
                emissive={selectedComponent === 'fan' ? '#2563EB' : '#000000'}
                emissiveIntensity={selectedComponent === 'fan' ? 0.4 : 0}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. CORE SHAFT & LPC */}
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
            color={selectedComponent === 'fan' ? '#2563EB' : '#334155'}
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* 4. HIGH PRESSURE COMPRESSOR (HPC) BLISK STAGES */}
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
                metalness={0.88}
                roughness={0.2}
                emissive={selectedComponent === 'hpc' ? '#2563EB' : '#000000'}
                emissiveIntensity={selectedComponent === 'hpc' ? 0.4 : 0}
              />
            </mesh>
            <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[stg.radius + 0.02, 0.03, 12, 32]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.1} />
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
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.65, 0.5, 32, 1, true]} />
          <meshStandardMaterial
            color={getSubsystemColor(subsystemsWear.combustor, selectedComponent === 'combustor')}
            emissive={combustorGlow}
            emissiveIntensity={selectedComponent === 'combustor' ? 0.8 : 0.4}
            metalness={0.75}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Fuel nozzle swirl ring */}
        <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.04, 12, 24]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.15} />
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
            metalness={0.92}
            roughness={0.15}
            emissive={selectedComponent === 'hpt' ? '#2563EB' : '#000000'}
            emissiveIntensity={selectedComponent === 'hpt' ? 0.4 : 0}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.65, 0.05, 16, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'hpt' ? '#3B82F6' : ((subsystemsWear.hpt ?? 0) > 40 ? '#DC2626' : '#475569')}
            emissive={(subsystemsWear.hpt ?? 0) > 40 ? '#DC2626' : (selectedComponent === 'hpt' ? '#2563EB' : '#000000')}
            emissiveIntensity={0.35}
            metalness={0.88}
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
            metalness={0.88}
            roughness={0.2}
            emissive={selectedComponent === 'lpt' ? '#2563EB' : '#000000'}
            emissiveIntensity={selectedComponent === 'lpt' ? 0.4 : 0}
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
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.45, 0.9, 32]} />
          <meshStandardMaterial
            color={selectedComponent === 'exhaust' ? '#2563EB' : '#1E293B'}
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
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

      {/* 9. ON-MODEL SENSOR HOTSPOT PINS */}
      {/* T24 Inlet Station 2.0 */}
      <group position={[1.4, 0.5, 1.4]} onClick={(e) => { e.stopPropagation(); onSelectComponent('fan'); }}>
        <mesh>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#2563EB" emissive="#3B82F6" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* T30/P30 Compressor HPC Station 3.0 */}
      <group position={[0.7, 0.45, -1.3]} onClick={(e) => { e.stopPropagation(); onSelectComponent('hpc'); }}>
        <mesh>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#D97706" emissive="#F59E0B" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* T50 Turbine LPT Station 4.5 */}
      <group position={[0.75, 0.5, -2.5]} onClick={(e) => { e.stopPropagation(); onSelectComponent('lpt'); }}>
        <mesh>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#DC2626" emissive="#EF4444" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
};
