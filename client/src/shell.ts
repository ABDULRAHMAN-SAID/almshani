// قشرة الإمبراطورية: شريط التبويبات السفلي + شريط الموارد العلوي + ومضات الخطأ.
import { t } from './i18n';

export type TabId = 'base' | 'units' | 'battle' | 'shop' | 'more';
const TABS: { id: TabId; icon: string }[] = [
  { id: 'base', icon: '⌂' },
  { id: 'units', icon: '⛨' },
  { id: 'battle', icon: '⚔' },
  { id: 'shop', icon: '⛁' },
  { id: 'more', icon: '≡' }
];

export class Shell {
  private nav = document.getElementById('nav')!;
  private resbar = document.getElementById('resbar')!;
  active: TabId = 'base';
  onTab: ((id: TabId) => void) | null = null;

  constructor() {
    this.nav.innerHTML = TABS.map(x =>
      `<button data-tab="${x.id}"><span class="ni">${x.icon}</span>${t('tab_' + x.id)}</button>`).join('');
    this.nav.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => this.onTab?.((b as HTMLElement).dataset.tab as TabId)));
    this.resbar.innerHTML = `
      <div class="pill"><span class="ic gold"></span><span id="r-gold">0</span></div>
      <div class="pill"><span class="ic supplies"></span><span id="r-supplies">0</span></div>
      <div class="pill"><span class="ic tokens"></span><span id="r-tokens">0</span></div>`;
  }

  setActive(id: TabId): void {
    this.active = id;
    this.nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('on', (b as HTMLElement).dataset.tab === id));
  }

  show(on: boolean): void {
    this.nav.hidden = !on;
    this.resbar.hidden = !on;
  }

  updateResources(base: any): void {
    if (!base) return;
    const set = (id: string, v: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v);
    };
    set('r-gold', base.gold);
    set('r-supplies', base.supplies);
    set('r-tokens', base.tokens);
  }

  flashError(code: string): void {
    const key = 'err_' + code;
    const msg = t(key);
    const el = document.createElement('div');
    el.className = 'errflash';
    el.innerHTML = `<span>${msg === key ? code : msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}
