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

/** ادّعاء شراء: إيصال من المتجر — الخادم يسأل المتجر ويمنح من الكتالوج، ولا يصدّق الأرقام القادمة من الهاتف */
export type Platform = 'ios' | 'android' | 'test';
export interface PurchaseClaim { platform: Platform; productId: string; receipt: string; transactionId?: string }
export interface PurchaseGrant { gems: number; coins: number; wild: string | null; pass: boolean }
export interface PurchaseRec { txId: string; platform: Platform; productId: string; accountId: string; at: number; grant: PurchaseGrant }

export type ClientMsg =
  | { t: 'hello'; rid?: string; token?: string; name?: string; peer?: string }
  | { t: 'setEmail'; rid?: string; email: string }
  // ── هويّة الحساب: بريد مُثبَت برمز لمرّة واحدة، يستعيد الحساب على أيّ جهاز ──
  | { t: 'authStart'; rid?: string; email: string }
  | { t: 'authEmail'; rid?: string; email: string }
  | { t: 'authGoogle'; rid?: string; idToken: string }
  | { t: 'xferNew'; rid?: string }
  | { t: 'xferUse'; rid?: string; code: string }
  | { t: 'authVerify'; rid?: string; email: string; code: string }
  | { t: 'setName'; rid?: string; name: string }
  | { t: 'saveCloud'; rid?: string; save: CloudSave }
  | { t: 'loadCloud'; rid?: string }
  | { t: 'submitResult'; rid?: string; report: ResultReport }
  | { t: 'leaderboard'; rid?: string; gameId: GameId; limit?: number }
  | { t: 'profile'; rid?: string; id?: string }
  | { t: 'purchase'; rid?: string; claim: PurchaseClaim }
  | { t: 'purchases'; rid?: string }
  // ── الأصدقاء: بالمعرّف أو بمن قابلته في غرفة ──
  | { t: 'friends'; rid?: string }
  | { t: 'dm'; rid?: string; to: string; text: string }
  | { t: 'dmThread'; rid?: string; with: string }
  | { t: 'friendAdd'; rid?: string; id: string }   // معرّف كامل أو رمز صديق من ستّة محارف
  | { t: 'friendAccept'; rid?: string; id: string }
  | { t: 'friendRemove'; rid?: string; id: string }
  // ── تحدٍّ غير متزامن: يلعب الأوّل ثمانية أسئلة ويلعب الثاني نفسها متى شاء ──
  | { t: 'chalSend'; rid?: string; to: string; qs: string[]; sc: number; ms: number }
  | { t: 'chalList'; rid?: string }
  | { t: 'chalPlay'; rid?: string; id: string; sc: number; ms: number }
  // ── الغرف: تتابع حضور وبثّ لحظات — نفس واجهة غرفة الأرتيفاكت ──
  | { t: 'presence'; patch: Record<string, unknown> }
  | { t: 'emit'; topic: string; data?: unknown };

export interface FriendView { id: string; name: string; online: boolean; code?: string }

/** تحدٍّ واحد كما يراه الطرفان: mine=أنا المتحدِّي · qs معرّفات الأسئلة لا نصوصها */
export interface ChalView {
  id: string; mine: boolean; withId: string; withName: string;
  qs: string[]; myScore: number | null; theirScore: number | null;
  at: number; done: boolean; won: 'me' | 'them' | 'tie' | null; seen: boolean;
}

/** رسالة خاصّة واحدة: o=1 أنا أرسلتها، o=0 وصلتني */
export interface DmMsg { m: string; o: 0 | 1; at: number }

export interface PeerView {
  peer: string;                 // معرّف الاتصال (يتغيّر بكل اتصال)
  by: string;                   // معرّف الحساب الثابت
  kind: 'viewer';
  presence: Record<string, unknown>;
}

export interface LeaderRow { id: string; name: string; tier: number; div: number; rp: number; wins: number; losses: number; placed: boolean }

export type ServerMsg =
  | { t: 'emailSet'; rid?: string; email: string }
  | { t: 'authSent'; rid?: string; to: string; mode: 'live' | 'dev'; needCode?: boolean }
  | { t: 'xferCode'; rid?: string; code: string; exp: number }
  /** نجح التحقّق: إن حمل token فهو حساب آخر يتبنّاه هذا الجهاز (استعادة) */
  | { t: 'authOk'; rid?: string; email: string; restored: boolean; token: string; id: string; code: string; name: string; ranks: Record<string, RankProfile>; seasonId: number; hasCloud: boolean }
  | { t: 'welcome'; rid?: string; token: string; id: string; code: string; name: string; peer: string; ranks: Record<string, RankProfile>; seasonId: number; hasCloud: boolean;
      email?: string; emailOk?: boolean; signIn?: { google?: string; mail: boolean } }
  | { t: 'nameSet'; rid?: string; name: string }
  | { t: 'cloudSaved'; rid?: string; t2: number }
  | { t: 'cloud'; rid?: string; save: CloudSave | null; ranks: Record<string, RankProfile> }
  | { t: 'result'; rid?: string; status: 'applied' | 'pending' | 'disputed' | 'ignored' | 'rejected'; reason: string; profile: RankProfile | null; delta: Record<string, unknown> | null }
  | { t: 'resultFinal'; matchId: string; status: 'applied' | 'disputed' | 'incomplete'; profile: RankProfile | null; delta: Record<string, unknown> | null }
  | { t: 'leaderboard'; rid?: string; gameId: GameId; rows: LeaderRow[]; me: { rank: number; row: LeaderRow } | null; total: number }
  | { t: 'profileView'; rid?: string; id: string; name: string; ranks: Record<string, RankProfile> }
  | { t: 'purchased'; rid?: string; productId: string; txId: string; grant: PurchaseGrant; duplicate: boolean }
  | { t: 'purchaseList'; rid?: string; list: PurchaseRec[] }
  | { t: 'friendList'; rid?: string; friends: FriendView[]; reqIn: FriendView[]; reqOut: FriendView[] }
  | { t: 'dmThread'; rid?: string; with: string; msgs: DmMsg[] }
  | { t: 'dmPush'; from: string; name: string; msg: DmMsg }
  | { t: 'chalList'; rid?: string; list: ChalView[] }
  | { t: 'chalPush'; kind: 'new' | 'done'; from: string; name: string }
  | { t: 'peers'; list: PeerView[] }
  | { t: 'msg'; topic: string; data?: unknown; from: { peer: string; by: string } }
  | { t: 'error'; rid?: string; code: string; message?: string };
