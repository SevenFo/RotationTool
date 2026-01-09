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
 * NOTE ON NAMING & DIRECTION:
 * Based on Isaac Sim debugging, the variable names in the original snippets (e.g. W_U_TRANSFORM)
 * represent the transformation matrix from Source to Target.
 * 
 * W_U_TRANSFORM: Transforms World -> USD
 * U_W_TRANSFORM: Transforms USD -> World
 * U_R_TRANSFORM: Transforms ROS -> USD
 * R_U_TRANSFORM: Transforms USD -> ROS
 * 
 * Note: Three.js Matrix4.set() takes arguments in Row-Major order (n11, n12, n13, n14...),
 * which matches the visual layout of the np.array definitions below.
 */

// TRANSFORM: ROS -> USD
// np.array([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
const U_R_TRANSFORM = new THREE.Matrix4().set(
  1,  0,  0, 0,
  0, -1,  0, 0,
  0,  0, -1, 0,
  0,  0,  0, 1
);

// TRANSFORM: USD -> ROS
// np.array([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]])
const R_U_TRANSFORM = new THREE.Matrix4().set(
  1,  0,  0, 0,
  0, -1,  0, 0,
  0,  0, -1, 0,
  0,  0,  0, 1
);

// TRANSFORM: World -> USD (Verified via Isaac Sim debug: parent * W_U = usd)
// np.array([[0, 0, -1, 0], [-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1]])
const W_U_TRANSFORM = new THREE.Matrix4().set(
  0,  0, -1, 0,
 -1,  0,  0, 0,
  0,  1,  0, 0,
  0,  0,  0, 1
);

// TRANSFORM: USD -> World (Inverse of above)
// np.array([[0, -1, 0, 0], [0, 0, 1, 0], [-1, 0, 0, 0], [0, 0, 0, 1]])
const U_W_TRANSFORM = new THREE.Matrix4().set(
  0, -1,  0, 0,
  0,  0,  1, 0,
 -1,  0,  0, 0,
  0,  0,  0, 1
);

/**
 * CUSTOM AXIS LOGIC
 * We define a standard internal basis aligned with USD (Right, Up, Back).
 * R = +X, L = -X
 * U = +Y, D = -Y
 * B = +Z, F = -Z
 */
const VECTORS: Record<string, THREE.Vector3> = {
  'R': new THREE.Vector3(1, 0, 0),
  'L': new THREE.Vector3(-1, 0, 0),
  'U': new THREE.Vector3(0, 1, 0),
  'D': new THREE.Vector3(0, -1, 0),
  'B': new THREE.Vector3(0, 0, 1),
  'F': new THREE.Vector3(0, 0, -1),
};

export const parseCustomAxis = (code: string): { valid: boolean; error?: string; matrix?: THREE.Matrix4 } => {
  const c = code.toUpperCase().trim();
  if (c.length !== 3) return { valid: false, error: "Must be 3 characters" };
  
  const chars = c.split('');
  const validChars = ['R', 'L', 'U', 'D', 'B', 'F'];
  
  // Check characters
  if (!chars.every(char => validChars.includes(char))) {
    return { valid: false, error: "Use R,L, U,D, F,B only" };
  }

  // Check orthogonality by ensuring no opposite pairs (e.g., RL) or duplicates
  // Simplest check: get vectors and check cross product
  const xVec = VECTORS[chars[0]];
  const yVec = VECTORS[chars[1]];
  const zVec = VECTORS[chars[2]];

  if (xVec.dot(yVec) !== 0 || xVec.dot(zVec) !== 0 || yVec.dot(zVec) !== 0) {
    return { valid: false, error: "Axes must be orthogonal" };
  }

  // Check Right-Handedness: X cross Y should equal Z
  const cross = new THREE.Vector3().crossVectors(xVec, yVec);
  if (cross.distanceTo(zVec) > 0.001) {
    return { valid: false, error: "Must be Right-Handed System" };
  }

  // Construct Matrix: Columns are X, Y, Z
  // This represents the Rotation from the Custom Frame to the Reference (USD) Frame
  const m = new THREE.Matrix4().makeBasis(xVec, yVec, zVec);
  
  return { valid: true, matrix: m };
};

const getCustomToUSDQuaternion = (code: string): THREE.Quaternion => {
  const res = parseCustomAxis(code);
  if (res.valid && res.matrix) {
    return new THREE.Quaternion().setFromRotationMatrix(res.matrix);
  }
  return new THREE.Quaternion(); // Identity fallback
};

const getUSDToCustomQuaternion = (code: string): THREE.Quaternion => {
  const res = parseCustomAxis(code);
  if (res.valid && res.matrix) {
    // Inverse of rotation matrix is transpose
    const inv = res.matrix.clone().transpose();
    return new THREE.Quaternion().setFromRotationMatrix(inv);
  }
  return new THREE.Quaternion(); // Identity fallback
};


// Helper to get the Transformation Matrix (as Quaternion) that converts FROM 'source' TO 'USD'.
// Returns T_source_to_usd
const getToUSDQuaternion = (from: AxisSystem): THREE.Quaternion => {
  const q = new THREE.Quaternion();
  
  // Handle presets
  if (from === 'ros') return q.setFromRotationMatrix(U_R_TRANSFORM);
  if (from === 'world') return q.setFromRotationMatrix(W_U_TRANSFORM);
  if (from === 'usd') return q.identity();

  // Handle custom string
  if (typeof from === 'string') {
    return getCustomToUSDQuaternion(from);
  }
  
  return q;
};

// Helper to get the Transformation Matrix (as Quaternion) that converts FROM 'USD' TO 'target'.
// Returns T_usd_to_target
const getFromUSDQuaternion = (to: AxisSystem): THREE.Quaternion => {
  const q = new THREE.Quaternion();

  // Handle presets
  if (to === 'ros') return q.setFromRotationMatrix(R_U_TRANSFORM);
  if (to === 'world') return q.setFromRotationMatrix(U_W_TRANSFORM);
  if (to === 'usd') return q.identity();

  // Handle custom string
  if (typeof to === 'string') {
    return getUSDToCustomQuaternion(to);
  }

  return q;
};

export const convertRotationBasis = (
  q: THREE.Quaternion,
  from: AxisSystem,
  to: AxisSystem
): THREE.Quaternion => {
  if (from === to) return q.clone();

  // Strategy: Coordinate Basis Change
  // We use post-multiplication (Right Multiply) for basis changes.
  // Q_final = Q_initial * T_transform
  // Path: Input Frame -> USD Frame -> Output Frame
  
  // 1. Get Transform: Input -> USD
  const t_in_to_usd = getToUSDQuaternion(from);
  
  // 2. Get Transform: USD -> Output
  const t_usd_to_out = getFromUSDQuaternion(to);
  
  // 3. Combine Transforms: T_total = T_in_to_usd * T_usd_to_out
  const t_total = t_in_to_usd.clone().multiply(t_usd_to_out);
  
  // 4. Apply to Input Quaternion
  // Q_out = Q_in * T_total
  const result = q.clone().multiply(t_total);
  
  return result;
};