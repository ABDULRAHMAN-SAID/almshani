// حفظ الحسابات على قرص محلي (شريحة تطوير) — الإنتاج: Nakama + PostgreSQL بنفس العقد.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILE = process.env.DATA_FILE ?? join(process.cwd(), '.data', 'state.json');
let timer: ReturnType<typeof setTimeout> | null = null;

export function loadState<T>(): T | null {
  try {
    if (!existsSync(FILE)) return null;
    return JSON.parse(readFileSync(FILE, 'utf8')) as T;
  } catch (e) {
    console.error('store: تعذر تحميل الحالة —', (e as Error).message);
    return null;
  }
}

export function saveStateSoon(get: () => unknown): void {
  if (timer) return;
  timer = setTimeout(() => { timer = null; saveNow(get()); }, 2000);
  (timer as any).unref?.();
}

export function saveNow(state: unknown): void {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    const tmp = FILE + '.tmp';
    writeFileSync(tmp, JSON.stringify(state));
    renameSync(tmp, FILE);
  } catch (e) {
    console.error('store: تعذر الحفظ —', (e as Error).message);
  }
}
