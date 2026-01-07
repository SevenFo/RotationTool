import React, { useState, useEffect, useRef } from 'react';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: number;
  onChangeValue: (val: number) => void;
  step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({ 
  label, 
  value, 
  onChangeValue, 
  className,
  step = 0.01,
  ...props 
}) => {
  const [localStr, setLocalStr] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronization Logic:
  // ONLY sync from parent 'value' when the input is NOT focused.
  // This allows the user to type freely (e.g. "0.", "-", "-0.0") without React 
  // overriding the input with the parsed numeric value (e.g. 0) mid-typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalStr(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalStr(newVal);

    // Try to parse, but allow invalid intermediate states (like empty string or just "-")
    // If it is empty, treat as 0 for the calculation, but keep "" in the input
    if (newVal.trim() === '') {
      onChangeValue(0);
      return;
    }

    const parsed = parseFloat(newVal);
    // Only propagate valid finite numbers. 
    // If user types "-", parsed is NaN, so we don't update parent, keeping previous value there, 
    // but localStr keeps "-" so user sees what they typed.
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChangeValue(parsed);
    }
  };

  const handleBlur = () => {
    // On blur, clean up. If valid number, format it nicely.
    // If invalid (e.g. just "-"), revert to the last valid parent value.
    const parsed = parseFloat(localStr);
    if (!isNaN(parsed) && isFinite(parsed)) {
      setLocalStr(parsed.toString()); // Removes trailing dots, leading zeros etc.
    } else {
      setLocalStr(value.toString()); // Revert
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{label}</label>
      <input
        ref={inputRef}
        type="text" 
        inputMode="decimal"
        autoComplete="off"
        value={localStr}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-mono placeholder-slate-300"
        {...props}
      />
    </div>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode, action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
    <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
      {children}
    </h3>
    {action && <div>{action}</div>}
  </div>
);

export const MatrixInput: React.FC<{ 
  matrix: number[], 
  onChange: (index: number, val: number) => void 
}> = ({ matrix, onChange }) => {
  const indices = [0, 4, 8, 1, 5, 9, 2, 6, 10];
  const labels = ['R11', 'R12', 'R13', 'R21', 'R22', 'R23', 'R31', 'R32', 'R33'];

  return (
    <div className="grid grid-cols-3 gap-3">
      {indices.map((idx, i) => (
        <NumberInput 
          key={idx} 
          label={labels[i]} 
          value={matrix[idx]} 
          onChangeValue={(val) => onChange(idx, val)} 
        />
      ))}
    </div>
  );
};
