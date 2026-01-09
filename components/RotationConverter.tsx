import React, { useState } from 'react';
import * as THREE from 'three';
import { NumberInput, SectionTitle, MatrixInput } from './ui/InputFields';
import Visualizer from './Visualizer';
import { EulerOrder, EulerMode, AxisSystem } from '../types';
import { round, toDegrees, toRadians, getQuaternionFromEuler, getEulerFromQuaternion, convertRotationBasis } from '../utils/math';
import { Rotate3D, Cuboid, RefreshCw, Grid3X3, Zap, Globe, ArrowRight, Settings2, Info } from 'lucide-react';

export const RotationConverter: React.FC = () => {
  // MASTER STATE: Everything is derived from this quaternion
  const [quaternion, setQuaternion] = useState(new THREE.Quaternion(0, 0, 0, 1));
  
  // UI PREFERENCES - GLOBAL INPUT
  const [useDegrees, setUseDegrees] = useState(true);
  const [eulerOrder, setEulerOrder] = useState<EulerOrder>('XYZ');
  const [eulerMode, setEulerMode] = useState<EulerMode>('intrinsic');

  // UI PREFERENCES - CONVERTER OUTPUT
  // Independent controls for the Coordinate System Converter section
  const [converterEulerOrder, setConverterEulerOrder] = useState<EulerOrder>('XYZ');
  const [converterEulerMode, setConverterEulerMode] = useState<EulerMode>('intrinsic');
  
  // INPUT BUFFER STATE
  // To prevent "jumping" values due to Euler singularities/aliases (Gimbal lock),
  // we store the exact values the user typed and display those instead of the recalculated ones
  // as long as the user is actively editing the Euler section.
  const [eulerInputBuffer, setEulerInputBuffer] = useState({ x: 0, y: 0, z: 0 });
  const [lastUpdateSource, setLastUpdateSource] = useState<'euler' | 'other'>('other');
  
  // AXIS CONVERSION STATE
  const [inputAxis, setInputAxis] = useState<AxisSystem>('ros');
  const [outputAxis, setOutputAxis] = useState<AxisSystem>('world');

  // DERIVED VALUES 
  const validQuat = quaternion.clone();
  if (validQuat.lengthSq() > 0.0000001) {
    validQuat.normalize();
  }

  // Euler Calculation (Input Section)
  // 1. Calculate the canonical Euler angles from the current quaternion
  const derivedEulerRaw = getEulerFromQuaternion(validQuat, eulerOrder, eulerMode);
  const derivedEulerDeg = {
    x: round(useDegrees ? toDegrees(derivedEulerRaw.x) : derivedEulerRaw.x),
    y: round(useDegrees ? toDegrees(derivedEulerRaw.y) : derivedEulerRaw.y),
    z: round(useDegrees ? toDegrees(derivedEulerRaw.z) : derivedEulerRaw.z),
  };

  // 2. Decide what to display: The manual buffer (if user just typed it) or the canonical derived value
  const displayEuler = lastUpdateSource === 'euler' ? eulerInputBuffer : derivedEulerDeg;

  // Quaternion (Raw Display)
  const displayQuat = {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };

  // Axis Angle
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

  // Matrix
  const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(validQuat);

  // CONVERTED AXIS VALUES
  const convertedQuat = convertRotationBasis(validQuat, inputAxis, outputAxis);
  // Use independent settings for the converted euler output
  const convertedEuler = getEulerFromQuaternion(convertedQuat, converterEulerOrder, converterEulerMode);

  // HANDLERS
  const updateFromEuler = (axisName: 'x' | 'y' | 'z', val: number) => {
    // 1. Update the buffer with exactly what the user typed
    const newBuffer = { ...displayEuler, [axisName]: val };
    setEulerInputBuffer(newBuffer);
    setLastUpdateSource('euler');

    // 2. Convert to radians for calculation
    const radX = useDegrees ? toRadians(newBuffer.x) : newBuffer.x;
    const radY = useDegrees ? toRadians(newBuffer.y) : newBuffer.y;
    const radZ = useDegrees ? toRadians(newBuffer.z) : newBuffer.z;

    // 3. Update the master quaternion
    const q = getQuaternionFromEuler(radX, radY, radZ, eulerOrder, eulerMode);
    setQuaternion(q);
  };

  // When changing order/mode, we want the Physical Rotation (Quaternion) to stay the same,
  // so the Euler numbers MUST change. We switch source to 'other' to force recalculation.
  const handleEulerSettingChange = (type: 'order' | 'mode', val: string) => {
    if (type === 'order') setEulerOrder(val as EulerOrder);
    if (type === 'mode') setEulerMode(val as EulerMode);
    setLastUpdateSource('other');
  };

  const updateFromQuaternion = (comp: 'x' | 'y' | 'z' | 'w', val: number) => {
    const newQ = new THREE.Quaternion(
      comp === 'x' ? val : quaternion.x,
      comp === 'y' ? val : quaternion.y,
      comp === 'z' ? val : quaternion.z,
      comp === 'w' ? val : quaternion.w
    );
    setQuaternion(newQ);
    setLastUpdateSource('other');
  };

  const normalizeCurrentQuaternion = () => {
    if (quaternion.lengthSq() > 0) {
      const q = quaternion.clone().normalize();
      setQuaternion(q);
      setLastUpdateSource('other');
    }
  };

  const updateFromAxisAngle = (type: 'axis' | 'angle', axisComp: 'x'|'y'|'z'|null, val: number) => {
    let newAxis = axis.clone();
    let newAngle = angle; 

    if (type === 'angle') {
      newAngle = useDegrees ? toRadians(val) : val;
    } else if (axisComp) {
      if (axisComp === 'x') newAxis.setX(val);
      if (axisComp === 'y') newAxis.setY(val);
      if (axisComp === 'z') newAxis.setZ(val);
    }

    const q = new THREE.Quaternion().setFromAxisAngle(newAxis.normalize(), newAngle);
    setQuaternion(q);
    setLastUpdateSource('other');
  };

  const updateFromMatrix = (index: number, val: number) => {
    const elements = [...rotationMatrix.elements];
    elements[index] = val;
    const m = new THREE.Matrix4();
    m.fromArray(elements);
    const q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    setQuaternion(q);
    setLastUpdateSource('other');
  };

  const resetRotation = () => {
    setQuaternion(new THREE.Quaternion(0, 0, 0, 1));
    setLastUpdateSource('other');
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
                  onClick={() => { setUseDegrees(false); setLastUpdateSource('other'); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!useDegrees ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Radians
                </button>
                <button 
                  onClick={() => { setUseDegrees(true); setLastUpdateSource('other'); }}
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
            Quaternion (Input)
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
            Euler Angles (Input)
          </SectionTitle>
          
          <div className="flex flex-wrap gap-4 mb-6">
             <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sequence</label>
                <select 
                  value={eulerOrder}
                  onChange={(e) => handleEulerSettingChange('order', e.target.value)}
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
                  onChange={(e) => handleEulerSettingChange('mode', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="intrinsic">Intrinsic (Mobile)</option>
                  <option value="extrinsic">Extrinsic (Static)</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <NumberInput label={`X (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.x} onChangeValue={(v) => updateFromEuler('x', v)} />
            <NumberInput label={`Y (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.y} onChangeValue={(v) => updateFromEuler('y', v)} />
            <NumberInput label={`Z (${useDegrees ? 'deg' : 'rad'})`} value={displayEuler.z} onChangeValue={(v) => updateFromEuler('z', v)} />
          </div>

          {/* Canonical/Optimal Euler Output */}
          <div className="mt-6 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between mb-3">
                 <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    Canonical Euler Angles
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">Optimal</span>
                    <div className="group relative flex items-center">
                       <Info size={14} className="text-slate-400 cursor-help hover:text-indigo-600 transition-colors" />
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-800 text-white text-[10px] p-3 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-sans font-normal leading-relaxed">
                           <strong>Why two values?</strong><br/>
                           Euler angles are not unique (aliases). <br/>
                           <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300">
                               <li><strong>Input:</strong> Preserves your exact values (e.g., 360°, 720°).</li>
                               <li><strong>Canonical:</strong> The single mathematical standard where the middle angle is restricted to [-90°, +90°] (Gimbal lock avoidance range).</li>
                           </ul>
                       </div>
                   </div>
                 </div>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-4 mb-3">
                 <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">X</span>
                    <span className="font-mono text-sm text-slate-700">{derivedEulerDeg.x}</span>
                 </div>
                 <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Y</span>
                    <span className="font-mono text-sm text-slate-700">{derivedEulerDeg.y}</span>
                 </div>
                 <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Z</span>
                    <span className="font-mono text-sm text-slate-700">{derivedEulerDeg.z}</span>
                 </div>
             </div>
          </div>
        </div>

        {/* MATRIX INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <SectionTitle>
            <Grid3X3 size={20} className="text-indigo-500" />
            Rotation Matrix (Input)
           </SectionTitle>
           <MatrixInput matrix={rotationMatrix.elements} onChange={updateFromMatrix} />
        </div>

        {/* AXIS ANGLE INPUT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <SectionTitle>
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-500">A</div>
            Axis-Angle (Input)
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
        <div className="min-h-[400px] h-[400px] lg:h-[600px] rounded-xl overflow-hidden shadow-lg border border-slate-200">
           <Visualizer quaternion={quaternion} />
        </div>
        
        {/* AXIS CONVERSION (RIGHT COLUMN) */}
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
           <SectionTitle>
             <Globe size={20} className="text-indigo-600" />
             <span className="text-indigo-900">Coordinate System Converter</span>
           </SectionTitle>
           <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4 text-sm">
                <div className="flex-1">
                   <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Input Axis (Current)</label>
                   <select 
                      value={inputAxis} 
                      onChange={(e) => setInputAxis(e.target.value as AxisSystem)}
                      className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-indigo-900 focus:ring-indigo-500"
                   >
                      <option value="ros">ROS Camera (+Y Down, +Z Fwd)</option>
                      <option value="world">World (+Z Up, +X Fwd)</option>
                      <option value="usd">USD (+Y Up, -Z Fwd)</option>
                   </select>
                </div>
                <div className="pt-5 text-indigo-300">
                   <ArrowRight size={20} />
                </div>
                <div className="flex-1">
                   <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Output Axis (Target)</label>
                   <select 
                      value={outputAxis} 
                      onChange={(e) => setOutputAxis(e.target.value as AxisSystem)}
                      className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-indigo-900 focus:ring-indigo-500"
                   >
                      <option value="ros">ROS Camera (+Y Down, +Z Fwd)</option>
                      <option value="world">World (+Z Up, +X Fwd)</option>
                      <option value="usd">USD (+Y Up, -Z Fwd)</option>
                   </select>
                </div>
             </div>

             <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 flex flex-col gap-3">
                {/* Converted Quaternion Row */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Converted Quaternion</div>
                  <div className="font-mono text-xs text-indigo-800 break-all bg-white px-3 py-2 rounded border border-indigo-100 shadow-sm">
                    [{round(convertedQuat.x)}, {round(convertedQuat.y)}, {round(convertedQuat.z)}, {round(convertedQuat.w)}]
                  </div>
                </div>

                {/* Converted Euler Row with Controls */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                     <div className="text-[10px] font-bold text-slate-400 uppercase">Converted Euler</div>
                     <div className="flex gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                         <select 
                            value={converterEulerMode}
                            onChange={(e) => setConverterEulerMode(e.target.value as EulerMode)}
                            className="text-[9px] bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-indigo-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                         >
                            <option value="intrinsic">Intrinsic</option>
                            <option value="extrinsic">Extrinsic</option>
                         </select>
                         <select 
                            value={converterEulerOrder}
                            onChange={(e) => setConverterEulerOrder(e.target.value as EulerOrder)}
                            className="text-[9px] bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-indigo-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
                         >
                            {['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'].map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                         </select>
                     </div>
                  </div>
                  <div className="font-mono text-xs text-indigo-800 bg-white px-3 py-2 rounded border border-indigo-100 shadow-sm">
                    x: {round(useDegrees ? toDegrees(convertedEuler.x) : convertedEuler.x)}, 
                    y: {round(useDegrees ? toDegrees(convertedEuler.y) : convertedEuler.y)}, 
                    z: {round(useDegrees ? toDegrees(convertedEuler.z) : convertedEuler.z)}
                  </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};