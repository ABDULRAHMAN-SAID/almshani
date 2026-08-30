// إدخال المعركة: سحب شارة → شبح → نية نشر · نقرة فرقة ثم نقرة أرض → Rally ·
// زر المهارة ثم نقرة → وابل. الخادم هو المصدّق النهائي؛ الفحص المحلي للمعاينة فقط.
import { deployValid, TICKS_PER_SEC } from '../../../shared/simulation/src/index';
import type { MatchClient } from './game';
import type { BattleRender } from './render';
import type { Net } from '../net';

export class BattleInput {
  private dragSlot = -1;
  private dragRangeMm = 0;
  private dragColor = 0xd8b04a;
  private dragPos: { x: number; z: number } | null = null;
  private selected = -1;
  private skillArmed = false;

  constructor(
    private mc: MatchClient,
    private render: BattleRender,
    private net: Net,
    private canvas: HTMLCanvasElement
  ) {
    canvas.addEventListener('pointerdown', e => this.tap(e));
    addEventListener('pointermove', e => this.move(e));
    addEventListener('pointerup', e => this.up(e));
  }

  startSlotDrag(slot: number, ev: PointerEvent): void {
    this.dragSlot = slot;
    this.skillArmed = false;
    const u = this.mc.ctx.units[this.mc.info.decks[this.mc.you][slot]];
    this.dragRangeMm = u ? u.rangeMm : 0;
    this.dragColor = u
      ? (u.healCentiPerTick > 0 ? 0x9fb86a : u.slowMill > 0 ? 0x9fd0e8 : (u.role === 'ranged' || u.role === 'siege') ? 0xd8b04a : 0x8fb2dd)
      : 0xd8b04a;
    this.move(ev);
  }

  armSkill(): void {
    this.skillArmed = true;
    this.selected = -1;
    this.render.selectSquad(null);
  }

  private move(e: PointerEvent): void {
    if (this.dragSlot < 0) return;
    const w = this.render.screenToWorld(e.clientX, e.clientY);
    this.dragPos = w;
    if (w) {
      const ok = deployValid(this.mc.st, this.mc.ctx, this.mc.you, w.x, w.z);
      this.render.setGhost(w.x, w.z, ok, this.dragRangeMm, this.dragColor);
    } else this.render.setGhost(null, null);
  }

  private up(e: PointerEvent): void {
    if (this.dragSlot < 0) return;
    const slot = this.dragSlot;
    this.dragSlot = -1;
    this.render.setGhost(null, null);
    const w = this.render.screenToWorld(e.clientX, e.clientY) ?? this.dragPos;
    if (!w) return;
    if (deployValid(this.mc.st, this.mc.ctx, this.mc.you, w.x, w.z)) {
      this.net.send({ t: 'intent', cmd: { type: 'deploy', player: this.mc.you, slot, x: w.x, z: w.z } });
    }
  }

  private tap(e: PointerEvent): void {
    if (this.dragSlot >= 0) return;
    const w = this.render.screenToWorld(e.clientX, e.clientY);
    if (!w) return;
    if (this.skillArmed) {
      this.skillArmed = false;
      this.net.send({ t: 'intent', cmd: { type: 'skill', player: this.mc.you, x: w.x, z: w.z } });
      return;
    }
    // فرقة لي قرب النقرة؟ اختيار — وإلا Rally للفرقة المختارة
    let nearest = -1, nd = 2500;
    for (const sq of this.mc.st.squads) {
      if (sq.player !== this.mc.you) continue;
      const d = Math.hypot(sq.x - w.x, sq.z - w.z);
      if (d < nd) { nd = d; nearest = sq.id; }
    }
    if (nearest >= 0) {
      this.selected = this.selected === nearest ? -1 : nearest;
      this.render.selectSquad(this.selected >= 0 ? this.selected : null);
    } else if (this.selected >= 0) {
      const sq = this.mc.st.squads.find(s => s.id === this.selected);
      if (sq && this.mc.st.tick >= sq.rallyReadyTick) {
        this.net.send({ t: 'intent', cmd: { type: 'rally', player: this.mc.you, squadId: this.selected, x: w.x, z: w.z } });
        this.render.spawnFx(w.x, w.z, 0x6d8db4, 1.5);
      }
      this.selected = -1;
      this.render.selectSquad(null);
    }
    void TICKS_PER_SEC;
  }
}
