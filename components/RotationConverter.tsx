import React, { useState } from 'react';
import * as THREE from 'three';
import { NumberInput, SectionTitle, MatrixInput } from './ui/InputFields';
import Visualizer from './Visualizer';
import { EulerOrder, EulerMode } from '../types';
import { round, toDegrees, toRadians, getQuaternionFromEuler, getEulerFromQuaternion } from '../utils/math';
import { Rotate3D, Cuboid, RefreshCw, Grid3X3, Zap } from 'lucide-react';

export const RotationConverter: React.FC = () => {
  // MASTER STATE: Everything is derived from this quaternion
  const [quaternion, setQuaternion] = useState(new THREE.Quaternion(0, 0, 0, 1));
  
  // UI PREFERENCES
  const [useDegrees, setUseDegrees] = useState(true);
  const [eulerOrder, setEulerOrder] = useState<EulerOrder>('XYZ');
  const [eulerMode, setEulerMode] = useState<EulerMode>('intrinsic');

  // DERIVED VALUES 
  // We recalculate these on every render based on the current quaternion state.
  // Note: If the quaternion is not normalized (user typing), the derived values might be weird,
  // but usually we want to see what the current math implies. 
  // For Euler/AxisAngle/Matrix, Three.js usually expects normalized quats.
  // We will use a normalized clone for deriving other values to avoid NaN/Infinity cascading,
  // BUT we keep the raw 'quaternion' state for the input fields so user's typing isn't overwritten.
  
  const validQuat = quaternion.clone();
  if (validQuat.lengthSq() > 0.0000001) {
    validQuat.normalize();
  }

  // Euler
  const eulerVals = getEulerFromQuaternion(validQuat, eulerOrder, eulerMode);
  const displayEuler = {
    x: round(useDegrees ? toDegrees(eulerVals.x) : eulerVals.x),
    y: round(useDegrees ? toDegrees(eulerVals.y) : eulerVals.y),
    z: round(useDegrees ? toDegrees(eulerVals.z) : eulerVals.z),
  };

  // Quaternion (Raw Display)
  // We display the ACTUAL state, not the normalized one, to allow editing.
  const displayQuat = {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };

  // Axis Angle (Derived from valid)
  let axis = new THREE.Vector3(1, 0, 0);
  let angle = 0;
  if (validQuat.w < 0.99999999) {
    angle = 2 * Math.acos(validQuat.w);
    const s = Math.sqrt(1 - validQuat.w * validQuat.w);
    if (s > 0.0001) {
      axis.set(validQuat.x / s, validQuat.y / s, validQuat.z / s);
    }
  }
  const displayAxis = {
    x: round(axis.x),
    y: round(axis.y),
    z: round(axis.z),
    angle: round(useDegrees ? toDegrees(angle) : angle),
  };

  // Matrix (Derived from valid)
  const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(validQuat);

  // HANDLERS
  
  const updateFromEuler = (axisName: 'x' | 'y' | 'z', val: number) => {
    const rad = useDegrees ? toRadians(val) : val;
    const currentRad = eulerVals; // this gets derived from normalized state
    const newRad = { ...currentRad, [axisName]: rad };
    
    // Euler updates always result in a valid rotation, so we get a normalized quat back
    const q = getQuaternionFromEuler(newRad.x, newRad.y, newRad.z, eulerOrder, eulerMode);
    setQuaternion(q);
  };

  const updateFromQuaternion = (comp: 'x' | 'y' | 'z' | 'w', val: number) => {
    // Allows raw input without normalization
    const newQ = new THREE.Quaternion(
      comp === 'x' ? val : quaternion.x,
      comp === 'y' ? val : quaternion.y,
      comp === 'z' ? val : quaternion.z,
      comp === 'w' ? val : quaternion.w
    );
    setQuaternion(newQ);
  };

  const normalizeCurrentQuaternion = () => {
    if (quaternion.lengthSq() > 0) {
      const q = quaternion.clone().normalize();
      setQuaternion(q);
    }
  };

  const updateFromAxisAngle = (type: 'axis' | 'angle', axisComp: 'x'|'y'|'z'|null, val: number) => {
    let newAxis = axis.clone();
    let newAngle = angle; // radians

    if (type === 'angle') {
      newAngle = useDegrees ? toRadians(val) : val;
    } else if (axisComp) {
      if (axisComp === 'x') newAxis.setX(val);
      if (axisComp === 'y') newAxis.setY(val);
      if (axisComp === 'z') newAxis.setZ(val);
    }

    const q = new THREE.Quaternion().setFromAxisAngle(newAxis.normalize(), newAngle);
    setQuaternion(q);
  };

  const updateFromMatrix = (index: number, val: number) => {
    // Create a mutable array from current matrix
    const elements = [...rotationMatrix.elements];
    elements[index] = val;
    
    const m = new THREE.Matrix4();
    m.fromArray(elements);
    
    // Convert to Quaternion
    // Note: If matrix is not pure rotation, this estimates the rotation component
    const q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    setQuaternion(q);
  };

  const resetRotation = () => {
    setQuaternion(new THREE.Quaternion(0, 0, 0, 1));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* LEFT COLUMN: CONTROLS */}
      <div className="lg:col-span-7 space-y-6 pr-2">
        
        {/* GLOBAL SETTINGS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between sticky top-0 z-20">
           <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setUseDegrees(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!useDegrees ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Radians
                </button>
                <button 
                  onClick={() => setUseDegrees(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${useDegrees ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Degrees
                </button>
              </div>
           </div>
           <button 
            onClick={resetRotation}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
           >
             <RefreshCw size={14} /> Reset
           </button>
        </div>

        {/* QUATERNION INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <SectionTitle 
             action={
               <button 
                 onClick={normalizeCurrentQuaternion}
                 className="flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
               >
                 <Zap size={12} fill="currentColor" /> Normalize
               </button>
             }
          >
            <Cuboid size={20} className="text-indigo-500" />
            Quaternion (xyzw)
          </SectionTitle>
          <div className="grid grid-cols-4 gap-4">
            <NumberInput label="x" value={displayQuat.x} onChangeValue={(v) => updateFromQuaternion('x', v)} />
            <NumberInput label="y" value={displayQuat.y} onChangeValue={(v) => updateFromQuaternion('y', v)} />
            <NumberInput label="z" value={displayQuat.z} onChangeValue={(v) => updateFromQuaternion('z', v)} />
            <NumberInput label="w" value={displayQuat.w} onChangeValue={(v) => updateFromQuaternion('w', v)} />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-slate-400">
               Norm: <span className={Math.abs(quaternion.length() - 1) > 0.001 ? "text-amber-500 font-mono" : "text-emerald-500 font-mono"}>{quaternion.length().toFixed(6)}</span>
            </div>
            {Math.abs(quaternion.length() - 1) > 0.001 && (
               <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                 Non-unit quaternion. Rotations may behave like scaling.
               </div>
            )}
          </div>
        </div>

        {/* EULER INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <SectionTitle>
            <Rotate3D size={20} className="text-indigo-500" />
            Euler Angles
          </SectionTitle>
          
          <div className="flex flex-wrap gap-4 mb-6">
             <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sequence</label>
                <select 
                  value={eulerOrder}
                  onChange={(e) => setEulerOrder(e.target.value as EulerOrder)}
                  className="bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
             </div>
             <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Frame Type</label>
                <select 
                  value={eulerMode}
                  onChange={(e) => setEulerMode(e.target.value as EulerMode)}
                  className="bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="intrinsic">Intrinsic (Mobile - scipy lower)</option>
                  <option value="extrinsic">Extrinsic (Static - scipy Upper)</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <NumberInput label={`X (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.x} onChangeValue={(v) => updateFromEuler('x', v)} />
            <NumberInput label={`Y (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.y} onChangeValue={(v) => updateFromEuler('y', v)} />
            <NumberInput label={`Z (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.z} onChangeValue={(v) => updateFromEuler('z', v)} />
          </div>
        </div>

        {/* MATRIX INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <SectionTitle>
            <Grid3X3 size={20} className="text-indigo-500" />
            Rotation Matrix (3x3)
           </SectionTitle>
           <MatrixInput matrix={rotationMatrix.elements} onChange={updateFromMatrix} />
        </div>

        {/* AXIS ANGLE INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <SectionTitle>
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-500">A</div>
            Axis-Angle
          </SectionTitle>
          <div className="grid grid-cols-4 gap-4">
            <NumberInput label="Axis X" value={displayAxis.x} onChangeValue={(v) => updateFromAxisAngle('axis', 'x', v)} />
            <NumberInput label="Axis Y" value={displayAxis.y} onChangeValue={(v) => updateFromAxisAngle('axis', 'y', v)} />
            <NumberInput label="Axis Z" value={displayAxis.z} onChangeValue={(v) => updateFromAxisAngle('axis', 'z', v)} />
            <NumberInput label={`Angle (${useDegrees ? 'deg' : 'rad'})`} value={displayAxis.angle} onChangeValue={(v) => updateFromAxisAngle('angle', null, v)} />
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: VISUALIZATION */}
      <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6 self-start">
        <div className="min-h-[400px] h-[50vh] lg:h-[600px] rounded-xl overflow-hidden shadow-lg border border-slate-200">
           <Visualizer quaternion={quaternion} />
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
           The visualizer automatically normalizes the input quaternion for rendering. 
           Your input values are preserved in the fields.
        </div>
      </div>
    </div>
  );
};
