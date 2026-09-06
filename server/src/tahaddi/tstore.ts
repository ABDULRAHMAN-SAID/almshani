// حفظ حسابات تحدّي — سجلّ إلحاقيّ: كل تغيّر سطر واحد، لا إعادة كتابة الملفّ كلّه.
//   لماذا: اللقطة الكاملة كانت تُسلسِل كل الحسابات في كل حفظ — عند ٢٠ ألف حساب
//   ١٫٢ ثانية تجميد للخيط الوحيد، وعند ٢٥٠ ألفًا تتجاوز السلسلة حدّ V8 وترمي.
//   القراءة: آخر سطر لكل مفتاح يفوز. الكبس يعيد بناء الملفّ حين يتضخّم السجلّ.
//   العقد (load / put / flush / close) يقبل قاعدة بيانات بديلة بلا تغيير في الخدمة.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, appendFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path';

export type Kind = 'a' | 'p';                     // a = حساب · p = شراء
export interface Row { k: Kind; i: string; v: unknown }

const HEADER = '#tahaddi/log/1';                   // سطر أوّل صريح — الصيغتان تبدآن بـ { فلا يكفي الحرف الأوّل للتمييز
const FLUSH_MS = 250;
const MIN_ROWS = 2_000;                            // لا كبس قبل هذا الحجم
const GROW = 3;                                    // اكبس حين يبلغ السجلّ ٣ أضعاف الحيّ

export class RecordStore {
  private buf: string[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rows = 0;                                // سطور في الملفّ الآن
  private live = 0;                                // سجلات حيّة عند آخر قراءة/كبس
  private snap: (() => Row[]) | null = null;
  private old = false;                             // الملفّ ما زال بالصيغة القديمة

  constructor(private file: string = process.env.TAHADDI_DATA_FILE ?? join(process.cwd(), '.data', 'tahaddi.json')) {}

  /** الخدمة تسلّم دالّة تعطي كل السجلات الحيّة — تُستدعى عند الكبس فقط */
  onCompact(fn: () => Row[]): void { this.snap = fn; }

  /** يقرأ السجلّ (أو ملفّ اللقطة القديم) ويعيد آخر قيمة لكل مفتاح */
  load(): { accounts: unknown[]; purchases: unknown[] } | null {
    try {
      if (!existsSync(this.file)) return null;
      const raw = readFileSync(this.file, 'utf8');
      if (!raw.trim()) return null;
      // الصيغة القديمة: كائن JSON واحد بلا ترويسة. تُقرأ ثم تُكبس إلى السجلّ عند أوّل حفظ.
      if (!raw.startsWith(HEADER)) {
        const d = JSON.parse(raw) as { accounts?: unknown[]; purchases?: unknown[] };
        const out = { accounts: d.accounts ?? [], purchases: d.purchases ?? [] };
        this.live = out.accounts.length + out.purchases.length;
        this.old = true;                           // أوّل حفظ يكبس فيتحوّل الملفّ للسجلّ
        return out;
      }
      const last = new Map<string, Row>();
      for (const line of raw.split('\n')) {
        if (!line || line === HEADER) continue;
        let r: Row;
        try { r = JSON.parse(line) as Row; } catch { continue; }   // سطر مقطوع (انقطاع كهرباء) يُتجاهل ولا يُفقد ما قبله
        if (!r || (r.k !== 'a' && r.k !== 'p') || typeof r.i !== 'string') continue;
        this.rows++;
        if (r.v === null) last.delete(r.k + r.i); else last.set(r.k + r.i, r);
      }
      this.live = last.size;
      const accounts: unknown[] = [], purchases: unknown[] = [];
      for (const r of last.values()) (r.k === 'a' ? accounts : purchases).push(r.v);
      return { accounts, purchases };
    } catch (e) {
      console.error('tahaddi/store: تعذر التحميل —', (e as Error).message);
      return null;
    }
  }

  /** سجلّ واحد تغيّر — سطر واحد، لا الملفّ كلّه */
  put(k: Kind, i: string, v: unknown): void {
    this.buf.push(JSON.stringify({ k, i, v }));
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, FLUSH_MS);
    (this.timer as any).unref?.();
  }

  flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.old) { this.old = false; this.compact(); }   // نكتب السجلّ كاملًا مرّة، ثم نُلحق
    if (!this.buf.length) return;
    const chunk = this.buf.join('\n') + '\n';
    const n = this.buf.length;
    this.buf = [];
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      // ملفّ جديد (أو تحوّل من الصيغة القديمة) يبدأ بترويسته
      if (!existsSync(this.file) || statSync(this.file).size === 0) writeFileSync(this.file, HEADER + '\n');
      appendFileSync(this.file, chunk);
      this.rows += n;
      if (this.rows > MIN_ROWS && this.rows > this.live * GROW) this.compact();
    } catch (e) {
      console.error('tahaddi/store: تعذر الحفظ —', (e as Error).message);
    }
  }

  /** إعادة بناء الملفّ من الحيّ وحده — مرّة كل آلاف الكتابات، لا كل كتابة */
  compact(): void {
    if (!this.snap) return;
    try {
      const rows = this.snap();
      const tmp = this.file + '.tmp';
      writeFileSync(tmp, HEADER + '\n' + rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
      renameSync(tmp, this.file);
      this.rows = rows.length; this.live = rows.length;
    } catch (e) {
      console.error('tahaddi/store: تعذر الكبس —', (e as Error).message);
    }
  }

  size(): number { try { return existsSync(this.file) ? statSync(this.file).size : 0; } catch { return 0; } }
  close(): void { this.flush(); }
}

/** الاسم القديم — نفس الصنف، حتى لا يكسر ما يستورده */
export { RecordStore as FileStore };
