// قلب الإمبراطورية على الخادم — الحقيقة الوحيدة للقاعدة: موارد بتحصيل كسول،
// ترقيات مباني بمؤقتات، تدريب وحدات، مهام يومية. كل الأرقام من shared/definitions.
import { BUILDINGS, BUILDINGS_META, ECONOMY, MISSIONS, UNIT_DEFS } from '../../shared/definitions/index';

// مسرّع بيئة تطوير/اختبار: يقسم المؤقتات ويضاعف الإنتاج
const SPEED = Math.max(1, parseFloat(process.env.BASE_SPEED ?? '1'));

export interface BaseState {
  gold: number;
  supplies: number;
  tokens: number;
  crystals: number;
  buildings: Record<string, number>;               // المستوى (0 = غير مبني)
  upgrading: { id: string; doneAt: number } | null;
  unitLevels: Record<string, number>;
  lastAccrueMs: number;
  missions: Record<string, { progress: number; claimed: boolean }>;
  missionsDay: string;
  freeChestAt: number;                              // آخر فتح
}

export function newBase(now: number): BaseState {
  const b: Record<string, number> = {};
  for (const id of Object.keys(BUILDINGS)) b[id] = BUILDINGS[id].start ?? 0;
  const s = BUILDINGS_META.startResources;
  return {
    gold: s.gold, supplies: s.supplies, tokens: s.tokens, crystals: s.crystals,
    buildings: b, upgrading: null, unitLevels: {},
    lastAccrueMs: now, missions: {}, missionsDay: '', freeChestAt: 0
  };
}

const growth = (base: number, g: number, lvl: number) => Math.round(base * Math.pow(g, lvl));

export function upgradeCost(id: string, toLevel: number): { gold: number; supplies: number; sec: number } {
  const d = BUILDINGS[id];
  return {
    gold: growth(d.cost.gold, d.cost.growth, toLevel - 1),
    supplies: growth(d.cost.supplies, d.cost.growth, toLevel - 1),
    sec: Math.max(1, Math.round(growth(d.buildSec.base, d.buildSec.growth, toLevel - 1) / SPEED))
  };
}

export function prodPerHour(b: BaseState): { gold: number; supplies: number } {
  let gold = 0, supplies = 0;
  for (const id of Object.keys(BUILDINGS)) {
    const d = BUILDINGS[id], lvl = b.buildings[id] ?? 0;
    if (d.role !== 'prod' || lvl <= 0) continue;
    const v = growth(d.prod.perHour, d.prod.growth, lvl - 1);
    if (d.prod.res === 'gold') gold += v; else supplies += v;
  }
  const labPct = (b.buildings.lab ?? 0) * (BUILDINGS.lab.prodBonusPctPerLevel ?? 0);
  const mul = (1 + labPct / 100) * SPEED;
  return { gold: Math.round(gold * mul), supplies: Math.round(supplies * mul) };
}

export function caps(b: BaseState): { gold: number; supplies: number } {
  const lvl = b.buildings.store ?? 0;
  const cap = lvl > 0 ? growth(BUILDINGS.store.cap.base, BUILDINGS.store.cap.growth, lvl) : 0;
  return {
    gold: BUILDINGS_META.baseGoldCap + cap,
    supplies: BUILDINGS_META.baseSuppliesCap + cap
  };
}

function todayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// التحصيل الكسول + إنهاء الترقيات المستحقة + تصفير المهام اليومية
export function tickBase(b: BaseState, now: number): void {
  const day = todayKey(now);
  if (b.missionsDay !== day) {
    b.missionsDay = day;
    b.missions = {};
    for (const m of MISSIONS) b.missions[m.id] = { progress: 0, claimed: false };
  }
  if (b.upgrading && now >= b.upgrading.doneAt) {
    b.buildings[b.upgrading.id] = (b.buildings[b.upgrading.id] ?? 0) + 1;
    b.upgrading = null;
  }
  const p = prodPerHour(b), c = caps(b);
  const hours = Math.max(0, now - b.lastAccrueMs) / 3600000;
  b.gold = Math.min(c.gold, b.gold + p.gold * hours);
  b.supplies = Math.min(c.supplies, b.supplies + p.supplies * hours);
  b.lastAccrueMs = now;
}

export function progressMission(b: BaseState, id: string, n = 1): void {
  const m = b.missions[id];
  const def = MISSIONS.find(x => x.id === id);
  if (m && def && !m.claimed) m.progress = Math.min(def.goal, m.progress + n);
}

export type EmpireError =
  | 'busy' | 'unknown' | 'max_level' | 'hall_gate' | 'poor'
  | 'unit_unknown' | 'unit_locked' | 'unit_max' | 'barracks_gate'
  | 'mission_unknown' | 'mission_incomplete' | 'mission_claimed' | 'chest_wait';

export function startUpgrade(b: BaseState, id: string, now: number): EmpireError | null {
  tickBase(b, now);
  const d = BUILDINGS[id];
  if (!d) return 'unknown';
  if (b.upgrading) return 'busy';
  const lvl = b.buildings[id] ?? 0;
  if (lvl >= d.maxLevel) return 'max_level';
  if ((b.buildings.hall ?? 1) < d.unlockHall && id !== 'hall') return 'hall_gate';
  // قاعة القيادة تحدّ الجميع: لا مبنى يتجاوز مستواها (عداها هي)
  if (id !== 'hall' && lvl + 1 > (b.buildings.hall ?? 1)) return 'hall_gate';
  const cost = upgradeCost(id, lvl + 1);
  if (b.gold < cost.gold || b.supplies < cost.supplies) return 'poor';
  b.gold -= cost.gold;
  b.supplies -= cost.supplies;
  b.upgrading = { id, doneAt: now + cost.sec * 1000 };
  progressMission(b, 'daily_upgrade');
  return null;
}

export function unlockedUnits(b: BaseState): string[] {
  const out = new Set<string>(BUILDINGS_META.startUnits);
  for (const bid of ['barracks', 'siege_shop']) {
    const d = BUILDINGS[bid], lvl = b.buildings[bid] ?? 0;
    for (const [need, units] of Object.entries(d.unlocks ?? {})) {
      if (lvl >= parseInt(need, 10)) for (const u of units as string[]) out.add(u);
    }
  }
  return [...out];
}

export function trainUnit(b: BaseState, unitId: string, now: number): EmpireError | null {
  tickBase(b, now);
  if (!UNIT_DEFS[unitId]) return 'unit_unknown';
  if (!unlockedUnits(b).includes(unitId)) return 'unit_locked';
  const cur = b.unitLevels[unitId] ?? 1;
  const maxLvl = (ECONOMY as any).levels.maxLevel;
  if (cur >= maxLvl) return 'unit_max';
  if (cur + 1 > (b.buildings.barracks ?? 1)) return 'barracks_gate';
  const cost = (ECONOMY as any).upgrade[String(cur + 1)];
  if (b.gold < cost.gold || b.tokens < cost.tokens + cost.roleTokens) return 'poor';
  b.gold -= cost.gold;
  b.tokens -= cost.tokens + cost.roleTokens;
  b.unitLevels[unitId] = cur + 1;
  progressMission(b, 'daily_train');
  return null;
}

export function claimMission(b: BaseState, id: string, now: number): EmpireError | null {
  tickBase(b, now);
  const def = MISSIONS.find(x => x.id === id);
  const m = b.missions[id];
  if (!def || !m) return 'mission_unknown';
  if (m.claimed) return 'mission_claimed';
  // مهمة الوادي يدوية التصديق في الشريحة (لا وسيلة تحقق من النموذج القديم بعد)
  if (def.auto && m.progress < def.goal) return 'mission_incomplete';
  if (def.needs && (b.buildings[def.needs] ?? 0) < 1) return 'mission_incomplete';
  m.claimed = true;
  m.progress = def.goal;
  award(b, def.reward);
  return null;
}

export function openFreeChest(b: BaseState, now: number): EmpireError | null {
  tickBase(b, now);
  const waitMs = (BUILDINGS_META.freeChest.everyHours * 3600000) / SPEED;
  if (now - b.freeChestAt < waitMs) return 'chest_wait';
  b.freeChestAt = now;
  award(b, { gold: BUILDINGS_META.freeChest.gold, tokens: BUILDINGS_META.freeChest.tokens });
  return null;
}

export function battleReward(b: BaseState, won: boolean, now: number): { gold: number; tokens: number } {
  tickBase(b, now);
  const r = BUILDINGS_META.battleReward;
  const bonus = 1 + ((b.buildings.gate ?? 0) * (BUILDINGS.gate.battleRewardBonusPctPerLevel ?? 0)) / 100;
  const gold = Math.round((won ? r.winGold : r.loseGold) * bonus);
  const tokens = won ? r.winTokens : r.loseTokens;
  award(b, { gold, tokens });
  progressMission(b, 'daily_battle');
  return { gold, tokens };
}

function award(b: BaseState, r: { gold?: number; supplies?: number; tokens?: number; crystals?: number }): void {
  const c = caps(b);
  b.gold = Math.min(c.gold, b.gold + (r.gold ?? 0));
  b.supplies = Math.min(c.supplies, b.supplies + (r.supplies ?? 0));
  b.tokens += r.tokens ?? 0;
  b.crystals += r.crystals ?? 0;
}

// لقطة للعميل — أرقام صحيحة للعرض + كل ما تحتاجه الواجهة
export function baseView(b: BaseState, now: number): any {
  tickBase(b, now);
  const c = caps(b), p = prodPerHour(b);
  const buildings: Record<string, any> = {};
  for (const id of Object.keys(BUILDINGS)) {
    const d = BUILDINGS[id], lvl = b.buildings[id] ?? 0;
    const next = lvl < d.maxLevel ? upgradeCost(id, lvl + 1) : null;
    buildings[id] = {
      level: lvl, maxLevel: d.maxLevel, unlockHall: d.unlockHall, role: d.role,
      next,
      prodPerHour: d.role === 'prod' && lvl > 0
        ? growth(d.prod.perHour, d.prod.growth, lvl - 1) : 0
    };
  }
  return {
    gold: Math.floor(b.gold), supplies: Math.floor(b.supplies),
    tokens: b.tokens, crystals: b.crystals,
    caps: c, prodPerHour: p,
    hall: b.buildings.hall ?? 1,
    buildings,
    upgrading: b.upgrading,
    unitLevels: b.unitLevels,
    unlocked: unlockedUnits(b),
    missions: MISSIONS.map(m => ({
      id: m.id, nameKey: m.nameKey, goal: m.goal, reward: m.reward,
      openUrl: m.openUrl ?? null, auto: m.auto,
      needs: m.needs ?? null, needsMet: !m.needs || (b.buildings[m.needs] ?? 0) >= 1,
      progress: b.missions[m.id]?.progress ?? 0,
      claimed: b.missions[m.id]?.claimed ?? false
    })),
    freeChestReadyAt: b.freeChestAt + (BUILDINGS_META.freeChest.everyHours * 3600000) / SPEED,
    now
  };
}
