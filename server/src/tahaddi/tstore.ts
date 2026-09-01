// حفظ حسابات تحدّي على قرص محلي — ملفّ واحد، كتابة ذرّية، مُهلة تجميع.
// الإنتاج يستبدله بقاعدة بيانات بنفس العقد (load / saveSoon / saveNow).
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class FileStore<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private file: string = process.env.TAHADDI_DATA_FILE ?? join(process.cwd(), '.data', 'tahaddi.json')) {}

  load(): T | null {
    try {
      if (!existsSync(this.file)) return null;
      return JSON.parse(readFileSync(this.file, 'utf8')) as T;
    } catch (e) {
      console.error('tahaddi/store: تعذر التحميل —', (e as Error).message);
      return null;
    }
  }
  saveSoon(get: () => T): void {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.saveNow(get()); }, 1500);
    (this.timer as any).unref?.();
  }
  saveNow(state: T): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(state));
      renameSync(tmp, this.file);
    } catch (e) {
      console.error('tahaddi/store: تعذر الحفظ —', (e as Error).message);
    }
  }
}
