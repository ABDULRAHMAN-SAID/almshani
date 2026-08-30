// HUD المعركة — يد 4 من دورة الثمانية، نقاط القيادة، البوابة والقلب، راية القيادة.
import { cpCap, handOf, membersAlive, TICKS_PER_SEC, type SimEvent } from '../../../shared/simulation/src/index';
import type { MatchClient } from './game';
import type { BattleRender } from './render';
import { t, unitName, unitMark } from '../i18n';

export class BattleHud {
  private root: HTMLElement;
  private beads: HTMLElement[] = [];
  private cpnum!: HTMLElement;
  private slotsEl!: HTMLElement;
  private slotEls: HTMLElement[] = [];
  private handKey = '';
  private timer!: HTMLElement;
  private scoreFill!: HTMLElement;
  private hqFill: HTMLElement[] = [];
  private hqTxt: HTMLElement[] = [];
  private gateFill: HTMLElement[] = [];
  private skillBtn!: HTMLButtonElement;
  private flagBtn!: HTMLButtonElement;
  private toastEl!: HTMLElement;
  private labels = new Map<number, HTMLElement>();
  private toastTimer = 0;
  onSlotDrag: ((slot: number, ev: PointerEvent) => void) | null = null;
  onSkill: (() => void) | null = null;
  onFlag: (() => void) | null = null;
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
      <div class="hqbar foe"><div class="fill" style="width:100%"></div><span></span></div>
      <div class="gatebar foe"><div class="fill" style="width:100%"></div></div>
      <div class="gatebar mine"><div class="fill" style="width:100%"></div></div>
      <div class="hqbar mine"><div class="fill" style="width:100%"></div><span></span></div>
      <button id="skillbtn" disabled>${t('skill').replace('\n', '<br>')}</button>
      <button id="flagbtn" disabled>${t('flag_btn').replace('\n', '<br>')}</button>
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
    this.gateFill = [this.root.querySelector('.gatebar.mine .fill')!, this.root.querySelector('.gatebar.foe .fill')!];
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
    this.slotsEl = this.root.querySelector('#slots')!;
    this.buildSlots();
    this.skillBtn = this.root.querySelector('#skillbtn')!;
    this.skillBtn.addEventListener('click', () => this.onSkill?.());
    this.flagBtn = this.root.querySelector('#flagbtn')!;
    this.flagBtn.addEventListener('click', () => this.onFlag?.());
    this.root.querySelector('#surrender')!.addEventListener('click', () => this.onSurrender?.());
    this.root.hidden = false;
  }

  // اليد تتبدل مع الدورة — نبني الشارات عند تغيّر تركيبتها
  private buildSlots(): void {
    const P = this.mc.st.players[this.mc.you];
    const hand = handOf(P);
    const key = hand.join(',');
    if (key === this.handKey) return;
    this.handKey = key;
    this.slotsEl.innerHTML = '';
    this.slotEls = [];
    hand.forEach((deckIx, slot) => {
      const uid = P.deck[deckIx];
      const u = this.mc.ctx.units[uid];
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `<div class="med">${unitMark(uid)}</div><div class="cost">${u.cost}</div>`;
      el.title = unitName(uid);
      el.addEventListener('pointerdown', ev => { ev.preventDefault(); this.onSlotDrag?.(slot, ev); });
      this.slotsEl.appendChild(el);
      this.slotEls.push(el);
    });
    // الوحدة التالية في الدورة (معاينة صغيرة)
    if (P.order.length > 4) {
      const nextId = P.deck[P.order[4]];
      const nx = document.createElement('div');
      nx.className = 'slot next';
      nx.innerHTML = `<div class="med">${unitMark(nextId)}</div><div class="cost">${this.mc.ctx.units[nextId].cost}</div>`;
      nx.title = unitName(nextId);
      this.slotsEl.appendChild(nx);
    }
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
      if (e.t === 'gate_down') this.toast(e.player === this.mc.you ? t('gate_down_you') : t('gate_down_foe'));
      if (e.t === 'kill') this.render.spawnFx(e.x!, e.z!, e.player === this.mc.you ? 0xb25b28 : 0xd8c9a8, 2);
      if (e.t === 'skill') this.render.spawnFx(e.x!, e.z!, 0xa08339, 4);
      if (e.t === 'flag') this.render.spawnFx(e.x!, e.z!, 0x6d8db4, 2.5);
    }
  }

  update(): void {
    const mc = this.mc, st = mc.st, a = mc.ctx.arena;
    const P = st.players[mc.you];
    this.buildSlots();
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
    // خانات اليد: تعتيم غير المستطاع
    const hand = handOf(P);
    hand.forEach((deckIx, slot) => {
      const u = mc.ctx.units[P.deck[deckIx]];
      this.slotEls[slot]?.classList.toggle('poor', P.cp < u.cost);
    });
    // المهارة
    const chargeLeft = a.skillChargeTicks - st.tick;
    const skillReady = !P.skillUsed && chargeLeft <= 0;
    this.skillBtn.disabled = !skillReady;
    this.skillBtn.classList.toggle('ready', skillReady);
    if (P.skillUsed) this.skillBtn.textContent = '—';
    else if (chargeLeft > 0) this.skillBtn.textContent = String(Math.ceil(chargeLeft / TICKS_PER_SEC));
    else this.skillBtn.innerHTML = t('skill').replace('\n', '<br>');
    // راية القيادة
    const flagLeft = P.flagReadyTick - st.tick;
    const flagReady = flagLeft <= 0;
    this.flagBtn.disabled = !flagReady;
    this.flagBtn.classList.toggle('ready', flagReady);
    this.flagBtn.innerHTML = flagReady ? t('flag_btn').replace('\n', '<br>') : String(Math.ceil(flagLeft / TICKS_PER_SEC));
    // النقاط والبوابات والقلوب
    const my = st.players[mc.you], op = st.players[1 - mc.you];
    const total = my.scoreMilli + op.scoreMilli;
    this.scoreFill.style.width = `${total === 0 ? 50 : Math.round((my.scoreMilli / total) * 100)}%`;
    const pctH = (v: number) => `${Math.max(0, Math.round((v / a.hqHpCenti) * 100))}%`;
    const pctG = (v: number) => `${Math.max(0, Math.round((v / a.gateHpCenti) * 100))}%`;
    this.hqFill[0].style.width = pctH(my.hqHpCenti);
    this.hqFill[1].style.width = pctH(op.hqHpCenti);
    this.gateFill[0].style.width = pctG(my.gateHpCenti);
    this.gateFill[1].style.width = pctG(op.gateHpCenti);
    this.hqTxt[0].textContent = `${t('heart')} ${Math.ceil(my.hqHpCenti / 100)}`;
    this.hqTxt[1].textContent = `${t('heart')} ${Math.ceil(op.hqHpCenti / 100)}`;
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
      const frac = sq.hpCenti / (sq.memberHpCenti * u.size);
      el.classList.toggle('hurt', frac <= 0.66 && frac > 0.33);
      el.classList.toggle('crit', frac <= 0.33);
      const pose = mc.pose(sq.id, alphaV) ?? { x: sq.x, z: sq.z };
      const p = this.render.worldToScreen(pose.x, pose.z, u.flying ? 4.2 : 2.3);
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
