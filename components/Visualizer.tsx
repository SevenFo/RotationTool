// @ts-nocheck
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Fix for missing R3F intrinsic types in this environment
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      directionalLight: any;
      group: any;
      mesh: any;
      meshPhysicalMaterial: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      arrowHelper: any;
    }
  }
}

interface VisualizerProps {
  quaternion: THREE.Quaternion;
}

const SceneContent: React.FC<{ quaternion: THREE.Quaternion }> = ({ quaternion }) => {
  // Ensure we visualize a valid rotation even if input is raw/unnormalized
  const vizQuat = quaternion.clone();
  if (vizQuat.lengthSq() > 0.000001) {
    vizQuat.normalize();
  }

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      {/* The rotating object */}
      <group quaternion={vizQuat}>
        {/* Main Body - Rounded and Sleek */}
        <RoundedBox args={[2, 0.5, 1]} radius={0.1} smoothness={4}>
          <meshPhysicalMaterial 
            color="#6366f1" 
            roughness={0.2} 
            metalness={0.1} 
            clearcoat={0.5}
            clearcoatRoughness={0.1}
          />
        </RoundedBox>
        
        {/* Asymmetric features */}
        <RoundedBox args={[0.4, 0.4, 0.4]} radius={0.05} position={[0.6, 0.35, 0]}>
           <meshPhysicalMaterial color="#a5b4fc" />
        </RoundedBox>
        
        <mesh position={[-0.7, 0, 0.55]}>
           <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
           <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} />
        </mesh>

        {/* Local Axes Indicators */}
        <group position={[0, 0, 0]}>
          <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0xff5555, 0.2, 0.1]} />
          <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x55ff55, 0.2, 0.1]} />
          <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1.5, 0x5555ff, 0.2, 0.1]} />
        </group>
      </group>

      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
      <Grid infiniteGrid fadeDistance={25} sectionColor="#94a3b8" cellColor="#cbd5e1" position={[0, -2.01, 0]} />
      
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport 
          axisColors={['#ff5555', '#55ff55', '#5555ff']} 
          labelColor="black" 
          hideNegativeAxes
        />
      </GizmoHelper>
    </>
  );
};

const Visualizer: React.FC<VisualizerProps> = ({ quaternion }) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">
       <div className="absolute top-4 left-4 z-10 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 pointer-events-none border border-white/50 shadow-sm">
          Visualization Preview
       </div>
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
        <OrbitControls makeDefault minDistance={2} maxDistance={20} />
        <SceneContent quaternion={quaternion} />
      </Canvas>
    </div>
  );
};

export default Visualizer;