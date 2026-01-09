export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';

// Scipy definition: 
// Intrinsic (lowercase, e.g., 'xyz') -> Rotates around moving axes
// Extrinsic (uppercase, e.g., 'XYZ') -> Rotates around static axes
export type EulerMode = 'intrinsic' | 'extrinsic';

export interface EulerState {
  x: number;
  y: number;
  z: number;
  order: EulerOrder;
  mode: EulerMode;
}

export interface AxisAngleState {
  x: number;
  y: number;
  z: number;
  angle: number; // in radians
}

export type AxisSystem = 'ros' | 'world' | 'usd';