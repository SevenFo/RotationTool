import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { NumberInput, SectionTitle } from './ui/InputFields';
import { round, toDegrees } from '../utils/math';
import { Calculator, Info, History, Code, ArrowUpLeft, Trash2, Copy, Check } from 'lucide-react';
import Visualizer from './Visualizer';

type Operation = 'multiply_AB' | 'multiply_BA' | 'invert_A' | 'invert_B' | 'conjugate_A' | 'conjugate_B';

interface HistoryItem {
  id: string;
  timestamp: number;
  op: Operation;
  quatA: {x:number, y:number, z:number, w:number};
  quatB: {x:number, y:number, z:number, w:number};
  result: {x:number, y:number, z:number, w:number};
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="text-slate-400 hover:text-indigo-600 transition-colors p-1" 
      title="Copy value"
    >
       {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

// Moved outside to prevent re-mounting on every render
const SimpleQuatInput = ({ label, value, onChange }: { label: string, value: THREE.Quaternion, onChange: (c: 'x'|'y'|'z'|'w', v: number) => void }) => (
  <div className="bg-white p-4 rounded-lg border border-slate-200">
    <h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">{label}</h4>
    <div className="grid grid-cols-4 gap-2">
      <NumberInput label="x" value={value.x} onChangeValue={v => onChange('x', v)} />
      <NumberInput label="y" value={value.y} onChangeValue={v => onChange('y', v)} />
      <NumberInput label="z" value={value.z} onChangeValue={v => onChange('z', v)} />
      <NumberInput label="w" value={value.w} onChangeValue={v => onChange('w', v)} />
    </div>
  </div>
);

export const RotationCalculator: React.FC = () => {
  const [quatA, setQuatA] = useState(new THREE.Quaternion(0, 0, 0, 1));
  const [quatB, setQuatB] = useState(new THREE.Quaternion(0, 0, 0, 1));
  const [operation, setOperation] = useState<Operation>('multiply_AB');
  const [resultQuat, setResultQuat] = useState(new THREE.Quaternion(0, 0, 0, 1));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);

  // Compute result
  useEffect(() => {
    const qA = quatA.clone().normalize();
    const qB = quatB.clone().normalize();
    const res = new THREE.Quaternion();

    switch (operation) {
      case 'multiply_AB': res.copy(qA).multiply(qB); break;
      case 'multiply_BA': res.copy(qB).multiply(qA); break;
      case 'invert_A': res.copy(qA).invert(); break;
      case 'invert_B': res.copy(qB).invert(); break;
      case 'conjugate_A': res.copy(qA).conjugate(); break;
      case 'conjugate_B': res.copy(qB).conjugate(); break;
    }
    setResultQuat(res);
  }, [quatA, quatB, operation]);

  const addToHistory = () => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      op: operation,
      quatA: { x: quatA.x, y: quatA.y, z: quatA.z, w: quatA.w },
      quatB: { x: quatB.x, y: quatB.y, z: quatB.z, w: quatB.w },
      result: { x: resultQuat.x, y: resultQuat.y, z: resultQuat.z, w: resultQuat.w }
    };
    setHistory(prev => [newItem, ...prev].slice(0, 10)); // Keep last 10
  };

  const updateQuat = (target: 'A' | 'B', comp: 'x'|'y'|'z'|'w', val: number) => {
    const setter = target === 'A' ? setQuatA : setQuatB;
    const current = target === 'A' ? quatA : quatB;
    const next = new THREE.Quaternion(
      comp === 'x' ? val : current.x,
      comp === 'y' ? val : current.y,
      comp === 'z' ? val : current.z,
      comp === 'w' ? val : current.w
    );
    setter(next);
  };

  // Generate Python Code String
  const pythonCode = React.useMemo(() => {
    const fmt = (q: THREE.Quaternion) => `[${q.x.toFixed(4)}, ${q.y.toFixed(4)}, ${q.z.toFixed(4)}, ${q.w.toFixed(4)}]`;
    
    let opCode = "";
    let desc = "";
    
    switch(operation) {
        case 'multiply_AB': 
            opCode = "r = r_a * r_b"; 
            desc = "# Composition: Rotation A then Rotation B (Intrinsic)";
            break;
        case 'multiply_BA': 
            opCode = "r = r_b * r_a"; 
            desc = "# Composition: Rotation B then Rotation A (Intrinsic)";
            break;
        case 'invert_A': 
            opCode = "r = r_a.inv()"; 
            desc = "# Inverse of A";
            break;
        case 'invert_B': 
            opCode = "r = r_b.inv()"; 
            desc = "# Inverse of B";
            break;
        case 'conjugate_A': 
            opCode = "r = r_a.inv() # Conjugate ~ Inverse for unit quats"; 
            break;
        case 'conjugate_B': 
            opCode = "r = r_b.inv() # Conjugate ~ Inverse for unit quats"; 
            break;
    }

    const needsB = operation.includes('B') || operation.includes('multiply');
    
    // Build lines array to avoid empty lines
    const lines = [
      "from scipy.spatial.transform import Rotation as R",
      "import numpy as np",
      "",
      `q_a = ${fmt(quatA)}`,
    ];

    if (needsB) {
      lines.push(`q_b = ${fmt(quatB)}`);
    }

    lines.push("");
    lines.push("r_a = R.from_quat(q_a)");
    
    if (needsB) {
      lines.push("r_b = R.from_quat(q_b)");
    }

    if (desc) {
      lines.push("");
      lines.push(desc);
    }
    
    lines.push(opCode);
    lines.push("");
    lines.push(`print(f"Result (xyzw): {r.as_quat()}")`);
    lines.push(`print(f"Euler (xyz deg): {r.as_euler('xyz', degrees=True)}")`);

    return lines.join("\n");
  }, [quatA, quatB, operation]);

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const eulerResStr = (() => {
      const e = new THREE.Euler().setFromQuaternion(resultQuat, 'XYZ');
      return `x: ${round(toDegrees(e.x))}°, y: ${round(toDegrees(e.y))}°, z: ${round(toDegrees(e.z))}°`;
  })();

  const quatResStr = `[${round(resultQuat.x)}, ${round(resultQuat.y)}, ${round(resultQuat.z)}, ${round(resultQuat.w)}]`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-7 space-y-6">
         
         {/* INPUTS */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SimpleQuatInput label="Rotation A" value={quatA} onChange={(c,v) => updateQuat('A', c, v)} />
            <SimpleQuatInput label="Rotation B" value={quatB} onChange={(c,v) => updateQuat('B', c, v)} />
         </div>

         {/* OPERATIONS */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <SectionTitle>Operation</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {[
                 { id: 'multiply_AB', label: 'A * B', desc: 'Compose A then B' },
                 { id: 'multiply_BA', label: 'B * A', desc: 'Compose B then A' },
                 { id: 'invert_A', label: 'Invert A', desc: 'Inverse of A' },
                 { id: 'invert_B', label: 'Invert B', desc: 'Inverse of B' },
                 { id: 'conjugate_A', label: 'Conj A', desc: 'Conjugate A' },
                 { id: 'conjugate_B', label: 'Conj B', desc: 'Conjugate B' },
               ].map((op) => (
                 <button
                   key={op.id}
                   onClick={() => setOperation(op.id as Operation)}
                   className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                     operation === op.id 
                       ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                   }`}
                 >
                   <span className="text-sm font-bold">{op.label}</span>
                   <span className="text-[10px] text-slate-400 mt-1">{op.desc}</span>
                 </button>
               ))}
            </div>
         </div>

         {/* RESULT */}
         <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 z-10 relative">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-lg">
                 <Calculator size={20} /> Result
              </div>
              <button onClick={addToHistory} className="flex items-center gap-1 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
                 <History size={14} /> Save to History
              </button>
            </div>
            
            <div className="space-y-4 z-10 relative">
               <div className="bg-white p-3 rounded border border-indigo-100">
                  <div className="flex justify-between items-start mb-1">
                     <div className="text-xs font-bold text-indigo-400 uppercase">Quaternion Result</div>
                     <CopyButton text={quatResStr} />
                  </div>
                  <div className="font-mono text-sm text-indigo-900 break-all">
                     {quatResStr}
                  </div>
               </div>
               
               <div className="bg-white p-3 rounded border border-indigo-100">
                  <div className="flex justify-between items-start mb-1">
                     <div className="text-xs font-bold text-indigo-400 uppercase">Euler (XYZ Intrinsic)</div>
                     <CopyButton text={eulerResStr} />
                  </div>
                  <div className="font-mono text-sm text-indigo-900">
                     {eulerResStr}
                  </div>
               </div>
            </div>
         </div>

         {/* HISTORY */}
         {history.length > 0 && (
           <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} /> Recent Calculations
                </h3>
                <button onClick={() => setHistory([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
             </div>
             <div className="grid gap-3">
               {history.map((item) => (
                 <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-slate-400">{item.op}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => setQuatA(new THREE.Quaternion(item.result.x, item.result.y, item.result.z, item.result.w))}
                           className="text-[10px] bg-slate-100 hover:bg-indigo-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1"
                           title="Load Result into A"
                         >
                           <ArrowUpLeft size={10} /> Load A
                         </button>
                         <button 
                           onClick={() => setQuatB(new THREE.Quaternion(item.result.x, item.result.y, item.result.z, item.result.w))}
                           className="text-[10px] bg-slate-100 hover:bg-indigo-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1"
                           title="Load Result into B"
                         >
                           <ArrowUpLeft size={10} /> Load B
                         </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                      <span className="opacity-50">Res:</span>
                      <span className="truncate">[{round(item.result.x)}, {round(item.result.y)}, {round(item.result.z)}, {round(item.result.w)}]</span>
                    </div>
                 </div>
               ))}
             </div>
           </div>
         )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6 self-start">
         <div className="min-h-[300px] h-[400px] rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-slate-50">
             <Visualizer quaternion={resultQuat} />
         </div>
         
         <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-xs text-yellow-800">
            <div className="font-bold flex items-center gap-2 mb-1"><Info size={14}/> Note on Operations</div>
            Quaternions are multiplied as A * B. In Three.js (and standard math), this means rotation B is applied <em>after</em> rotation A in the local frame (or A then B if viewing as global operators depending on convention). 
         </div>

         {/* Python Code Block */}
         <div className="bg-slate-900 rounded-lg overflow-hidden shadow-md border border-slate-800">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Code size={14} />
                    <span>scipy code</span>
                </div>
                <button 
                    onClick={copyCode}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    {codeCopied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                    {codeCopied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[10px] leading-relaxed font-mono text-slate-300">
                <code>{pythonCode}</code>
            </pre>
         </div>
      </div>
    </div>
  );
};
