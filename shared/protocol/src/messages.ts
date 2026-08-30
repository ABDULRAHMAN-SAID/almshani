// عقد الشبكة بين العميل والخادم — العميل يرسل نوايا فقط، والخادم يبث مدخلات تكّات مرتّبة.
import type { Command, MatchResult, TickInput } from '../../simulation/src/types';

// ── عميل → خادم ──
export type ClientMsg =
  | { t: 'hello'; token?: string; name?: string }
  | { t: 'setDeck'; deck: string[] }
  | { t: 'queue' }
  | { t: 'cancelQueue' }
  | { t: 'intent'; cmd: Command }          // الخادم يختم بالتكّة ويصدّق
  | { t: 'hashReport'; tick: number; hash: number }
  | { t: 'leaveResult' };                  // مغادرة شاشة النتيجة

// ── خادم → عميل ──
export interface MatchInfo {
  matchId: string;
  seed: number;
  youAre: 0 | 1;
  arena: string;
  players: { name: string; isBot: boolean }[];
  decks: [string[], string[]];
  tickMs: number;
}

export type ServerMsg =
  | { t: 'welcome'; token: string; name: string; deck: string[]; wins: number; losses: number }
  | { t: 'queued' }
  | { t: 'queueCancelled' }
  | { t: 'deckSaved'; deck: string[] }
  | { t: 'matchStart'; info: MatchInfo }
  | { t: 'ticks'; inputs: TickInput[] }    // مرتّبة؛ العميل يخطو محاكاته بها حرفياً
  | { t: 'matchEnd'; result: MatchResult; scoreMilli: [number, number]; hqHpCenti: [number, number]; wins: number; losses: number }
  | { t: 'rejoinState'; info: MatchInfo; log: TickInput[]; tickNow: number }
  | { t: 'opponentConnection'; connected: boolean }
  | { t: 'desync'; tick: number }
  | { t: 'error'; code: string };
