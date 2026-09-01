// عقد الشبكة لتحدّي — العميل يرسل ادّعاءات ونوايا، والخادم يملك الحقيقة ويردّ بها.
// كل رسالة عميل قد تحمل rid (معرّف طلب) فيعيده الخادم في الردّ لمطابقة الوعود.

export type GameId = 'knowledge' | 'carrom' | 'uno' | 'mafia' | 'drawing' | 'outsider';
export type Mode = 'ranked' | 'casual' | 'room' | 'bot' | 'pass' | 'training';

/** ملفّ تصنيف لعبة واحدة — الشكل نفسه الذي يستعمله العميل (src/progression/rank.js) */
export interface RankProfile {
  gameId: string; seasonId: number;
  placed: boolean; placementDone: number; placementWins: number;
  tier: number; div: number; rp: number; mmr: number; protect: number;
  seasonBest: { tier: number; div: number };
  wins: number; losses: number; gamesPlayed: number; winStreak: number; bestStreak: number;
  masteryXp: number; lastPlayedAt: number; seen: string[];
}

export interface CloudSave { t: number; blob: Record<string, unknown> }

/** ما يقدّمه اللاعب عن مباراة — ادّعاء يُفحص لا حقيقة */
export interface ResultReport {
  matchId: string;
  gameId: GameId;
  mode: Mode;
  /** نتيجتي أنا، بشكل نموذج حساب اللعبة (winLoss/placement/teamResult/roundsAggregate) */
  result: Record<string, unknown>;
  /** حسابات المشاركين كلّهم (أنا ضمنهم) — الخادم يشترط تقارير الجميع في المصنّف */
  participants: string[];
}

export type ClientMsg =
  | { t: 'hello'; rid?: string; token?: string; name?: string }
  | { t: 'setName'; rid?: string; name: string }
  | { t: 'saveCloud'; rid?: string; save: CloudSave }
  | { t: 'loadCloud'; rid?: string }
  | { t: 'submitResult'; rid?: string; report: ResultReport }
  | { t: 'leaderboard'; rid?: string; gameId: GameId; limit?: number }
  | { t: 'profile'; rid?: string; id?: string }
  // ── الغرف: تتابع حضور وبثّ لحظات — نفس واجهة غرفة الأرتيفاكت ──
  | { t: 'presence'; patch: Record<string, unknown> }
  | { t: 'emit'; topic: string; data?: unknown };

export interface PeerView {
  peer: string;                 // معرّف الاتصال (يتغيّر بكل اتصال)
  by: string;                   // معرّف الحساب الثابت
  kind: 'viewer';
  presence: Record<string, unknown>;
}

export interface LeaderRow { id: string; name: string; tier: number; div: number; rp: number; wins: number; losses: number; placed: boolean }

export type ServerMsg =
  | { t: 'welcome'; rid?: string; token: string; id: string; name: string; peer: string; ranks: Record<string, RankProfile>; seasonId: number; hasCloud: boolean }
  | { t: 'nameSet'; rid?: string; name: string }
  | { t: 'cloudSaved'; rid?: string; t2: number }
  | { t: 'cloud'; rid?: string; save: CloudSave | null; ranks: Record<string, RankProfile> }
  | { t: 'result'; rid?: string; status: 'applied' | 'pending' | 'disputed' | 'ignored' | 'rejected'; reason: string; profile: RankProfile | null; delta: Record<string, unknown> | null }
  | { t: 'resultFinal'; matchId: string; status: 'applied' | 'disputed' | 'incomplete'; profile: RankProfile | null; delta: Record<string, unknown> | null }
  | { t: 'leaderboard'; rid?: string; gameId: GameId; rows: LeaderRow[]; me: { rank: number; row: LeaderRow } | null; total: number }
  | { t: 'profileView'; rid?: string; id: string; name: string; ranks: Record<string, RankProfile> }
  | { t: 'peers'; list: PeerView[] }
  | { t: 'msg'; topic: string; data?: unknown; from: { peer: string; by: string } }
  | { t: 'error'; rid?: string; code: string; message?: string };
