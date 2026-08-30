// أنواع المحاكاة — كل القيم الجارية أعداد صحيحة (مليمتر / سنتي-صحة / ملي-نقطة / تكّات)
// كي تكون النتيجة متطابقة بتاً على كل منصة (شرط الشبكة والإعادات).
// آليات توجيه المالك: قلعة بمرحلتين (بوابة→قلب)، يد 4 من تشكيلة 8، راية قيادة،
// طيران/اغتيال/هالة/Charge، مستويات 1–10.

export type Role = 'frontline' | 'ranged' | 'cavalry' | 'support' | 'siege' | 'special';
export type PlayerIx = 0 | 1;
export type SectorIx = 0 | 1 | 2; // الممر الأيسر، الأوسط، الأيمن

// تعريف وحدة محوَّل إلى وحدات صحيحة (من shared/definitions/units/*.json)
export interface RtUnit {
  id: string;
  role: Role;
  size: number;
  cost: number;
  memberHpCenti: number;      // صحة الفرد ×100
  squadHpCenti: number;       // صحة الفرقة الكاملة ×100
  dmgCentiPerTick: number;    // ضرر الفرقة الكاملة لكل تكّة (ضد الفرق)
  hqDmgCentiPerTick: number;  // ضرر الفرقة الكاملة لكل تكّة ضد المباني
  rangeMm: number;
  minRangeMm: number;
  seekMm: number;             // مدى الالتفات للأعداء
  speedMmTick: number;
  tags: string[];
  counters: Record<string, number>;     // ‰ (بالألف)
  counteredBy: Record<string, number>;  // ‰
  fromRangedMill: number;               // معدِّل الضرر الوارد من الرمي ‰
  healCentiPerTick: number;
  slowMill: number;
  slowRadiusMm: number;
  areaRadiusMm: number;                 // ضرر منطقة (قاذفو اللهب)
  buildingsOnly: boolean;
  priorityBackline: boolean;            // فرسان/ظلال/خفافيش: الخلف أولاً
  healer: boolean;
  flying: boolean;                      // يتجاوز الهوة والبوابة؛ الالتحام الأرضي لا يطاله
  charge: boolean;                      // ضربة أولى مضاعفة بعد مسير حر
  auraRadiusMm: number;                 // هالة حماة الراية
  auraMill: number;                     // ‰ إضافة الهالة (1150 = +15%)
}

export interface Squad {
  id: number;
  player: PlayerIx;
  unit: string;
  slot: number;              // خانة اليد التي نُشر منها (للعرض)
  x: number;                 // مم
  z: number;                 // مم
  hpCenti: number;
  memberHpCenti: number;     // صحة الفرد الفعلية (بعد المستوى)
  dmgMill: number;           // معدِّل المستوى ‰ (1000 + 30×(المستوى−1))
  landingTicks: number;
  targetId: number;          // -1 لا هدف، -2 بوابة/قلب الخصم، وإلا فرقة
  wayX: number | null;
  wayZ: number | null;
  rallyReadyTick: number;
  slowUntilTick: number;
  chargeReady: boolean;      // فرسان الجوف: الضربة الأولى مضاعفة
  noTargetTicks: number;     // لإعادة تعبئة الـCharge بعد مسير حر
  buffMill: number;          // هالة الراية هذه التكّة (عابر — لا يدخل التجزئة)
  attackedThisTick: boolean;
}

export interface PlayerState {
  name: string;
  isBot: boolean;
  unitLevels: Record<string, number>;   // 1..10
  cp: number;
  regenCounter: number;
  deck: string[];                       // 8 وحدات
  order: number[];                      // دورة التشكيلة: أول 4 = اليد
  gateHpCenti: number;                  // بوابة القلعة — المرحلة الأولى
  hqHpCenti: number;                    // قلب القلعة — تدميره نصر فوري
  hqDamageDealtCenti: number;           // ما ألحقه بقلب الخصم (كسر التعادل)
  flagX: number;                        // راية القيادة
  flagZ: number;
  flagUntilTick: number;
  flagReadyTick: number;
  scoreMilli: number;
  skillUsed: boolean;
  surrendered: boolean;
  forward: boolean[];
  controlTicks: number[];
}

export type Phase = 'main' | 'overtime' | 'ended';

export interface MatchResult {
  winner: -1 | 0 | 1;
  reason: 'hq' | 'score' | 'overtime_margin' | 'hq_damage' | 'draw' | 'surrender' | 'timeout_forfeit';
}

export interface SimEvent {
  t: 'deploy' | 'kill' | 'hq' | 'gate' | 'gate_down' | 'skill' | 'flag' | 'forward' | 'phase' | 'end' | 'reject';
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
  midController: -1 | 0 | 1;
  sectorController: (-1 | 0 | 1)[];
  result: MatchResult | null;
}

// أوامر اللاعب (النوايا بعد ختمها بالتكّة) — الشيء الوحيد الذي يعبر الشبكة
export type Command =
  | { type: 'deploy'; player: PlayerIx; slot: number; x: number; z: number }  // slot: خانة اليد 0..3
  | { type: 'rally'; player: PlayerIx; squadId: number; x: number; z: number }
  | { type: 'flag'; player: PlayerIx; x: number; z: number }                  // راية القيادة
  | { type: 'skill'; player: PlayerIx; x: number; z: number }
  | { type: 'surrender'; player: PlayerIx };

export interface TickInput {
  tick: number;
  commands: Command[];
}

export interface RtArena {
  id: string;
  halfWmm: number;
  fieldZmm: number;
  hqZmm: number;            // موضع قلب القلعة
  hqRadiusMm: number;
  hqHpCenti: number;        // صحة القلب
  gateZmm: number;          // موضع البوابة (أمام القلعة)
  gateRadiusMm: number;
  gateHpCenti: number;      // صحة البوابة
  hqDefDmgCentiPerTick: number;
  hqDefRangeMm: number;
  bridgeHalfWmm: number;
  bridgeZmm: number;
  sectorEdgeMm: number;
  deployOwnZmm: number;
  deployForwardZmm: number;
  cpStart: number;
  cpCap: number;
  cpCapOvertime: number;
  regenTicks: number;
  regenTicksMid: number;
  mainTicks: number;
  overtimeTicks: number;
  forwardHoldTicks: number;
  graceTicks: number;
  landingTicks: number;
  maxLiveSquads: number;
  rallyCooldownTicks: number;
  flagDurTicks: number;     // مدة راية القيادة
  flagCdTicks: number;      // تبريدها
  flagRadiusMm: number;     // نطاق تسريعها
  scoreSectorMilliPerTick: number;
  scoreMidMilliPerTick: number;
  scoreKillMilli: number;
  scoreGateDownMilli: number;   // مكافأة كسر البوابة
  winMarginMainMilli: number;
  winMarginOvertimeMilli: number;
  otVulnMill: number;           // ‰ زيادة ضرر المباني في الوقت الإضافي
  skillChargeTicks: number;
  skillRadiusMm: number;
  skillDmgCenti: number;
}

export const TICK_MS = 50;
export const TICKS_PER_SEC = 20;
