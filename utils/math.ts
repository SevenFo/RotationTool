import * as THREE from 'three';
import { EulerOrder, EulerMode, AxisSystem } from '../types';

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
// Scipy Extrinsic 'XYZ' is equivalent to Intrinsic 'ZYX' (mathematically R_z * R_y * R_x)
// Note: Three.js Euler(x, y, z, order) arguments are ALWAYS angles for the specific axes X, Y, Z.
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
    // Extrinsic 'XYZ' (alpha, beta, gamma) is equivalent to Intrinsic 'ZYX' (gamma, beta, alpha)
    // where alpha is still the rotation around X, beta around Y, etc.
    const reversedOrder = order.split('').reverse().join('') as EulerOrder;
    // We pass (x, y, z) directly because Three.js applies 'reversedOrder' logic to these specific axis angles.
    const euler = new THREE.Euler(x, y, z, reversedOrder);
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
    // Reverse logic for Extrinsic
    const reversedOrder = order.split('').reverse().join('') as EulerOrder;
    const e = new THREE.Euler(0, 0, 0, reversedOrder);
    e.setFromQuaternion(q, reversedOrder);
    // Three.js puts the X-axis angle in e.x, Y in e.y, Z in e.z regardless of order.
    return { x: e.x, y: e.y, z: e.z };
  }
};

/**
 * Coordinate System Conversion Matrices
 * 
 * Implements the exact transformation matrices provided.
 * Note: Three.js Matrix4.set() takes arguments in Row-Major order (n11, n12, n13, n14...),
 * which matches the visual layout of the np.array definitions below.
 */

// from ROS camera convention to USD camera convention
// U_R_TRANSFORM = np.array([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
const U_R_TRANSFORM = new THREE.Matrix4().set(
  1,  0,  0, 0,
  0, -1,  0, 0,
  0,  0, -1, 0,
  0,  0,  0, 1
);

// from USD camera convention to ROS camera convention
// R_U_TRANSFORM = np.array([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
const R_U_TRANSFORM = new THREE.Matrix4().set(
  1,  0,  0, 0,
  0, -1,  0, 0,
  0,  0, -1, 0,
  0,  0,  0, 1
);

// from USD camera convention to World camera convention
// W_U_TRANSFORM = np.array([[0, 0, -1, 0], [-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1]])
const W_U_TRANSFORM = new THREE.Matrix4().set(
  0,  0, -1, 0,
 -1,  0,  0, 0,
  0,  1,  0, 0,
  0,  0,  0, 1
);

// from World camera convention to USD camera convention
// U_W_TRANSFORM = np.array([[0, -1, 0, 0], [0, 0, 1, 0], [-1, 0, 0, 0], [0, 0, 0, 1]])
const U_W_TRANSFORM = new THREE.Matrix4().set(
  0, -1,  0, 0,
  0,  0,  1, 0,
 -1,  0,  0, 0,
  0,  0,  0, 1
);

// Helper to get quaternion representing the rotation from one frame to USD
const getToUSDQuaternion = (from: AxisSystem): THREE.Quaternion => {
  const q = new THREE.Quaternion();
  switch (from) {
    case 'ros':
      q.setFromRotationMatrix(U_R_TRANSFORM);
      break;
    case 'world':
      q.setFromRotationMatrix(U_W_TRANSFORM);
      break;
    case 'usd':
      q.identity();
      break;
  }
  return q;
};

// Helper to get quaternion representing the rotation from USD to target frame
const getFromUSDQuaternion = (to: AxisSystem): THREE.Quaternion => {
  const q = new THREE.Quaternion();
  switch (to) {
    case 'ros':
      q.setFromRotationMatrix(R_U_TRANSFORM);
      break;
    case 'world':
      q.setFromRotationMatrix(W_U_TRANSFORM);
      break;
    case 'usd':
      q.identity();
      break;
  }
  return q;
};

export const convertRotationBasis = (
  q: THREE.Quaternion,
  from: AxisSystem,
  to: AxisSystem
): THREE.Quaternion => {
  if (from === to) return q.clone();

  // Strategy: Convert Input -> USD -> Output
  // Q_final = Q_usd_to_target * Q_source_to_usd * Q_input
  
  const qToUSD = getToUSDQuaternion(from);
  const qFromUSD = getFromUSDQuaternion(to);
  
  // Combine transformation: T = T_usd_to_target * T_source_to_usd
  // In Three.js, A.multiply(B) results in A*B.
  // We want qFrom * qTo (Apply ToUSD first, then FromUSD).
  const transformQ = qFromUSD.clone().multiply(qToUSD);
  
  // Apply transformation to the input quaternion
  // Q_final = Q_transform * Q_input
  const result = transformQ.clone().multiply(q);
  
  return result;
};