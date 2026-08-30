// القاعدة المرسومة التفاعلية — لوحة المالك هي أرض اللعب لا صورة خلفية:
// المدينة قابلة للسحب أفقياً، وفوق كل مبنى شارة حيّة (المستوى/الترقية/الاستلام)
// نقرها — أو نقر المبنى نفسه في اللوحة — يفتح لوحة المبنى الحقيقية.
import { ART } from '../art';
import { t } from '../i18n';

// مواقع المباني داخل اللوحة (نسب من عرضها وارتفاعها) — مطابقة لرسمة المالك
const HOTSPOTS: { id: string; x: number; y: number }[] = [
  { id: 'hall', x: 0.50, y: 0.36 },
  { id: 'gold_mine', x: 0.22, y: 0.31 },
  { id: 'gold_mine_2', x: 0.20, y: 0.115 },
  { id: 'store', x: 0.745, y: 0.245 },
  { id: 'siege_shop', x: 0.125, y: 0.46 },
  { id: 'lab', x: 0.805, y: 0.43 },
  { id: 'barracks', x: 0.725, y: 0.645 },
  { id: 'farm', x: 0.19, y: 0.68 },
  { id: 'monument', x: 0.475, y: 0.80 },
  { id: 'gate', x: 0.475, y: 0.945 }
];

const MAP_ASPECT = 1215 / 770;

export class PaintedBase {
  private root = document.createElement('div');
  private board = document.createElement('div');
  private chips = new Map<string, HTMLElement>();
  private view: any = null;
  private onResize = () => this.resize();

  constructor(host: HTMLElement, private onOpen: (id: string) => void) {
    this.root.id = 'paintedbase';
    this.root.dir = 'ltr'; // تمرير أفقي متوقع الاتجاه؛ المحتوى صورة وشارات مطلقة
    this.board.className = 'pboard';
    this.board.style.backgroundImage = `url('${ART.city_map}')`;
    this.root.appendChild(this.board);
    // قبل طبقة الشاشات كي تبقى اللافتات والألواح فوق اللوحة
    host.insertBefore(this.root, document.getElementById('screens'));
    for (const h of HOTSPOTS) {
      const el = document.createElement('div');
      el.className = 'pchip';
      el.style.left = h.x * 100 + '%';
      el.style.top = h.y * 100 + '%';
      el.addEventListener('click', ev => { ev.stopPropagation(); this.onOpen(h.id); });
      this.board.appendChild(el);
      this.chips.set(h.id, el);
    }
    // نقر اللوحة نفسها = أقرب مبنى ضمن مدى معقول (جسد المبنى تحت شارته)
    this.board.addEventListener('click', ev => {
      const r = this.board.getBoundingClientRect();
      let best: string | null = null, bd = 95;
      for (const h of HOTSPOTS) {
        const d = Math.hypot(r.left + h.x * r.width - ev.clientX, r.top + h.y * r.height - ev.clientY);
        if (d < bd) { bd = d; best = h.id; }
      }
      if (best) this.onOpen(best);
    });
    addEventListener('resize', this.onResize);
    this.resize();
  }

  show(v: boolean): void { this.root.hidden = !v; if (v) this.resize(); }

  setState(view: any): void {
    this.view = view;
    if (!view) return;
    for (const [id, el] of this.chips) {
      const b = view.buildings?.[id];
      if (!b) { el.hidden = true; continue; }
      el.hidden = false;
      const locked = b.level === 0;
      el.classList.toggle('locked', locked);
      let sub = locked ? t('locked') : `${t('level')} ${b.level}`;
      if (view.upgrading?.id === id) {
        const left = Math.max(0, Math.ceil((view.upgrading.doneAt - Date.now()) / 1000));
        sub = `⏳ ${left}s`;
      }
      const full = !locked && b.bufferCap > 0 && b.pending >= Math.max(1, Math.floor(b.bufferCap / 3));
      el.innerHTML = `<span class="blabel">${t('b.' + id)}<small>${sub}</small></span>${full ? '<span class="pcoin">🪙</span>' : ''}`;
    }
  }

  private lastSync = 0;
  sync(now: number): void {
    // مؤقت الترقية يُحدَّث دورياً دون انتظار لقطة جديدة (لا كل إطار)
    if (this.view?.upgrading && now - this.lastSync > 500) {
      this.lastSync = now;
      this.setState(this.view);
    }
  }

  resize(): void {
    const h = this.root.clientHeight || innerHeight;
    this.board.style.height = h + 'px';
    this.board.style.width = Math.round(h * MAP_ASPECT) + 'px';
    if (!this.root.dataset.centered) {
      this.root.scrollLeft = Math.max(0, (this.board.offsetWidth - this.root.clientWidth) / 2);
      this.root.dataset.centered = '1';
    }
  }

  dispose(): void {
    removeEventListener('resize', this.onResize);
    this.root.remove();
  }
}
