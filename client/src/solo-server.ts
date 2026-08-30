// النسخة الفردية (Solo): منطق الخادم نفسه يعمل داخل الصفحة — نفس وحدة الإمبراطورية
// ونفس غرفة المباراة الحاكمة، ضد بوت معلَن. التقدم يُحفظ في متصفح اللاعب.
// (الأونلاين الحقيقي بين البشر يبقى عبر الخادم الفعلي — هذه نسخة تجربة ونشر سريع.)
import { UNIT_DEFS, ARENAS, COMMANDERS, DEFAULT_DECK } from '../../shared/definitions/index';
import { buildUnits, buildArena } from '../../shared/simulation/src/index';
import {
  newBase, baseView, startUpgrade, trainUnit, claimMission, openFreeChest,
  battleReward, unlockedUnits, collectBuilding, sanitizeBase, sanitizeDeck, type BaseState
} from '../../server/src/empire';
import { MatchRoom, type Seat } from '../../server/src/match';
import type { ClientMsg, ServerMsg } from '../../shared/protocol/src/messages';

const STORE_KEY = 'qh2_solo_account';
// مهمة «وادي الحشود» في النسخة الفردية تفتح نسخة الوادي المنشورة
const VALLEY_URL = 'https://claude.ai/code/artifact/a4e246cd-f062-4e56-816d-447b62855732';

interface SoloAccount {
  name: string;
  deck: string[];
  wins: number;
  losses: number;
  base: BaseState;
}

export class LocalServer {
  private acc: SoloAccount;
  private ctx = {
    units: buildUnits(UNIT_DEFS),
    arena: buildArena(ARENAS.border_fort, COMMANDERS.sera)
  };
  private room: MatchRoom | null = null;
  private queueTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private deliver: (m: ServerMsg) => void) {
    this.acc = this.load() ?? {
      name: 'القائد', deck: DEFAULT_DECK.slice(), wins: 0, losses: 0, base: newBase(Date.now())
    };
  }

  private load(): SoloAccount | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      // حساب محفوظ من إصدار أقدم في متصفح اللاعب: رحّله بدل أن ينهار الكود الجديد عليه
      const acc = JSON.parse(raw) as SoloAccount;
      acc.name = typeof acc.name === 'string' && acc.name.trim() ? acc.name : 'القائد';
      acc.wins = acc.wins | 0;
      acc.losses = acc.losses | 0;
      acc.base = sanitizeBase(acc.base, Date.now());
      acc.deck = sanitizeDeck(acc.deck, acc.base);
      return acc;
    } catch { return null; }
  }

  private save(): void {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.acc)); } catch { /* خاص */ }
  }

  private view(): any {
    const v = baseView(this.acc.base, Date.now());
    for (const m of v.missions) if (m.openUrl) m.openUrl = VALLEY_URL;
    return v;
  }

  private sendBase(err: string | null = null): void {
    if (err) this.deliver({ t: 'baseError', code: err });
    this.deliver({ t: 'baseState', base: this.view() });
    if (!err) this.save();
  }

  handle(msg: ClientMsg): void {
    switch (msg.t) {
      case 'hello': {
        const clean = (msg.name ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, 20);
        if (clean.length >= 2) { this.acc.name = clean; this.save(); }
        this.deliver({
          t: 'welcome', token: 'solo', name: this.acc.name,
          deck: this.acc.deck, wins: this.acc.wins, losses: this.acc.losses
        });
        this.sendBase();
        break;
      }
      case 'setDeck': {
        const deck = Array.isArray(msg.deck) ? msg.deck.map(String) : [];
        const unlocked = unlockedUnits(this.acc.base);
        if (deck.length !== 8 || new Set(deck).size !== 8 ||
            deck.some(u => !UNIT_DEFS[u] || !unlocked.includes(u))) {
          this.deliver({ t: 'error', code: 'deck_units' });
          break;
        }
        this.acc.deck = deck;
        this.deliver({ t: 'deckSaved', deck });
        this.save();
        break;
      }
      case 'queue': {
        if (this.room && this.room.st.phase !== 'ended') break;
        this.deliver({ t: 'queued' });
        this.queueTimer = setTimeout(() => this.startBotMatch(), 700);
        break;
      }
      case 'cancelQueue':
        if (this.queueTimer) { clearTimeout(this.queueTimer); this.queueTimer = null; }
        this.deliver({ t: 'queueCancelled' });
        break;
      case 'intent':
        if (this.room && msg.cmd && typeof msg.cmd.type === 'string') this.room.intent(0, msg.cmd);
        break;
      case 'hashReport':
        this.room?.hashReport(0, msg.tick | 0, msg.hash >>> 0);
        break;
      case 'leaveResult':
        if (this.room && this.room.st.phase === 'ended') this.room = null;
        break;
      case 'base': this.sendBase(); break;
      case 'upgradeBuilding': this.sendBase(startUpgrade(this.acc.base, String(msg.id), Date.now())); break;
      case 'trainUnit': this.sendBase(trainUnit(this.acc.base, String(msg.id), Date.now())); break;
      case 'claimMission': this.sendBase(claimMission(this.acc.base, String(msg.id), Date.now())); break;
      case 'freeChest': this.sendBase(openFreeChest(this.acc.base, Date.now())); break;
      case 'collectBuilding': this.sendBase(collectBuilding(this.acc.base, String(msg.id), Date.now())); break;
    }
  }

  private startBotMatch(): void {
    this.queueTimer = null;
    const seats: [Seat, Seat] = [
      { token: 'solo', name: this.acc.name, isBot: false, send: m => this.deliver(m as ServerMsg), pendingIntents: [], lastHash: null, disconnectedAtMs: 0 },
      { token: 'bot', name: 'بوت التدريب', isBot: true, send: null, pendingIntents: [], lastHash: null, disconnectedAtMs: 0 }
    ];
    const decks: [string[], string[]] = [this.acc.deck.slice(), DEFAULT_DECK.slice()];
    const levels: [Record<string, number>, Record<string, number>] = [{ ...this.acc.base.unitLevels }, {}];
    const room = new MatchRoom('solo', this.ctx, (Date.now() ^ 0x9e3779b9) | 0, seats, decks, levels, 50);
    this.room = room;
    room.onEnd = r => {
      const res = r.st.result!;
      const won = res.winner === 0;
      if (won) this.acc.wins++;
      else if (res.winner !== -1) this.acc.losses++;
      const reward = battleReward(this.acc.base, won, Date.now());
      this.deliver({
        t: 'matchEnd', result: res,
        scoreMilli: [r.st.players[0].scoreMilli, r.st.players[1].scoreMilli],
        hqHpCenti: [r.st.players[0].hqHpCenti, r.st.players[1].hqHpCenti],
        wins: this.acc.wins, losses: this.acc.losses, reward
      });
      this.save();
    };
    room.start();
  }
}
