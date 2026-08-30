// متحكم المباراة في العميل: يشغّل نسخة المحاكاة المشتركة محلياً ويخطوها
// حصراً بمدخلات التكّات الواردة من الخادم — فكل العملاء والخادم على مجرى واحد بتاً.
import {
  buildUnits, buildArena, createMatch, step, hashState,
  type SimContext, type SimState, type SimEvent, type TickInput, type PlayerIx
} from '../../../shared/simulation/src/index';
import { UNIT_DEFS, ARENAS, COMMANDERS } from '../../../shared/definitions/index';
import type { MatchInfo } from '../../../shared/protocol/src/messages';
import type { Net } from '../net';

const HASH_EVERY = 100;

export interface SquadPose { x: number; z: number; }

export class MatchClient {
  readonly ctx: SimContext;
  readonly info: MatchInfo;
  readonly you: PlayerIx;
  st: SimState;
  prev = new Map<number, SquadPose>();
  curr = new Map<number, SquadPose>();
  private queue: TickInput[] = [];
  private lastStepMs = 0;
  onEvents: ((evs: SimEvent[]) => void) | null = null;
  ended = false;

  constructor(info: MatchInfo, private net: Net) {
    this.info = info;
    this.you = info.youAre;
    this.ctx = {
      units: buildUnits(UNIT_DEFS),
      arena: buildArena(ARENAS[info.arena] ?? ARENAS.border_fort, COMMANDERS.sera)
    };
    this.st = createMatch(this.ctx, info.seed, [
      { name: info.players[0].name, isBot: info.players[0].isBot, deck: info.decks[0] },
      { name: info.players[1].name, isBot: info.players[1].isBot, deck: info.decks[1] }
    ]);
    this.snapshot(this.prev); this.snapshot(this.curr);
  }

  pushTicks(inputs: TickInput[]): void {
    for (const i of inputs) this.queue.push(i);
  }

  // إعادة اتصال: تقديم سريع من سجل الأوامر حتى تكّة الخادم
  fastForward(log: TickInput[], tickNow: number): void {
    const byTick = new Map<number, TickInput>();
    for (const l of log) byTick.set(l.tick, l);
    while (this.st.tick < tickNow) {
      const input = byTick.get(this.st.tick);
      step(this.st, this.ctx, input ? input.commands : []);
    }
    this.snapshot(this.prev); this.snapshot(this.curr);
    this.queue = [];
  }

  // يُستدعى كل إطار: يطبّق التكّات المستحقة بإيقاع الخادم مع بقاء مخزون ~2 للاستيفاء
  update(nowMs: number): void {
    let guard = 0;
    while (this.queue.length > 0 && guard++ < 40) {
      const due = nowMs - this.lastStepMs >= this.info.tickMs;
      const backlog = this.queue.length > 4;
      if (!due && !backlog) break;
      const input = this.queue.shift()!;
      if (input.tick !== this.st.tick) {
        // فجوة غير متوقعة — الخادم سيعيد الحالة عبر rejoinState عند الحاجة
        if (input.tick < this.st.tick) continue;
      }
      this.snapshot(this.prev);
      const evs = step(this.st, this.ctx, input.commands);
      this.snapshot(this.curr);
      this.lastStepMs = backlog ? nowMs : Math.max(this.lastStepMs + this.info.tickMs, nowMs - this.info.tickMs);
      if (this.st.tick % HASH_EVERY === 0) {
        this.net.send({ t: 'hashReport', tick: this.st.tick, hash: hashState(this.st) });
      }
      if (evs.length) this.onEvents?.(evs);
      if (this.st.phase === 'ended') { this.ended = true; break; }
    }
  }

  // معامل الاستيفاء بين آخر تكّتين للرسم الناعم
  alpha(nowMs: number): number {
    const a = (nowMs - this.lastStepMs) / this.info.tickMs;
    return a < 0 ? 0 : a > 1 ? 1 : a;
  }

  pose(id: number, alphaV: number): SquadPose | null {
    const c = this.curr.get(id);
    if (!c) return null;
    const p = this.prev.get(id) ?? c;
    return { x: p.x + (c.x - p.x) * alphaV, z: p.z + (c.z - p.z) * alphaV };
  }

  private snapshot(into: Map<number, SquadPose>): void {
    into.clear();
    for (const s of this.st.squads) into.set(s.id, { x: s.x, z: s.z });
  }
}
