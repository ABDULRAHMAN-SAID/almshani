// غرفة المباراة — الخادم الحاكم: يشغّل المحاكاة المشتركة نفسها، يصدّق النوايا،
// ويبث مدخلات التكّات المرتّبة التي يخطو بها كل عميل محاكاته المحلية (نتيجة مطابقة بتاً).
import {
  createMatch, step, hashState, createBot, botThink,
  type SimContext, type SimState, type Command, type TickInput, type PlayerIx, type BotState
} from '../../shared/simulation/src/index';
import type { MatchInfo } from '../../shared/protocol/src/messages';

export interface Seat {
  token: string;
  name: string;
  isBot: boolean;
  send: ((msg: unknown) => void) | null;   // null = منقطع
  pendingIntents: Command[];
  lastHash: { tick: number; hash: number } | null;
  disconnectedAtMs: number;
}

const RECONNECT_MS = 30_000;
const HASH_EVERY = 100;

export class MatchRoom {
  readonly id: string;
  readonly seed: number;
  readonly ctx: SimContext;
  readonly seats: [Seat, Seat];
  readonly decks: [string[], string[]];
  readonly unitLevels: [Record<string, number>, Record<string, number>];
  readonly tickMs: number;
  st: SimState;
  log: TickInput[] = [];                    // سجل الأوامر = الإعادة الحتمية
  hashes = new Map<number, number>();
  bots: (BotState | null)[] = [null, null];
  private timer: ReturnType<typeof setInterval> | null = null;
  private batch: TickInput[] = [];
  onEnd: ((room: MatchRoom) => void) | null = null;
  desyncs = 0;

  constructor(id: string, ctx: SimContext, seed: number, seats: [Seat, Seat], decks: [string[], string[]],
              unitLevels: [Record<string, number>, Record<string, number>], tickMs: number) {
    this.id = id; this.ctx = ctx; this.seed = seed; this.seats = seats; this.decks = decks;
    this.unitLevels = unitLevels;
    this.tickMs = tickMs;
    this.st = createMatch(ctx, seed, [
      { name: seats[0].name, isBot: seats[0].isBot, deck: decks[0], unitLevels: unitLevels[0] },
      { name: seats[1].name, isBot: seats[1].isBot, deck: decks[1], unitLevels: unitLevels[1] }
    ]);
    for (let p = 0; p < 2; p++) if (seats[p].isBot) this.bots[p] = createBot(seed * 17 + p);
  }

  info(youAre: PlayerIx): MatchInfo {
    return {
      matchId: this.id, seed: this.seed, youAre, arena: this.ctx.arena.id,
      players: this.seats.map(s => ({ name: s.name, isBot: s.isBot })),
      decks: this.decks, unitLevels: this.unitLevels, tickMs: this.tickMs
    };
  }

  start(): void {
    for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
      this.seats[p].send?.({ t: 'matchStart', info: this.info(p) });
    }
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  intent(player: PlayerIx, cmd: Command): void {
    // الهوية من المقعد لا من الرسالة — العميل لا يستطيع انتحال الخصم
    (cmd as { player: PlayerIx }).player = player;
    this.seats[player].pendingIntents.push(cmd);
  }

  hashReport(player: PlayerIx, tick: number, hash: number): void {
    const server = this.hashes.get(tick);
    if (server !== undefined && server !== hash) {
      this.desyncs++;
      this.seats[player].send?.({ t: 'desync', tick });
      console.error(`[match ${this.id}] DESYNC p${player} tick=${tick} client=${hash} server=${server}`);
    }
  }

  setConnection(player: PlayerIx, send: ((m: unknown) => void) | null): void {
    this.seats[player].send = send;
    this.seats[player].disconnectedAtMs = send ? 0 : Date.now();
    const other = this.seats[1 - player];
    other.send?.({ t: 'opponentConnection', connected: !!send });
    if (send) {
      send({ t: 'rejoinState', info: this.info(player as PlayerIx), log: this.log.filter(l => l.commands.length > 0), tickNow: this.st.tick });
    }
  }

  private tick(): void {
    if (this.st.phase === 'ended') return;
    const commands: Command[] = [];
    for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
      const seat = this.seats[p];
      if (this.bots[p]) {
        commands.push(...botThink(this.bots[p]!, this.st, this.ctx, p));
      } else {
        commands.push(...seat.pendingIntents.splice(0));
        // مقعد منقطع تجاوز مهلة العودة ⟹ انسحاب حكمي
        if (!seat.send && !seat.isBot && seat.disconnectedAtMs > 0 &&
            Date.now() - seat.disconnectedAtMs > RECONNECT_MS) {
          commands.push({ type: 'surrender', player: p });
          if (this.st.result === null) {
            // سيُسجَّل السبب انسحاباً؛ نميّزه انقطاعاً في النتيجة النهائية أدناه
            seat.disconnectedAtMs = -1;
          }
        }
      }
    }
    const input: TickInput = { tick: this.st.tick, commands };
    this.log.push(input);
    step(this.st, this.ctx, commands);
    if (this.st.tick % HASH_EVERY === 0) {
      this.hashes.set(this.st.tick, hashState(this.st));
      if (this.hashes.size > 40) this.hashes.delete(this.st.tick - HASH_EVERY * 40);
    }
    this.batch.push(input);
    // بث كل تكّتين (100ms) لخفض الرسائل — الترتيب محفوظ
    if (this.batch.length >= 2 || (this.st.phase as string) === 'ended') {
      const msg = { t: 'ticks', inputs: this.batch.splice(0) };
      for (const s of this.seats) s.send?.(msg);
    }
    if ((this.st.phase as string) === 'ended') this.finish();
  }

  private finish(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const res = this.st.result!;
    if (res.reason === 'surrender') {
      const loser = (1 - res.winner) as PlayerIx;
      if (this.seats[loser].disconnectedAtMs === -1) res.reason = 'timeout_forfeit';
    }
    this.onEnd?.(this);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
