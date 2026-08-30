// تحويل تعريفات JSON (أمتار/ثوانٍ/نقاط عائمة) إلى وحدات صحيحة للمحاكاة.
import type { RtArena, RtUnit, Role } from './types';
import { TICKS_PER_SEC } from './types';

const MM = 1000;

function mill(v: number | undefined, fallback = 1000): number {
  return v === undefined ? fallback : Math.round(v * 1000);
}

export function buildUnits(unitDefs: Record<string, any>): Record<string, RtUnit> {
  const out: Record<string, RtUnit> = {};
  for (const id of Object.keys(unitDefs).sort()) {
    const d = unitDefs[id];
    const size: number = d.squadSize;
    const structure = d.structure as { hp: number; dpsVsBuildings: number } | undefined;
    const squadHp = structure ? structure.hp : d.member.hp * size;
    const dps = d.member.dps * size;
    // غير الحصار يضرب المباني بـ40% — كي يبقى للحصار دوره (docs/CORE_GAMEPLAY.md §11)
    const hqDps = structure ? structure.dpsVsBuildings : dps * 0.4;
    const counters: Record<string, number> = {};
    for (const k of Object.keys(d.counters ?? {})) counters[k] = mill(d.counters[k]);
    const counteredBy: Record<string, number> = {};
    for (const k of Object.keys(d.counteredBy ?? {})) counteredBy[k] = mill(d.counteredBy[k]);
    const rangeMm = Math.round(d.member.range * MM);
    const tags: string[] = d.tags ?? [];
    out[id] = {
      id,
      role: d.role as Role,
      size,
      cost: d.costCP,
      memberHpCenti: Math.max(1, Math.ceil((squadHp * 100) / size)),
      squadHpCenti: squadHp * 100,
      dmgCentiPerTick: Math.round((dps * 100) / TICKS_PER_SEC),
      hqDmgCentiPerTick: Math.round((hqDps * 100) / TICKS_PER_SEC),
      rangeMm,
      minRangeMm: Math.round((d.minRange ?? 0) * MM),
      seekMm: Math.max(9 * MM, rangeMm + 2 * MM),
      speedMmTick: Math.round((d.member.moveSpeed * MM) / TICKS_PER_SEC),
      tags,
      counters,
      counteredBy,
      fromRangedMill: mill(d.damageModifiers?.fromRanged),
      healCentiPerTick: Math.round(((d.healPerSec ?? 0) * 100) / TICKS_PER_SEC),
      slowMill: (d.slowPct ?? 0) * 10,
      slowRadiusMm: Math.round((d.slowRadius ?? 0) * MM),
      areaRadiusMm: Math.round((d.areaRadius ?? 0) * MM),
      buildingsOnly: d.targeting === 'buildings_only',
      priorityBackline: d.targeting === 'priority_ranged_siege',
      healer: tags.indexOf('healer') >= 0,
      flying: tags.indexOf('flying') >= 0,
      charge: tags.indexOf('charge') >= 0,
      auraRadiusMm: Math.round((d.auraRadius ?? 0) * MM),
      auraMill: 1000 + (d.auraPct ?? 0) * 10
    };
  }
  return out;
}

export function buildArena(a: any, commander: any): RtArena {
  const T = TICKS_PER_SEC;
  const hqDefRange = 8 * MM;
  const passivePct = commander?.passive?.id === 'hq_range' ? commander.passive.value : 0;
  return {
    id: a.id,
    halfWmm: (a.size.width / 2) * MM,
    fieldZmm: 24 * MM,
    hqZmm: 28 * MM,
    hqRadiusMm: 2 * MM,
    hqHpCenti: Math.round(a.hqHp * 0.6) * 100,          // القلب
    gateZmm: 25 * MM,                                    // البوابة أمام القلعة
    gateRadiusMm: 2.2 * MM,
    gateHpCenti: Math.round(a.hqHp * 0.4) * 100,        // البوابة أضعف من القلب
    hqDefDmgCentiPerTick: Math.round((20 * 100) / T),
    hqDefRangeMm: Math.round(hqDefRange * (1 + passivePct / 100)),
    bridgeHalfWmm: (a.terrain?.[0]?.narrowsToWidth ? a.terrain[0].narrowsToWidth / 2 : 3) * MM,
    bridgeZmm: 6 * MM,
    sectorEdgeMm: 6 * MM,
    deployOwnZmm: 8 * MM,
    deployForwardZmm: 8 * MM,
    cpStart: a.commandPoints.start,
    cpCap: a.commandPoints.cap,
    cpCapOvertime: a.commandPoints.capOvertime,
    regenTicks: Math.round(a.commandPoints.regenSec * T),
    regenTicksMid: Math.round(a.commandPoints.regenSecMidBonus * T),
    mainTicks: a.timers.mainSec * T,
    overtimeTicks: a.timers.overtimeSec * T,
    forwardHoldTicks: a.timers.forwardDeployHoldSec * T,
    graceTicks: 10 * T,
    landingTicks: 1 * T,
    maxLiveSquads: 8,
    rallyCooldownTicks: 15 * T,
    flagDurTicks: 20 * T,
    flagCdTicks: 35 * T,
    flagRadiusMm: 6 * MM,
    scoreSectorMilliPerTick: Math.round((a.score.sectorSecPts * 1000) / T),
    scoreMidMilliPerTick: Math.round((a.score.midSectorSecPts * 1000) / T),
    scoreKillMilli: a.score.squadKillPts * 1000,
    scoreGateDownMilli: 8000,
    winMarginMainMilli: a.score.winMarginMain * 1000,
    winMarginOvertimeMilli: a.score.winMarginOvertime * 1000,
    otVulnMill: 1250,
    skillChargeTicks: (commander?.active?.chargeSec ?? 60) * T,
    skillRadiusMm: Math.round((commander?.active?.areaRadius ?? 3) * MM),
    skillDmgCenti: (commander?.active?.totalDamage ?? 220) * 100
  };
}
