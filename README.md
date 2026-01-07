# RotationTool

**RotationTool** is a comprehensive 3D orientation math utility designed for developers, engineers, and students working with 3D graphics, robotics, or aerospace.

> **Note**: This project was designed and generated with the assistance of **Google Gemini**.

## Features

### 1. 3D Rotation Converter
Seamlessly convert between different rotation representations:
*   **Quaternions** (xyzw)
*   **Euler Angles**
    *   Supports all 12 axis sequences (XYZ, ZYX, etc.)
    *   Supports both **Intrinsic** (Mobile/Local) and **Extrinsic** (Static/Global) frames.
    *   Matches `scipy.spatial.transform.Rotation` standards.
*   **Rotation Matrix** (3x3)
*   **Axis-Angle**

### 2. Quaternion Calculator
Perform complex quaternion arithmetic with ease:
*   Multiplication (A * B and B * A)
*   Inversion & Conjugation
*   **Python/Scipy Code Generation**: Automatically generates the corresponding Python code for your calculation to copy-paste into your scripts.
*   **History Tracking**: Keep track of your recent calculations.

### 3. Real-time Visualization
*   Interactive 3D viewer powered by **Three.js**.
*   Real-time updates as you modify values.
*   Visualizes the orientation of the object relative to the world axes.

## Development

This project uses **React**, **Three.js**, **React Three Fiber**, and **Vite**.

### Installation

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Deployment

This repository is configured with **GitHub Actions** to automatically deploy to **GitHub Pages** on every push to the `main` branch.
