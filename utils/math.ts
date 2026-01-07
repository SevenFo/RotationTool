import * as THREE from 'three';
import { EulerOrder, EulerMode } from '../types';

export const toDegrees = (rad: number) => rad * (180 / Math.PI);
export const toRadians = (deg: number) => deg * (Math.PI / 180);

export const round = (num: number, decimals: number = 6) => {
  return parseFloat(num.toFixed(decimals));
};

// Helper to format matrix string for copy/display
export const formatMatrix = (elements: number[]): string => {
  const e = elements;
  // Three.js matrices are column-major, we usually want to read row-major
  const rows = [
    [e[0], e[4], e[8]],
    [e[1], e[5], e[9]],
    [e[2], e[6], e[10]],
  ];
  
  return rows.map(row => 
    `[ ${row.map(n => n.toFixed(6).padStart(10, ' ')).join(', ')} ]`
  ).join('\n');
};

// Handles the Scipy specific logic for Extrinsic conversions
// Scipy Extrinsic 'XYZ' is equivalent to Intrinsic 'ZYX' with reversed values (mathematically R_z * R_y * R_x)
export const getQuaternionFromEuler = (
  x: number, 
  y: number, 
  z: number, 
  order: EulerOrder, 
  mode: EulerMode
): THREE.Quaternion => {
  const q = new THREE.Quaternion();

  if (mode === 'intrinsic') {
    // Three.js Euler is Intrinsic by default
    const euler = new THREE.Euler(x, y, z, order);
    q.setFromEuler(euler);
  } else {
    // Extrinsic rotation (Static Frame)
    // To achieve Extrinsic XYZ, we can just multiply the Quaternions in reverse order relative to global axes
    // Or simpler: Intrinsic 'XYZ' = R_x * R_y' * R_z''
    // Extrinsic 'XYZ' = R_x * R_y * R_z (applied left to right on column vector is R_z * R_y * R_x... wait. Scipy uses active rotations)
    // Actually, the easiest mapping for Scipy:
    // Scipy Extrinsic('XYZ', a, b, c) === Scipy Intrinsic('ZYX', c, b, a)
    
    const reversedOrder = order.split('').reverse().join('') as EulerOrder;
    const euler = new THREE.Euler(z, y, x, reversedOrder);
    q.setFromEuler(euler);
  }
  return q;
};

// Returns Euler angles from a Quaternion based on desired Order and Mode
export const getEulerFromQuaternion = (
  q: THREE.Quaternion,
  order: EulerOrder,
  mode: EulerMode
): { x: number, y: number, z: number } => {
  
  if (mode === 'intrinsic') {
    const e = new THREE.Euler(0, 0, 0, order);
    e.setFromQuaternion(q, order);
    return { x: e.x, y: e.y, z: e.z };
  } else {
    // Reverse logic of the setter
    // We want output for Extrinsic 'XYZ'. 
    // We calculate Intrinsic 'ZYX'.
    // The result {x,y,z} of Intrinsic ZYX maps to {c,b,a} of Extrinsic XYZ.
    const reversedOrder = order.split('').reverse().join('') as EulerOrder;
    const e = new THREE.Euler(0, 0, 0, reversedOrder);
    e.setFromQuaternion(q, reversedOrder);
    // Map back: Intrinsic ZYX (x,y,z) -> Extrinsic XYZ (z,y,x)
    return { x: e.z, y: e.y, z: e.x };
  }
};
