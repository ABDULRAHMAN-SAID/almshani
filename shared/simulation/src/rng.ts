// عشوائية حتمية (mulberry32) — الحالة عدد صحيح 32-bit يُخزَّن داخل حالة المحاكاة.
export function rngNext(state: number): { state: number; value: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let v = Math.imul(t ^ (t >>> 15), 1 | t);
  v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
  const value = ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  return { state: t, value };
}

// عدد صحيح في [0, n)
export function rngInt(state: number, n: number): { state: number; value: number } {
  const r = rngNext(state);
  return { state: r.state, value: Math.floor(r.value * n) };
}
