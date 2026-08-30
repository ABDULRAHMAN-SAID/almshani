// HUD المعركة — DOM فوق القماشة (UI_UX.md §6): خرزات CP، خانات القيادة،
// المؤقت والنقاط وأشرطة المقرين وعدّادات الفرق فوق رؤوسها.
import { cpCap, membersAlive, TICKS_PER_SEC, type SimEvent } from '../../../shared/simulation/src/index';
import type { MatchClient } from './game';
import type { BattleRender } from './render';
import { t, unitName, unitMark } from '../i18n';

export class BattleHud {
  private root: HTMLElement;
  private beads: HTMLElement[] = [];
  private cpnum!: HTMLElement;
  private slots: HTMLElement[] = [];
  private timer!: HTMLElement;
  private scoreFill!: HTMLElement;
  private hqFill: HTMLElement[] = [];
  private hqTxt: HTMLElement[] = [];
  private skillBtn!: HTMLButtonElement;
  private toastEl!: HTMLElement;
  private labels = new Map<number, HTMLElement>();
  private toastTimer = 0;
  onSlotDrag: ((slot: number, ev: PointerEvent) => void) | null = null;
  onSkill: (() => void) | null = null;
  onSurrender: (() => void) | null = null;

  constructor(private mc: MatchClient, private render: BattleRender) {
    this.root = document.getElementById('hud')!;
    this.build();
  }

  private build(): void {
    const you = this.mc.you, foe = 1 - you;
    const pn = (i: number) =>
      `${this.mc.info.players[i].name}${this.mc.info.players[i].isBot ? ` <span class="botmark">${t('bot')}</span>` : ''}`;
    this.root.innerHTML = `
      <div class="top">
        <div class="pname foe">${pn(foe)}</div>
        <div id="timer">3:30</div>
        <div class="pname">${pn(you)}</div>
      </div>
      <div id="scorebar"><div class="fill"></div></div>
      <div class="hqbar foe"><div class="fill" style="width:100%"></div><span>4000</span></div>
      <div class="hqbar mine"><div class="fill" style="width:100%"></div><span>4000</span></div>
      <button id="skillbtn" disabled>${t('skill').replace('\n', '<br>')}</button>
      <button id="surrender" class="btn ghost">${t('surrender')}</button>
      <div class="toast" id="btoast"></div>
      <div class="bottom">
        <div id="cprow"></div>
        <div id="slots"></div>
      </div>`;
    this.timer = this.root.querySelector('#timer')!;
    this.scoreFill = this.root.querySelector('#scorebar .fill')!;
    this.hqFill = [this.root.querySelector('.hqbar.mine .fill')!, this.root.querySelector('.hqbar.foe .fill')!];
    this.hqTxt = [this.root.querySelector('.hqbar.mine span')!, this.root.querySelector('.hqbar.foe span')!];
    this.toastEl = this.root.querySelector('#btoast')!;
    const cprow = this.root.querySelector('#cprow')!;
    for (let i = 0; i < 12; i++) {
      const b = document.createElement('div');
      b.className = 'bead';
      cprow.appendChild(b);
      this.beads.push(b);
    }
    this.cpnum = document.createElement('div');
    this.cpnum.className = 'cpnum';
    cprow.appendChild(this.cpnum);
    const slots = this.root.querySelector('#slots')!;
    const deck = this.mc.info.decks[this.mc.you];
    deck.forEach((uid, i) => {
      const u = this.mc.ctx.units[uid];
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `<div class="med">${unitMark(uid)}</div><div class="cost">${u.cost}</div><div class="cd" hidden></div>`;
      el.title = unitName(uid);
      el.addEventListener('pointerdown', ev => { ev.preventDefault(); this.onSlotDrag?.(i, ev); });
      slots.appendChild(el);
      this.slots.push(el);
    });
    this.skillBtn = this.root.querySelector('#skillbtn')!;
    this.skillBtn.addEventListener('click', () => this.onSkill?.());
    this.root.querySelector('#surrender')!.addEventListener('click', () => this.onSurrender?.());
    this.root.hidden = false;
  }

  toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2200) as unknown as number;
  }

  handleEvents(evs: SimEvent[]): void {
    for (const e of evs) {
      if (e.t === 'phase' && e.phase === 'overtime') this.toast(t('overtime'));
      if (e.t === 'forward' && e.player === this.mc.you) this.toast(t('forwardOpen'));
      if (e.t === 'kill') this.render.spawnFx(e.x!, e.z!, e.player === this.mc.you ? 0xb25b28 : 0xd8c9a8, 2);
      if (e.t === 'skill') this.render.spawnFx(e.x!, e.z!, 0xa08339, 4);
    }
  }

  update(): void {
    const mc = this.mc, st = mc.st, a = mc.ctx.arena;
    const P = st.players[mc.you];
    // المؤقت
    const mainLeft = Math.max(0, a.mainTicks - st.tick);
    const otLeft = Math.max(0, a.mainTicks + a.overtimeTicks - st.tick);
    const secs = Math.ceil((st.phase === 'main' ? mainLeft : otLeft) / TICKS_PER_SEC);
    this.timer.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    this.timer.classList.toggle('ot', st.phase === 'overtime');
    // خرزات CP
    const cap = cpCap(st, a);
    const decisive = cap > a.cpCap;
    for (let i = 0; i < 12; i++) {
      const b = this.beads[i];
      b.style.display = i < cap ? '' : 'none';
      b.classList.toggle('full', i < P.cp);
      b.classList.toggle('decisive', decisive && i >= a.cpCap);
    }
    this.cpnum.textContent = `${P.cp}`;
    // الخانات
    const deck = this.mc.info.decks[mc.you];
    deck.forEach((uid, i) => {
      const u = mc.ctx.units[uid];
      const el = this.slots[i];
      const cdTicks = P.musterReadyTick[i] - st.tick;
      el.classList.toggle('poor', P.cp < u.cost || cdTicks > 0);
      const cd = el.querySelector('.cd') as HTMLElement;
      if (cdTicks > 0) { cd.hidden = false; cd.textContent = String(Math.ceil(cdTicks / TICKS_PER_SEC)); }
      else cd.hidden = true;
    });
    // المهارة
    const chargeLeft = a.skillChargeTicks - st.tick;
    const ready = !P.skillUsed && chargeLeft <= 0;
    this.skillBtn.disabled = !ready;
    this.skillBtn.classList.toggle('ready', ready);
    if (P.skillUsed) this.skillBtn.textContent = '—';
    else if (chargeLeft > 0) this.skillBtn.textContent = String(Math.ceil(chargeLeft / TICKS_PER_SEC));
    else this.skillBtn.innerHTML = t('skill').replace('\n', '<br>');
    // النقاط وأشرطة المقرين
    const my = st.players[mc.you], op = st.players[1 - mc.you];
    const total = my.scoreMilli + op.scoreMilli;
    this.scoreFill.style.width = `${total === 0 ? 50 : Math.round((my.scoreMilli / total) * 100)}%`;
    const pct = (v: number) => `${Math.max(0, Math.round((v / a.hqHpCenti) * 100))}%`;
    this.hqFill[0].style.width = pct(my.hqHpCenti);
    this.hqFill[1].style.width = pct(op.hqHpCenti);
    this.hqTxt[0].textContent = String(Math.ceil(my.hqHpCenti / 100));
    this.hqTxt[1].textContent = String(Math.ceil(op.hqHpCenti / 100));
    // عدّادات الفرق
    const seen = new Set<number>();
    const now = performance.now();
    const alphaV = mc.alpha(now);
    for (const sq of st.squads) {
      seen.add(sq.id);
      let el = this.labels.get(sq.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `sqlabel ${sq.player === mc.you ? 'mine' : 'foe'}`;
        this.root.appendChild(el);
        this.labels.set(sq.id, el);
      }
      const u = mc.ctx.units[sq.unit];
      const alive = membersAlive(sq, u);
      el.textContent = `${alive}/${u.size}`;
      const frac = sq.hpCenti / u.squadHpCenti;
      el.classList.toggle('hurt', frac <= 0.66 && frac > 0.33);
      el.classList.toggle('crit', frac <= 0.33);
      const pose = mc.pose(sq.id, alphaV) ?? { x: sq.x, z: sq.z };
      const p = this.render.worldToScreen(pose.x, pose.z, 1.9);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    }
    for (const [id, el] of this.labels) {
      if (!seen.has(id)) { el.remove(); this.labels.delete(id); }
    }
  }

  dispose(): void {
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.labels.clear();
  }
}
