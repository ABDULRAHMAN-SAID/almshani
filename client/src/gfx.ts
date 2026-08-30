// أدوات الهندسة منخفضة المستوى: تلوين رؤوس + دمج أجزاء في هندسة واحدة لكل نموذج
// (تقنية النموذج الأولي المثبتة: نموذج كامل = Draw Call واحد بخامة رؤوس ملوّنة).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function paint(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return out;
}

// اختصارات أجزاء ملوّنة موضوعة
export const box = (w: number, h: number, d: number, hex: number, x = 0, y = 0, z = 0, ry = 0, rz = 0, rx = 0) => {
  const g = paint(new THREE.BoxGeometry(w, h, d), hex);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
};
export const cyl = (rt: number, rb: number, h: number, hex: number, x = 0, y = 0, z = 0, seg = 7, rz = 0, rx = 0) => {
  const g = paint(new THREE.CylinderGeometry(rt, rb, h, seg), hex);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
};
export const cone = (r: number, h: number, hex: number, x = 0, y = 0, z = 0, seg = 6, rx = 0, rz = 0) => {
  const g = paint(new THREE.ConeGeometry(r, h, seg), hex);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
};
export const ball = (r: number, hex: number, x = 0, y = 0, z = 0, w = 8, hgt = 6, sy = 1) => {
  const g = paint(new THREE.SphereGeometry(r, w, hgt), hex);
  if (sy !== 1) g.scale(1, sy, 1);
  g.translate(x, y, z);
  return g;
};
export const arc = (r: number, tube: number, hex: number, x = 0, y = 0, z = 0, rz = 0) => {
  const g = paint(new THREE.TorusGeometry(r, tube, 5, 8, Math.PI), hex);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
};

// خامة الرؤوس الملوّنة الواحدة المشتركة لكل النماذج
let sharedMat: THREE.MeshLambertMaterial | null = null;
export function modelMat(): THREE.MeshLambertMaterial {
  if (!sharedMat) sharedMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return sharedMat;
}
