// أنواع المحاكاة — كل القيم الجارية أعداد صحيحة (مليمتر / سنتي-صحة / ملي-نقطة / تكّات)
// كي تكون النتيجة متطابقة بتاً على كل منصة (شرط الشبكة والإعادات).

export type Role = 'frontline' | 'ranged' | 'cavalry' | 'support' | 'siege' | 'special';
export type PlayerIx = 0 | 1;
export type SectorIx = 0 | 1 | 2; // أيسر، أوسط، أيمن

// تعريف وحدة محوَّل إلى وحدات صحيحة (من shared/definitions/units/*.json)
export interface RtUnit {
  id: string;
  role: Role;
  size: number;
  cost: number;
  musterTicks: number;
  memberHpCenti: number;      // صحة الفرد ×100
  squadHpCenti: number;       // صحة الفرقة الكاملة ×100
  dmgCentiPerTick: number;    // ضرر الفرقة الكاملة لكل تكّة (ضد الفرق)
  hqDmgCentiPerTick: number;  // ضرر الفرقة الكاملة لكل تكّة ضد المقر
  rangeMm: number;
  minRangeMm: number;
  seekMm: number;             // مدى الالتفات للأعداء
  speedMmTick: number;
  tags: string[];
  counters: Record<string, number>;     // ‰ (بالألف)
  counteredBy: Record<string, number>;  // ‰
  fromRangedMill: number;               // معدِّل الضرر الوارد من الرمي ‰ (حرس الدروع 600)
  healCentiPerTick: number;
  slowMill: number;                     // إبطاء ساحرة الصقيع ‰ من السرعة المفقودة (350)
  slowRadiusMm: number;
  areaRadiusMm: number;                 // ضرر منطقة (رماة اللهب)
  buildingsOnly: boolean;
  priorityBackline: boolean;            // فرسان: الرمي/الحصار/الإسناد أولاً
  healer: boolean;
}

export interface Squad {
  id: number;
  player: PlayerIx;
  unit: string;          // مفتاح RtUnit
  slot: number;          // خانة القيادة التي نُشر منها
  x: number;             // مم
  z: number;             // مم
  hpCenti: number;
  memberHpCenti: number; // صحة الفرد الفعلية (بعد مستوى الوحدة)
  dmgMill: number;       // معدِّل ضرر المستوى ‰
  landingTicks: number;  // >0: ما زال ينزل (لا يتحرك ولا يهاجم، لكنه يُستهدف)
  targetId: number;      // -1 لا هدف، -2 مقر الخصم، وإلا معرّف فرقة
  wayX: number | null;   // أمر Rally
  wayZ: number | null;
  rallyReadyTick: number;
  slowUntilTick: number;
  attackedThisTick: boolean; // للعميل: هل ضرب هذه التكّة (وميض/صوت)
}

export interface PlayerState {
  name: string;
  isBot: boolean;
  unitLevels: Record<string, number>; // مستوى كل وحدة (1..5) — من قاعدة اللاعب
  cp: number;
  regenCounter: number;
  deck: string[];                 // 7 وحدات
  musterReadyTick: number[];      // لكل خانة
  hqHpCenti: number;
  hqDamageDealtCenti: number;     // مجموع ما ألحقه بمقر الخصم
  scoreMilli: number;
  skillUsed: boolean;
  surrendered: boolean;
  forward: boolean[];             // فتح النشر المتقدم لكل قطاع
  controlTicks: number[];         // سيطرة متواصلة لكل قطاع
}

export type Phase = 'main' | 'overtime' | 'ended';

export interface MatchResult {
  winner: -1 | 0 | 1;             // -1 تعادل
  reason: 'hq' | 'score' | 'overtime_margin' | 'hq_damage' | 'draw' | 'surrender' | 'timeout_forfeit';
}

export interface SimEvent {
  t: 'deploy' | 'kill' | 'hq' | 'skill' | 'forward' | 'phase' | 'end' | 'reject';
  player?: PlayerIx;
  squadId?: number;
  unit?: string;
  x?: number;
  z?: number;
  sector?: SectorIx;
  dmgCenti?: number;
  phase?: Phase;
  result?: MatchResult;
  reason?: string;
}

export interface SimState {
  tick: number;
  phase: Phase;
  rng: number;
  nextSquadId: number;
  squads: Squad[];
  players: [PlayerState, PlayerState];
  midController: -1 | 0 | 1;      // مَن يسيطر على الوسط هذه التكّة (لتجدد CP)
  sectorController: (-1 | 0 | 1)[];
  result: MatchResult | null;
}

// أوامر اللاعب (النوايا بعد ختمها بالتكّة) — الشيء الوحيد الذي يعبر الشبكة
export type Command =
  | { type: 'deploy'; player: PlayerIx; slot: number; x: number; z: number }
  | { type: 'rally'; player: PlayerIx; squadId: number; x: number; z: number }
  | { type: 'skill'; player: PlayerIx; x: number; z: number }
  | { type: 'surrender'; player: PlayerIx };

export interface TickInput {
  tick: number;
  commands: Command[];
}

// ثوابت الساحة (من shared/definitions/arenas/*.json) محوَّلة إلى وحدات صحيحة
export interface RtArena {
  id: string;
  halfWmm: number;          // نصف العرض
  fieldZmm: number;         // حد أرض المعركة على محور z
  hqZmm: number;            // موضع المقر
  hqRadiusMm: number;
  hqHpCenti: number;
  hqDefDmgCentiPerTick: number;
  hqDefRangeMm: number;     // بعد خاصية القائد
  bridgeHalfWmm: number;    // نصف عرض الجسر في القطاع الأوسط
  bridgeZmm: number;        // نطاق الجسر على z
  sectorEdgeMm: number;     // حد القطاع الأوسط على x
  deployOwnZmm: number;     // حد النشر الأساسي
  deployForwardZmm: number; // حد النشر المتقدم
  cpStart: number;
  cpCap: number;
  cpCapOvertime: number;
  regenTicks: number;
  regenTicksMid: number;
  mainTicks: number;
  overtimeTicks: number;
  forwardHoldTicks: number;
  graceTicks: number;       // لا نقاط سيطرة قبلها
  landingTicks: number;
  maxLiveSquads: number;
  rallyCooldownTicks: number;
  scoreSectorMilliPerTick: number;
  scoreMidMilliPerTick: number;
  scoreKillMilli: number;
  winMarginMainMilli: number;
  winMarginOvertimeMilli: number;
  skillChargeTicks: number;
  skillRadiusMm: number;
  skillDmgCenti: number;
}

export const TICK_MS = 50;
export const TICKS_PER_SEC = 20;
