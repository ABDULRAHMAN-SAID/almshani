// الردهة: حسابات الضيوف، حفظ التشكيلة، الطابور، وإنشاء المباريات.
// شريحة عمودية: التخزين في الذاكرة — الإنتاج يستبدله بـ Nakama + PostgreSQL
// (docs/ONLINE_ARCHITECTURE.md §4/§7) دون تغيير هذا العقد.
import { randomBytes } from 'node:crypto';
import { UNIT_DEFS, DEFAULT_DECK } from '../../shared/definitions/index';
import type { SimContext, PlayerIx, Command } from '../../shared/simulation/src/index';
import { MatchRoom, type Seat } from './match';
import {
  newBase, baseView, startUpgrade, trainUnit, claimMission, openFreeChest,
  battleReward, unlockedUnits, type BaseState
} from './empire';
import { loadState, saveStateSoon, saveNow } from './store';

export interface Account {
  token: string;
  name: string;
  deck: string[];
  wins: number;
  losses: number;
  base: BaseState;
}

export interface Session {
  account: Account;
  send: (msg: unknown) => void;
  inQueueSinceMs: number;   // 0 = ليس في الطابور
  match: MatchRoom | null;
  seatIx: PlayerIx | null;
}

const QUEUE_BOT_MS = parseInt(process.env.QUEUE_BOT_MS ?? '6000', 10);
const TICK_MS = parseInt(process.env.MATCH_TICK_MS ?? '50', 10);
const BOT_NAMES = ['بوت التدريب', 'بوت الحراسة', 'بوت الميدان'];

export class Lobby {
  private accounts = new Map<string, Account>();
  private sessions = new Set<Session>();
  private queue: Session[] = [];
  private matches = new Map<string, MatchRoom>();
  private nextMatch = 1;
  private botTimer: ReturnType<typeof setInterval>;

  constructor(private ctx: SimContext) {
    this.botTimer = setInterval(() => this.fillWithBots(), 1000);
    const saved = loadState<{ accounts: Account[] }>();
    if (saved?.accounts) {
      for (const a of saved.accounts) this.accounts.set(a.token, a);
      console.log(`store: حُمّل ${saved.accounts.length} حساباً`);
    }
  }

  private persist(): void {
    saveStateSoon(() => ({ accounts: [...this.accounts.values()] }));
  }

  flush(): void {
    saveNow({ accounts: [...this.accounts.values()] });
  }

  hello(send: (m: unknown) => void, token?: string, name?: string): Session {
    let account = token ? this.accounts.get(token) : undefined;
    if (!account) {
      account = {
        token: randomBytes(12).toString('hex'),
        name: sanitizeName(name) ?? `قائد-${this.accounts.size + 1}`,
        deck: DEFAULT_DECK.slice(),
        wins: 0,
        losses: 0,
        base: newBase(Date.now())
      };
      this.accounts.set(account.token, account);
    } else if (name && sanitizeName(name)) {
      account.name = sanitizeName(name)!;
    }
    // جلسة واحدة نشطة للحساب: الدخول الجديد يفصل القديم
    for (const s of this.sessions) {
      if (s.account === account) this.drop(s);
    }
    const session: Session = { account, send, inQueueSinceMs: 0, match: null, seatIx: null };
    this.sessions.add(session);
    send({ t: 'welcome', token: account.token, name: account.name, deck: account.deck, wins: account.wins, losses: account.losses });
    send({ t: 'baseState', base: baseView(account.base, Date.now()) });
    this.persist();
    // مباراة جارية لهذا الحساب؟ إعادة اتصال
    for (const room of this.matches.values()) {
      for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
        if (room.seats[p].token === account.token && room.st.phase !== 'ended') {
          session.match = room; session.seatIx = p;
          room.setConnection(p, send);
        }
      }
    }
    return session;
  }

  setDeck(s: Session, deck: unknown): void {
    if (!Array.isArray(deck) || deck.length !== 7) return s.send({ t: 'error', code: 'deck_size' });
    const clean = deck.map(String);
    const unlocked = unlockedUnits(s.account.base);
    if (new Set(clean).size !== 7 || clean.some(u => !UNIT_DEFS[u] || !unlocked.includes(u))) {
      return s.send({ t: 'error', code: 'deck_units' });
    }
    s.account.deck = clean;
    s.send({ t: 'deckSaved', deck: clean });
    this.persist();
  }

  enqueue(s: Session): void {
    if (s.match || s.inQueueSinceMs) return;
    s.inQueueSinceMs = Date.now();
    this.queue.push(s);
    s.send({ t: 'queued' });
    this.tryMatch();
  }

  cancelQueue(s: Session): void {
    this.queue = this.queue.filter(q => q !== s);
    s.inQueueSinceMs = 0;
    s.send({ t: 'queueCancelled' });
  }

  intent(s: Session, cmd: Command): void {
    if (s.match && s.seatIx !== null) s.match.intent(s.seatIx, cmd);
  }

  hashReport(s: Session, tick: number, hash: number): void {
    if (s.match && s.seatIx !== null) s.match.hashReport(s.seatIx, tick, hash);
  }

  leaveResult(s: Session): void {
    if (s.match && s.match.st.phase === 'ended') { s.match = null; s.seatIx = null; }
  }

  // ── أوامر الإمبراطورية: الخادم ينفّذ ويعيد اللقطة أو خطأً ──
  private baseAction(s: Session, err: string | null): void {
    if (err) s.send({ t: 'baseError', code: err });
    s.send({ t: 'baseState', base: baseView(s.account.base, Date.now()) });
    if (!err) this.persist();
  }

  sendBase(s: Session): void { this.baseAction(s, null); }
  upgradeBuilding(s: Session, id: string): void { this.baseAction(s, startUpgrade(s.account.base, String(id), Date.now())); }
  trainUnit(s: Session, id: string): void { this.baseAction(s, trainUnit(s.account.base, String(id), Date.now())); }
  claimMission(s: Session, id: string): void { this.baseAction(s, claimMission(s.account.base, String(id), Date.now())); }
  freeChest(s: Session): void { this.baseAction(s, openFreeChest(s.account.base, Date.now())); }

  drop(s: Session): void {
    this.sessions.delete(s);
    this.queue = this.queue.filter(q => q !== s);
    if (s.match && s.seatIx !== null && s.match.st.phase !== 'ended') {
      s.match.setConnection(s.seatIx, null); // مهلة عودة 30 ثانية داخل الغرفة
    }
  }

  private tryMatch(): void {
    while (this.queue.length >= 2) {
      const a = this.queue.shift()!, b = this.queue.shift()!;
      a.inQueueSinceMs = 0; b.inQueueSinceMs = 0;
      this.createMatch(a, b);
    }
  }

  private fillWithBots(): void {
    const now = Date.now();
    for (const s of this.queue.slice()) {
      if (now - s.inQueueSinceMs >= QUEUE_BOT_MS) {
        this.queue = this.queue.filter(q => q !== s);
        s.inQueueSinceMs = 0;
        this.createMatch(s, null);
      }
    }
  }

  private createMatch(a: Session, b: Session | null): void {
    const id = `m${this.nextMatch++}`;
    const seed = (Date.now() ^ (this.nextMatch * 0x9e3779b9)) | 0;
    const seatOf = (s: Session): Seat => ({
      token: s.account.token, name: s.account.name, isBot: false,
      send: s.send, pendingIntents: [], lastHash: null, disconnectedAtMs: 0
    });
    const botSeat: Seat = {
      token: `bot-${id}`, name: BOT_NAMES[this.nextMatch % BOT_NAMES.length], isBot: true,
      send: null, pendingIntents: [], lastHash: null, disconnectedAtMs: 0
    };
    const seats: [Seat, Seat] = [seatOf(a), b ? seatOf(b) : botSeat];
    const decks: [string[], string[]] = [a.account.deck.slice(), (b ? b.account.deck : DEFAULT_DECK).slice()];
    const levels: [Record<string, number>, Record<string, number>] =
      [{ ...a.account.base.unitLevels }, b ? { ...b.account.base.unitLevels } : {}];
    const room = new MatchRoom(id, this.ctx, seed, seats, decks, levels, TICK_MS);
    this.matches.set(id, room);
    a.match = room; a.seatIx = 0;
    if (b) { b.match = room; b.seatIx = 1; }
    room.onEnd = r => this.onMatchEnd(r);
    room.start();
  }

  private onMatchEnd(room: MatchRoom): void {
    const res = room.st.result!;
    for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
      const seat = room.seats[p];
      const account = this.accounts.get(seat.token);
      if (account) {
        if (res.winner === p) account.wins++;
        else if (res.winner !== -1) account.losses++;
        const reward = battleReward(account.base, res.winner === p, Date.now());
        seat.send?.({
          t: 'matchEnd', result: res,
          scoreMilli: [room.st.players[0].scoreMilli, room.st.players[1].scoreMilli],
          hqHpCenti: [room.st.players[0].hqHpCenti, room.st.players[1].hqHpCenti],
          wins: account.wins, losses: account.losses, reward
        });
      }
    }
    this.persist();
    // سجل الأوامر يبقى في الذاكرة (بذرة نظام الإعادات) ثم يُطرح بعد 10 دقائق
    setTimeout(() => { this.matches.delete(room.id); }, 10 * 60 * 1000).unref?.();
  }

  shutdown(): void {
    clearInterval(this.botTimer);
    for (const room of this.matches.values()) room.stop();
    this.flush();
  }
}

function sanitizeName(name?: string): string | null {
  if (!name) return null;
  const clean = name.replace(/[<>&"'`]/g, '').trim().slice(0, 20);
  return clean.length >= 2 ? clean : null;
}
