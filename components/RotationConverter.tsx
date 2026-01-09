import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { NumberInput, SectionTitle, MatrixInput } from './ui/InputFields';
import Visualizer from './Visualizer';
import { EulerOrder, EulerMode, AxisSystem } from '../types';
import { round, toDegrees, toRadians, getQuaternionFromEuler, getEulerFromQuaternion, convertRotationBasis, parseCustomAxis } from '../utils/math';
import { Rotate3D, Cuboid, RefreshCw, Grid3X3, Zap, Globe, ArrowRight, Settings2, Info, Code, Check, Copy, AlertCircle, HelpCircle, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

// --- HELPER COMPONENTS ---

const CodeBlock = ({ code, label, collapsible = true }: { code: string; label?: string; collapsible?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden shadow-md border border-slate-800 flex flex-col transition-all duration-200">
      <div 
        className={`flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0 ${collapsible ? 'cursor-pointer hover:bg-slate-900' : ''}`}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium select-none">
          {collapsible && (
            isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
          )}
          <Terminal size={14} />
          <span>{label || 'Python / Scipy'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors z-10"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {!isCollapsed && (
        <div className="relative">
          <pre className="p-3 overflow-x-auto text-[10px] leading-relaxed font-mono text-slate-300 custom-scrollbar max-h-64">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

// --- INPUT SNIPPET GENERATOR ---

const InputScipySnippet = ({ 
  euler, quaternion, matrix, axisAngle, eulerSettings, degrees 
}: { 
  euler: { x: number, y: number, z: number },
  quaternion: { x: number, y: number, z: number, w: number },
  matrix: number[],
  axisAngle: { x: number, y: number, z: number, angle: number },
  eulerSettings: { order: EulerOrder, mode: EulerMode },
  degrees: boolean
}) => {
  const [activeTab, setActiveTab] = useState<'euler'|'quat'|'matrix'|'rotvec'>('euler');

  const generateCode = () => {
    const header = `from scipy.spatial.transform import Rotation as R
import numpy as np

# --- 1. Define Rotation Object 'r' ---`;

    let defCode = '';
    const footer = `
# --- 2. Convert to other formats ---
# quat = r.as_quat()        # [x, y, z, w]
# euler = r.as_euler('xyz', degrees=True)
# matrix = r.as_matrix()
# rotvec = r.as_rotvec()    # axis * angle`;

    switch (activeTab) {
      case 'euler': {
        const seq = eulerSettings.mode === 'intrinsic' ? eulerSettings.order : eulerSettings.order.toLowerCase();
        const vals = `[${euler.x}, ${euler.y}, ${euler.z}]`;
        defCode = `
# From Euler Angles (${eulerSettings.mode}, ${eulerSettings.order})
r = R.from_euler('${seq}', ${vals}, degrees=${degrees ? 'True' : 'False'})`;
        break;
      }
      case 'quat': {
        // Scipy is (x, y, z, w) scalar-last
        const qStr = `[${quaternion.x.toFixed(6)}, ${quaternion.y.toFixed(6)}, ${quaternion.z.toFixed(6)}, ${quaternion.w.toFixed(6)}]`;
        defCode = `
# From Quaternion [x, y, z, w]
r = R.from_quat(${qStr})`;
        break;
      }
      case 'matrix': {
        // Format matrix string
        const m = matrix;
        const rows = [
          `[${m[0].toFixed(4)}, ${m[4].toFixed(4)}, ${m[8].toFixed(4)}]`,
          `[${m[1].toFixed(4)}, ${m[5].toFixed(4)}, ${m[9].toFixed(4)}]`,
          `[${m[2].toFixed(4)}, ${m[6].toFixed(4)}, ${m[10].toFixed(4)}]`
        ];
        defCode = `
# From Rotation Matrix (3x3)
m = np.array([
    ${rows[0]},
    ${rows[1]},
    ${rows[2]}
])
r = R.from_matrix(m)`;
        break;
      }
      case 'rotvec': {
        // Axis * Angle (radians)
        // If angle is in degrees, convert for calculation
        const angRad = degrees ? (axisAngle.angle * Math.PI / 180) : axisAngle.angle;
        // The vector magnitude is the angle
        const vx = axisAngle.x * angRad;
        const vy = axisAngle.y * angRad;
        const vz = axisAngle.z * angRad;
        
        defCode = `
# From Rotation Vector (Axis * Angle in radians)
# Axis: [${axisAngle.x}, ${axisAngle.y}, ${axisAngle.z}], Angle: ${axisAngle.angle}${degrees ? '°' : 'rad'}
r = R.from_rotvec([${vx.toFixed(4)}, ${vy.toFixed(4)}, ${vz.toFixed(4)}])`;
        break;
      }
    }

    return header + defCode + footer;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {(['euler', 'quat', 'matrix', 'rotvec'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-t-md transition-colors ${
              activeTab === tab 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'rotvec' ? 'Axis-Angle' : tab}
          </button>
        ))}
      </div>
      <CodeBlock code={generateCode()} label="Input Definition Snippet" />
    </div>
  );
};

// --- COORDINATE CONVERSION SNIPPET GENERATOR ---

const ConversionScipySnippet = ({ 
  inputSystem, 
  outputSystem 
}: { 
  inputSystem: AxisSystem, 
  outputSystem: AxisSystem 
}) => {
  
  // Helper to get basis matrix numbers
  const getBasisMatrix = (sys: AxisSystem): number[] | null => {
    if (sys === 'usd') return [1,0,0, 0,1,0, 0,0,1]; // Identity
    if (sys === 'ros') return [1,0,0, 0,-1,0, 0,0,-1]; // U_R
    if (sys === 'world') return [0,0,-1, -1,0,0, 0,1,0]; // W_U
    
    // Custom
    if (typeof sys === 'string') {
      const res = parseCustomAxis(sys);
      if (res.valid && res.matrix) {
        const e = res.matrix.elements;
        // Matrix4 is 4x4 col-major. We want 3x3 row-major for printing.
        // e: 0,1,2,3 (col0), 4,5,6,7 (col1)...
        return [
          e[0], e[4], e[8],
          e[1], e[5], e[9],
          e[2], e[6], e[10]
        ];
      }
    }
    return null; // Fallback
  };

  const getSystemInfo = (sys: AxisSystem, defaultSlug: string) => {
    if (sys === 'usd') return { name: 'USD', slug: 'usd' };
    if (sys === 'ros') return { name: 'ROS', slug: 'ros' };
    if (sys === 'world') return { name: 'World', slug: 'world' };
    if (typeof sys === 'string' && sys.length === 3) {
      return { name: `Custom(${sys})`, slug: sys.toLowerCase() };
    }
    return { name: 'Input', slug: defaultSlug };
  };

  const fmtMat = (m: number[]) => {
    return `np.array([
    [${m[0]}, ${m[1]}, ${m[2]}],
    [${m[3]}, ${m[4]}, ${m[5]}],
    [${m[6]}, ${m[7]}, ${m[8]}]
])`;
  };

  const generateCode = () => {
    const matIn = getBasisMatrix(inputSystem);
    const matOut = getBasisMatrix(outputSystem);

    if (!matIn || !matOut) return "# Invalid Axis Configuration";

    const inSys = getSystemInfo(inputSystem, 'in');
    const outSys = getSystemInfo(outputSystem, 'out');

    // Dynamically naming variables
    const mIn = `m_${inSys.slug}_usd`;
    const rIn = `r_${inSys.slug}_usd`;
    const mOut = `m_${outSys.slug}_usd`;
    const rOut = `r_${outSys.slug}_usd`;

    return `from scipy.spatial.transform import Rotation as R
import numpy as np

# Assuming 'r' is your input rotation (from previous step)

# --- Coordinate System Transformation ---
# Strategy: R_final = R_input * (R_${inSys.slug}_to_usd * R_${outSys.slug}_to_usd.inv())

# 1. Define Basis: ${inSys.name} -> Reference (USD)
${mIn} = ${fmtMat(matIn)}
${rIn} = R.from_matrix(${mIn})

# 2. Define Basis: ${outSys.name} -> Reference (USD)
${mOut} = ${fmtMat(matOut)}
${rOut} = R.from_matrix(${mOut})

# 3. Compute Basis Change Transform
# We want T s.t. Basis_Out = Basis_In * T
# T = ${rIn} * ${rOut}.inv()
t_basis = ${rIn} * ${rOut}.inv()

# 4. Apply Transform (Intrinsic / Body-Fixed multiply)
r_final = r * t_basis

print(f"Converted Quat: {r_final.as_quat()}")`;
  };

  return <CodeBlock code={generateCode()} label="Coordinate Conversion Snippet" />;
};


// --- MAIN COMPONENT ---

const AxisSelector = ({ 
  mode, setMode, preset, setPreset, customStr, setCustomStr, validation 
}: { 
  mode: 'preset'|'custom', 
  setMode: (m:'preset'|'custom')=>void,
  preset: AxisSystem,
  setPreset: (v:AxisSystem)=>void,
  customStr: string,
  setCustomStr: (s:string)=>void,
  validation: { valid: boolean; error?: string }
}) => {
  return (
    <div className="space-y-2">
      <select 
        value={mode === 'preset' ? (preset as string) : 'custom'} 
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setMode('custom');
          } else {
            setMode('preset');
            setPreset(e.target.value as AxisSystem);
          }
        }}
        className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-indigo-900 focus:ring-indigo-500 text-sm"
      >
         <option value="ros">ROS Camera (+Y Down, +Z Fwd)</option>
         <option value="world">World (+Z Up, +X Fwd)</option>
         <option value="usd">USD (+Y Up, -Z Fwd)</option>
         <option value="custom">Custom Format...</option>
      </select>
      
      {mode === 'custom' && (
        <div className="relative">
           <input 
             type="text" 
             maxLength={3}
             value={customStr}
             onChange={(e) => setCustomStr(e.target.value.toUpperCase())}
             placeholder="e.g. RFU"
             className={`w-full border rounded px-2 py-1.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 ${validation.valid ? 'border-indigo-200 focus:ring-indigo-500' : 'border-red-300 focus:ring-red-500 bg-red-50'}`}
           />
           <div className="absolute right-2 top-1/2 -translate-y-1/2">
             {validation.valid ? (
               <Check size={14} className="text-emerald-500" />
             ) : (
               <div className="group relative">
                  <AlertCircle size={14} className="text-red-500 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 w-32 text-[10px] bg-red-600 text-white p-2 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal z-50">
                    {validation.error}
                  </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export const RotationConverter: React.FC = () => {
  // MASTER STATE: Everything is derived from this quaternion
  const [quaternion, setQuaternion] = useState(new THREE.Quaternion(0, 0, 0, 1));
  
  // UI PREFERENCES - GLOBAL INPUT
  const [useDegrees, setUseDegrees] = useState(true);
  const [eulerOrder, setEulerOrder] = useState<EulerOrder>('ZYX');
  const [eulerMode, setEulerMode] = useState<EulerMode>('extrinsic');

  // UI PREFERENCES - CONVERTER OUTPUT
  const [converterEulerOrder, setConverterEulerOrder] = useState<EulerOrder>('XYZ');
  const [converterEulerMode, setConverterEulerMode] = useState<EulerMode>('intrinsic');
  
  // INPUT BUFFER STATE
  const [eulerInputBuffer, setEulerInputBuffer] = useState({ x: 0, y: 0, z: 0 });
  const [lastUpdateSource, setLastUpdateSource] = useState<'euler' | 'other'>('other');
  
  // AXIS CONVERSION STATE
  const [inputAxisMode, setInputAxisMode] = useState<'preset' | 'custom'>('preset');
  const [inputPreset, setInputPreset] = useState<AxisSystem>('ros');
  const [inputCustomStr, setInputCustomStr] = useState("RFU");
  
  const [outputAxisMode, setOutputAxisMode] = useState<'preset' | 'custom'>('preset');
  const [outputPreset, setOutputPreset] = useState<AxisSystem>('world');
  const [outputCustomStr, setOutputCustomStr] = useState("RFU");

  // Validate Custom Inputs
  const inputCustomValidation = parseCustomAxis(inputCustomStr);
  const outputCustomValidation = parseCustomAxis(outputCustomStr);

  const finalInputAxis = inputAxisMode === 'preset' ? inputPreset : (inputCustomValidation.valid ? inputCustomStr : 'usd');
  const finalOutputAxis = outputAxisMode === 'preset' ? outputPreset : (outputCustomValidation.valid ? outputCustomStr : 'usd');

  // DERIVED VALUES 
  const validQuat = quaternion.clone();
  if (validQuat.lengthSq() > 0.0000001) {
    validQuat.normalize();
  }

  // Euler Calculation (Input Section)
  const derivedEulerRaw = getEulerFromQuaternion(validQuat, eulerOrder, eulerMode);
  const derivedEulerDeg = {
    x: round(useDegrees ? toDegrees(derivedEulerRaw.x) : derivedEulerRaw.x),
    y: round(useDegrees ? toDegrees(derivedEulerRaw.y) : derivedEulerRaw.y),
    z: round(useDegrees ? toDegrees(derivedEulerRaw.z) : derivedEulerRaw.z),
  };

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
  const convertedQuat = convertRotationBasis(validQuat, finalInputAxis, finalOutputAxis);
  const convertedEuler = getEulerFromQuaternion(convertedQuat, converterEulerOrder, converterEulerMode);

  // HANDLERS
  const updateFromEuler = (axisName: 'x' | 'y' | 'z', val: number) => {
    const newBuffer = { ...displayEuler, [axisName]: val };
    setEulerInputBuffer(newBuffer);
    setLastUpdateSource('euler');

    const radX = useDegrees ? toRadians(newBuffer.x) : newBuffer.x;
    const radY = useDegrees ? toRadians(newBuffer.y) : newBuffer.y;
    const radZ = useDegrees ? toRadians(newBuffer.z) : newBuffer.z;

    const q = getQuaternionFromEuler(radX, radY, radZ, eulerOrder, eulerMode);
    setQuaternion(q);
  };

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

  const renderEulerInputs = () => {
    const axes = eulerOrder.split('');
    return axes.map((axis) => {
      const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';
      return (
        <NumberInput 
          key={axisKey}
          label={`${axis} (${useDegrees ? 'deg' : 'rad'})`} 
          value={displayEuler[axisKey]} 
          onChangeValue={(v) => updateFromEuler(axisKey, v)} 
        />
      );
    });
  };

  const renderCanonicalEulerOutputs = () => {
    const axes = eulerOrder.split('');
    return axes.map((axis) => {
      const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';
      return (
         <div key={axisKey}>
            <span className="text-[10px] font-bold text-slate-400 block mb-1">{axis}</span>
            <span className="font-mono text-sm text-slate-700">{derivedEulerDeg[axisKey]}</span>
         </div>
      );
    });
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
            <span>Euler Angles (Input)</span>
            <div className="group relative flex items-center">
               <HelpCircle size={14} className="text-slate-400 cursor-help hover:text-indigo-600 transition-colors" />
               <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-800 text-white text-[10px] p-3 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-sans font-normal leading-relaxed">
                   <h4 className="font-bold text-indigo-300 mb-2 uppercase">Simulator Defaults</h4>
                   <ul className="space-y-1.5 text-slate-300">
                       <li><strong className="text-white">Isaac Sim (USD):</strong> Intrinsic XYZ</li>
                       <li><strong className="text-white">ROS (TF):</strong> Intrinsic ZYX <span className="text-slate-500">(Yaw-Pitch-Roll)</span></li>
                   </ul>
               </div>
           </div>
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
             {renderEulerInputs()}
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
                 {renderCanonicalEulerOutputs()}
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

        {/* INPUT SNIPPET (NEW LOCATION) */}
        <div className="pt-2">
          <InputScipySnippet 
             euler={displayEuler}
             quaternion={displayQuat}
             matrix={rotationMatrix.elements}
             axisAngle={displayAxis}
             eulerSettings={{ order: eulerOrder, mode: eulerMode }}
             degrees={useDegrees}
          />
        </div>

      </div>

      {/* RIGHT COLUMN: VISUALIZATION */}
      <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6 self-start">
        <div className="min-h-[400px] h-[400px] lg:h-[600px] rounded-xl overflow-hidden shadow-lg border border-slate-200">
           <Visualizer quaternion={quaternion} />
        </div>

        {/* AXIS CONVERSION (RIGHT COLUMN) */}
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative">
           <SectionTitle>
             <div className="flex items-center gap-2">
               <Globe size={20} className="text-indigo-600" />
               <span className="text-indigo-900">Coordinate System Converter</span>
               
               {/* Documentation Tooltip */}
               <div className="group relative flex items-center">
                  <HelpCircle size={14} className="text-indigo-400 cursor-help hover:text-indigo-600 transition-colors" />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 text-white text-[10px] p-4 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-sans leading-relaxed border border-slate-700">
                      <h4 className="font-bold text-indigo-300 mb-2 uppercase">Preset Definitions</h4>
                      <ul className="space-y-1 mb-3 text-slate-300">
                        <li><strong className="text-white">USD:</strong> +X Right, +Y Up, -Z Forward (Format: RUB)</li>
                        <li><strong className="text-white">ROS:</strong> +X Fwd, +Y Left, +Z Up (Format: FLU)</li>
                        <li><strong className="text-white">World:</strong> Custom user preset (defaults to Z-Up)</li>
                      </ul>
                      <div className="h-px bg-slate-700 my-2"></div>
                      <h4 className="font-bold text-indigo-300 mb-2 uppercase">Custom Format Syntax</h4>
                      <p className="mb-2">Define your frame's X, Y, Z axes using 3 letters:</p>
                      <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300 mb-2">
                        <li><span className="text-white font-mono">R</span> = Right</li>
                        <li><span className="text-white font-mono">L</span> = Left</li>
                        <li><span className="text-white font-mono">F</span> = Forward</li>
                        <li><span className="text-white font-mono">B</span> = Back</li>
                        <li><span className="text-white font-mono">U</span> = Up</li>
                        <li><span className="text-white font-mono">D</span> = Down</li>
                      </ul>
                      <p className="text-slate-400 italic">Example: "RFU" means X is Right, Y is Forward, Z is Up.</p>
                      <p className="text-slate-400 italic mt-1">Note: Must form a valid Right-Handed System (X × Y = Z).</p>
                  </div>
               </div>
             </div>
           </SectionTitle>
           <div className="flex flex-col gap-4">
             <div className="flex items-start gap-4 text-sm">
                <div className="flex-1">
                   <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Input Axis (Current)</label>
                   <AxisSelector 
                     mode={inputAxisMode}
                     setMode={setInputAxisMode}
                     preset={inputPreset}
                     setPreset={setInputPreset}
                     customStr={inputCustomStr}
                     setCustomStr={setInputCustomStr}
                     validation={inputCustomValidation}
                   />
                </div>
                <div className="pt-6 text-indigo-300">
                   <ArrowRight size={20} />
                </div>
                <div className="flex-1">
                   <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Output Axis (Target)</label>
                   <AxisSelector 
                     mode={outputAxisMode}
                     setMode={setOutputAxisMode}
                     preset={outputPreset}
                     setPreset={setOutputPreset}
                     customStr={outputCustomStr}
                     setCustomStr={setOutputCustomStr}
                     validation={outputCustomValidation}
                   />
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
             
             {/* COORDINATE CONVERSION SNIPPET (NEW LOCATION) */}
             <div className="mt-2">
               <ConversionScipySnippet 
                 inputSystem={finalInputAxis}
                 outputSystem={finalOutputAxis}
               />
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};