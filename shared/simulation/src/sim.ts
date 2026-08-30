// قلب المحاكاة الحتمية — خطوة ثابتة 20Hz، أعداد صحيحة، بلا عرض.
// نفس البذرة + نفس تسلسل الأوامر ⟹ نفس الحالة بتاً على العميل والخادم.
// آليات توجيه المالك: بوابة→فناء→قلب، يد 4 بدورة من 8، راية القيادة،
// طيران/Charge/هالة، مستويات 1–10 (+3%).
import type {
  Command, MatchResult, Phase, PlayerIx, PlayerState, RtArena, RtUnit,
  SectorIx, SimEvent, SimState, Squad
} from './types';

export interface SimContext {
  units: Record<string, RtUnit>;
  arena: RtArena;
}

// ─── إنشاء المباراة ───────────────────────────────────────────────

export function createMatch(
  ctx: SimContext,
  seed: number,
  players: { name: string; isBot: boolean; deck: string[]; unitLevels?: Record<string, number> }[]
): SimState {
  const mk = (p: { name: string; isBot: boolean; deck: string[]; unitLevels?: Record<string, number> }): PlayerState => ({
    name: p.name,
    isBot: p.isBot,
    unitLevels: p.unitLevels ?? {},
    cp: ctx.arena.cpStart,
    regenCounter: 0,
    deck: p.deck.slice(0, 8),
    order: p.deck.slice(0, 8).map((_, i) => i),
    gateHpCenti: ctx.arena.gateHpCenti,
    hqHpCenti: ctx.arena.hqHpCenti,
    hqDamageDealtCenti: 0,
    flagX: 0, flagZ: 0, flagUntilTick: 0, flagReadyTick: 0,
    scoreMilli: 0,
    skillUsed: false,
    surrendered: false,
    forward: [false, false, false],
    controlTicks: [0, 0, 0]
  });
  return {
    tick: 0,
    phase: 'main',
    rng: seed | 0,
    nextSquadId: 1,
    squads: [],
    players: [mk(players[0]), mk(players[1])],
    midController: -1,
    sectorController: [-1, -1, -1],
    result: null
  };
}

// اليد الحالية (أول 4 من الدورة) — يستعملها العميل والبوت والاختبارات
export function handOf(P: PlayerState): number[] {
  return P.order.slice(0, 4);
}

// ─── مساعدات هندسية ──────────────────────────────────────────────

export function sectorOf(x: number, a: RtArena): SectorIx {
  if (x < -a.sectorEdgeMm) return 0;
  if (x > a.sectorEdgeMm) return 2;
  return 1;
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx, dz = az - bz;
  return Math.round(Math.sqrt(dx * dx + dz * dz));
}

function clampToField(s: { x: number; z: number }, a: RtArena, flying: boolean): void {
  const m = a.halfWmm - 500;
  if (s.x < -m) s.x = -m;
  if (s.x > m) s.x = m;
  const zm = a.hqZmm - 500;
  if (s.z < -zm) s.z = -zm;
  if (s.z > zm) s.z = zm;
  // الجسر: الممر الأوسط يضيق عند عبور المنتصف — الطيران يتجاوز الهوة
  if (!flying && Math.abs(s.z) < a.bridgeZmm && Math.abs(s.x) <= a.sectorEdgeMm) {
    if (s.x < -a.bridgeHalfWmm) s.x = -a.bridgeHalfWmm;
    if (s.x > a.bridgeHalfWmm) s.x = a.bridgeHalfWmm;
  }
}

export function membersAlive(sq: Squad, u: RtUnit): number {
  const per = sq.memberHpCenti || u.memberHpCenti;
  return Math.max(0, Math.ceil(sq.hpCenti / per));
}

export function cpCap(st: SimState, a: RtArena): number {
  const decisive = st.phase === 'overtime' || st.tick >= a.mainTicks - 60 * 20;
  return decisive ? a.cpCapOvertime : a.cpCap;
}

export function deployValid(
  st: SimState, ctx: SimContext, player: PlayerIx, x: number, z: number
): boolean {
  const a = ctx.arena;
  if (Math.abs(x) > a.halfWmm - 500) return false;
  const zSigned = player === 0 ? z : -z;
  if (zSigned > a.deployForwardZmm) return false;
  if (zSigned < -(a.fieldZmm - 500)) return false;
  const sec = sectorOf(x, a);
  if (zSigned > -a.deployOwnZmm && !st.players[player].forward[sec]) return false;
  if (sec === 1 && Math.abs(z) < a.bridgeZmm && Math.abs(x) > a.bridgeHalfWmm) return false;
  return true;
}

// ─── تطبيق الأوامر ───────────────────────────────────────────────

export function applyCommand(
  st: SimState, ctx: SimContext, cmd: Command, events: SimEvent[]
): boolean {
  if (st.phase === 'ended') return false;
  const a = ctx.arena;
  const P = st.players[cmd.player];
  switch (cmd.type) {
    case 'deploy': {
      // slot = خانة اليد (0..3) من دورة التشكيلة الثمانية
      if (cmd.slot < 0 || cmd.slot >= 4 || cmd.slot >= P.order.length) return reject(events, cmd.player, 'slot');
      const deckIx = P.order[cmd.slot];
      const u = ctx.units[P.deck[deckIx]];
      if (!u) return reject(events, cmd.player, 'unit');
      if (P.cp < u.cost) return reject(events, cmd.player, 'cp');
      const live = st.squads.filter(s => s.player === cmd.player).length;
      if (live >= a.maxLiveSquads) return reject(events, cmd.player, 'cap');
      if (!deployValid(st, ctx, cmd.player, cmd.x, cmd.z)) return reject(events, cmd.player, 'zone');
      P.cp -= u.cost;
      // الدورة: الوحدة المستعملة تذهب لآخر الطابور وتدخل التالية لليد
      P.order.splice(cmd.slot, 1);
      P.order.push(deckIx);
      const lvl = Math.max(1, Math.min(10, P.unitLevels[u.id] ?? 1));
      const lvlMill = 1000 + (lvl - 1) * 30;
      const sq: Squad = {
        id: st.nextSquadId++,
        player: cmd.player,
        unit: u.id,
        slot: cmd.slot,
        x: cmd.x, z: cmd.z,
        hpCenti: Math.floor((u.squadHpCenti * lvlMill) / 1000),
        memberHpCenti: Math.max(1, Math.floor((u.memberHpCenti * lvlMill) / 1000)),
        dmgMill: lvlMill,
        landingTicks: a.landingTicks,
        targetId: -1,
        wayX: null, wayZ: null,
        rallyReadyTick: 0,
        slowUntilTick: 0,
        chargeReady: u.charge,
        noTargetTicks: 0,
        buffMill: 1000,
        attackedThisTick: false
      };
      clampToField(sq, a, u.flying);
      st.squads.push(sq);
      events.push({ t: 'deploy', player: cmd.player, squadId: sq.id, unit: u.id, x: sq.x, z: sq.z });
      return true;
    }
    case 'rally': {
      const sq = st.squads.find(s => s.id === cmd.squadId && s.player === cmd.player);
      if (!sq || sq.landingTicks > 0) return reject(events, cmd.player, 'squad');
      if (st.tick < sq.rallyReadyTick) return reject(events, cmd.player, 'rally_cd');
      sq.wayX = cmd.x; sq.wayZ = cmd.z;
      clampToField({ x: sq.wayX, z: sq.wayZ } as Squad, a, ctx.units[sq.unit].flying);
      sq.rallyReadyTick = st.tick + a.rallyCooldownTicks;
      sq.targetId = -1;
      return true;
    }
    case 'flag': {
      // راية القيادة: تجمع غير المشتبكين وتسرّع من حولها — بمهلة تبريد
      if (st.tick < P.flagReadyTick) return reject(events, cmd.player, 'flag_cd');
      const pos = { x: cmd.x, z: cmd.z };
      clampToField(pos, a, true);
      P.flagX = pos.x; P.flagZ = pos.z;
      P.flagUntilTick = st.tick + a.flagDurTicks;
      P.flagReadyTick = st.tick + a.flagCdTicks;
      events.push({ t: 'flag', player: cmd.player, x: pos.x, z: pos.z });
      return true;
    }
    case 'skill': {
      if (P.skillUsed) return reject(events, cmd.player, 'skill_used');
      if (st.tick < a.skillChargeTicks) return reject(events, cmd.player, 'skill_charge');
      P.skillUsed = true;
      for (const sq of st.squads) {
        if (sq.player === cmd.player) continue;
        if (dist(sq.x, sq.z, cmd.x, cmd.z) <= a.skillRadiusMm) {
          damageSquad(st, ctx, sq, a.skillDmgCenti, cmd.player, events);
        }
      }
      events.push({ t: 'skill', player: cmd.player, x: cmd.x, z: cmd.z });
      return true;
    }
    case 'surrender': {
      P.surrendered = true;
      endMatch(st, events, { winner: (1 - cmd.player) as PlayerIx, reason: 'surrender' });
      return true;
    }
  }
}

function reject(events: SimEvent[], player: PlayerIx, reason: string): boolean {
  events.push({ t: 'reject', player, reason });
  return false;
}

// ─── الضرر ───────────────────────────────────────────────────────

function damageSquad(
  st: SimState, ctx: SimContext, target: Squad, dmgCenti: number,
  attacker: PlayerIx, events: SimEvent[]
): void {
  target.hpCenti -= dmgCenti;
  if (target.hpCenti <= 0) {
    st.squads.splice(st.squads.indexOf(target), 1);
    st.players[attacker].scoreMilli += ctx.arena.scoreKillMilli;
    events.push({ t: 'kill', player: target.player, squadId: target.id, unit: target.unit, x: target.x, z: target.z });
  }
}

// ضرر المباني: البوابة أولاً (إلا للطيران)، ثم القلب. الإضافي يزيد هشاشتها.
function damageBuilding(
  st: SimState, ctx: SimContext, defender: PlayerIx, rawCenti: number,
  attackerFlying: boolean, events: SimEvent[]
): void {
  const a = ctx.arena;
  const D = st.players[defender];
  const A = st.players[(1 - defender) as PlayerIx];
  let dmg = st.phase === 'overtime' ? Math.floor((rawCenti * a.otVulnMill) / 1000) : rawCenti;
  if (D.gateHpCenti > 0 && !attackerFlying) {
    const applied = Math.min(dmg, D.gateHpCenti);
    D.gateHpCenti -= applied;
    A.scoreMilli += applied >> 2;              // 0.25 ملي/سنتي لضرر البوابة
    events.push({ t: 'gate', player: defender, dmgCenti: applied });
    if (D.gateHpCenti <= 0) {
      A.scoreMilli += a.scoreGateDownMilli;    // مكافأة كسر البوابة — يُفتح الفناء
      events.push({ t: 'gate_down', player: defender });
    }
    return;
  }
  const applied = Math.min(dmg, D.hqHpCenti);
  if (applied <= 0) return;
  D.hqHpCenti -= applied;
  const before = A.hqDamageDealtCenti;
  A.hqDamageDealtCenti += applied;
  A.scoreMilli += (A.hqDamageDealtCenti >> 1) - (before >> 1);
  events.push({ t: 'hq', player: defender, dmgCenti: applied });
  if (D.hqHpCenti <= 0) {
    endMatch(st, events, { winner: (1 - defender) as PlayerIx, reason: 'hq' });
  }
}

// معدِّل الكاونتر ‰ — الأفضلية من أي جهة بلا مضاعفة مزدوجة
function counterMill(att: RtUnit, tgt: RtUnit): number {
  let m = 1000;
  for (const k of Object.keys(att.counters)) {
    if (k === tgt.role || tgt.tags.indexOf(k) >= 0) m = Math.max(m, att.counters[k]);
  }
  for (const k of Object.keys(tgt.counteredBy)) {
    if (k === att.role || att.tags.indexOf(k) >= 0) m = Math.max(m, tgt.counteredBy[k]);
  }
  return m;
}

// ─── اختيار الأهداف ─────────────────────────────────────────────
// الالتحام الأرضي لا يستطيع استهداف الطيران (البند 12/6 من التوجيه)

function canTarget(att: RtUnit, tgtU: RtUnit): boolean {
  if (tgtU.flying && !att.flying && att.rangeMm <= 1500) return false;
  return true;
}

function pickTarget(st: SimState, ctx: SimContext, sq: Squad, u: RtUnit): void {
  if (u.buildingsOnly) { sq.targetId = -2; return; }
  const enemies = st.squads.filter(s => s.player !== sq.player && canTarget(u, ctx.units[s.unit]));
  let best: Squad | null = null;
  let bestD = Infinity;
  if (u.priorityBackline) {
    for (const e of enemies) {
      const er = ctx.units[e.unit].role;
      if (er !== 'ranged' && er !== 'siege' && er !== 'support') continue;
      const d = dist(sq.x, sq.z, e.x, e.z);
      if (d <= 14000 && (d < bestD || (d === bestD && best && e.id < best.id))) { best = e; bestD = d; }
    }
  }
  if (!best) {
    for (const e of enemies) {
      const d = dist(sq.x, sq.z, e.x, e.z);
      if (d <= u.seekMm && (d < bestD || (d === bestD && best && e.id < best.id))) { best = e; bestD = d; }
    }
  }
  sq.targetId = best ? best.id : -1;
}

// هدف المبنى الحالي لمهاجم: البوابة ما دامت قائمة (إلا الطيران) ثم القلب
function buildingTarget(st: SimState, a: RtArena, attackerSide: PlayerIx, flying: boolean):
  { x: number; z: number; radius: number } {
  const defender = (1 - attackerSide) as PlayerIx;
  const s = defender === 0 ? -1 : 1;
  if (st.players[defender].gateHpCenti > 0 && !flying) {
    return { x: 0, z: s * a.gateZmm, radius: a.gateRadiusMm };
  }
  return { x: 0, z: s * a.hqZmm, radius: a.hqRadiusMm };
}

// ─── الخطوة (تكّة 50ms) ─────────────────────────────────────────

export function step(st: SimState, ctx: SimContext, inputs: Command[]): SimEvent[] {
  const events: SimEvent[] = [];
  if (st.phase === 'ended') return events;
  const a = ctx.arena;

  for (const cmd of inputs) applyCommand(st, ctx, cmd, events);
  if ((st.phase as Phase) === 'ended') return events;

  // 1) تجدد نقاط القيادة (مكافأة السيطرة على الوسط — «منجم الحرب»)
  for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
    const P = st.players[p];
    const cap = cpCap(st, a);
    if (P.cp < cap) {
      P.regenCounter++;
      const need = st.midController === p ? a.regenTicksMid : a.regenTicks;
      if (P.regenCounter >= need) { P.cp++; P.regenCounter = 0; }
    } else P.regenCounter = 0;
  }

  // 2) هالة حماة الراية: تُحسب قبل حركة/هجوم التكّة
  for (const sq of st.squads) sq.buffMill = 1000;
  for (const banner of st.squads) {
    const bu = ctx.units[banner.unit];
    if (bu.auraRadiusMm <= 0 || banner.landingTicks > 0) continue;
    for (const ally of st.squads) {
      if (ally.player !== banner.player || ally.id === banner.id) continue;
      if (dist(ally.x, ally.z, banner.x, banner.z) <= bu.auraRadiusMm) {
        ally.buffMill = Math.max(ally.buffMill, bu.auraMill);
      }
    }
  }

  // 3) الفرق — بترتيب معرّفات ثابت (حتمية)
  const byId = st.squads.slice().sort((x, y) => x.id - y.id);
  for (const sq of byId) {
    if (st.squads.indexOf(sq) < 0) continue;
    sq.attackedThisTick = false;
    const u = ctx.units[sq.unit];
    if (sq.landingTicks > 0) { sq.landingTicks--; continue; }
    const P = st.players[sq.player];

    // (أ) المعالج (لا معالج في العشرة الحالية — تبقى الآلية للوحدات القادمة)
    if (u.healer) {
      let ally: Squad | null = null, worst = 1001;
      for (const s of st.squads) {
        if (s.player !== sq.player || s.id === sq.id) continue;
        const smax = s.memberHpCenti * ctx.units[s.unit].size;
        if (s.hpCenti >= smax) continue;
        if (dist(sq.x, sq.z, s.x, s.z) > 10000) continue;
        const frac = Math.floor((s.hpCenti * 1000) / smax);
        if (frac < worst || (frac === worst && ally && s.id < ally.id)) { worst = frac; ally = s; }
      }
      if (ally) {
        const d = dist(sq.x, sq.z, ally.x, ally.z);
        if (d > 4000) moveToward(sq, u, ally.x, ally.z, st, a);
        else {
          const alive = membersAlive(sq, u);
          const allyMax = ally.memberHpCenti * ctx.units[ally.unit].size;
          ally.hpCenti = Math.min(allyMax,
            ally.hpCenti + Math.floor((u.healCentiPerTick * alive * sq.dmgMill) / (u.size * 1000)));
          sq.attackedThisTick = true;
        }
        continue;
      }
    }

    // (ب) أمر Rally يتقدم على كل شيء
    if (sq.wayX !== null && sq.wayZ !== null) {
      if (dist(sq.x, sq.z, sq.wayX, sq.wayZ) <= 1500) { sq.wayX = null; sq.wayZ = null; }
      else { moveToward(sq, u, sq.wayX, sq.wayZ, st, a, 800); continue; }
    }

    // (ج) الهدف
    if (sq.targetId >= 0 && !st.squads.some(s => s.id === sq.targetId)) sq.targetId = -1;
    if (sq.targetId === -1 || (st.tick & 3) === 0) pickTarget(st, ctx, sq, u);

    const bt = buildingTarget(st, a, sq.player, u.flying);
    const btDist = dist(sq.x, sq.z, bt.x, bt.z) - bt.radius;

    if (sq.targetId === -2 || (sq.targetId === -1 && btDist <= u.rangeMm)) {
      if (btDist <= Math.max(u.rangeMm, 600) && btDist >= u.minRangeMm - bt.radius) {
        const alive = membersAlive(sq, u);
        let dmg = Math.max(1, Math.floor((u.hqDmgCentiPerTick * alive * sq.dmgMill) / (u.size * 1000)));
        dmg = Math.floor((dmg * sq.buffMill) / 1000);
        damageBuilding(st, ctx, (1 - sq.player) as PlayerIx, dmg, u.flying, events);
        sq.attackedThisTick = true;
        if ((st.phase as Phase) === 'ended') return events;
      } else {
        moveToward(sq, u, bt.x, bt.z, st, a);
      }
      if (u.charge) { sq.noTargetTicks = 0; }
      continue;
    }

    const tgt = sq.targetId >= 0 ? st.squads.find(s => s.id === sq.targetId)! : null;
    if (tgt) {
      const d = dist(sq.x, sq.z, tgt.x, tgt.z);
      const melee = u.rangeMm <= 1500;
      const holdAt = melee ? u.rangeMm : Math.floor((u.rangeMm * 9) / 10);
      if (d <= holdAt && d >= u.minRangeMm) {
        attack(st, ctx, sq, u, tgt, events);
        sq.noTargetTicks = 0;
      } else if (d < u.minRangeMm) {
        const s = sq.player === 0 ? -1 : 1;
        moveToward(sq, u, 0, s * a.hqZmm, st, a);
      } else {
        moveToward(sq, u, tgt.x, tgt.z, st, a);
        if (u.charge) { sq.noTargetTicks++; if (sq.noTargetTicks >= 60) sq.chargeReady = true; }
      }
    } else {
      // لا عدو: راية القيادة النشطة تجمع غير المشتبكين، وإلا تقدّم نحو القلعة
      if (u.charge) { sq.noTargetTicks++; if (sq.noTargetTicks >= 60) sq.chargeReady = true; }
      if (P.flagUntilTick > st.tick && dist(sq.x, sq.z, P.flagX, P.flagZ) > 2000) {
        moveToward(sq, u, P.flagX, P.flagZ, st, a);
      } else if (Math.abs(sq.z) < a.fieldZmm) {
        const advZ = sq.player === 0 ? a.fieldZmm + 2000 : -(a.fieldZmm + 2000);
        moveToward(sq, u, sq.x, advZ, st, a);
      } else {
        moveToward(sq, u, bt.x, bt.z, st, a);
      }
    }
  }

  // 4) دفاع القلعة الذاتي (يطال الطيران أيضاً)
  for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
    const s = p === 0 ? -1 : 1;
    const hx = 0, hz = s * a.hqZmm;
    let near: Squad | null = null, nd = Infinity;
    for (const e of st.squads) {
      if (e.player === p) continue;
      const d = dist(e.x, e.z, hx, hz);
      if (d < nd || (d === nd && near && e.id < near.id)) { nd = d; near = e; }
    }
    if (near && nd <= a.hqDefRangeMm + a.hqRadiusMm) {
      damageSquad(st, ctx, near, a.hqDefDmgCentiPerTick, p, events);
    }
  }

  // 5) السيطرة على الممرات + النشر المتقدم + النقاط
  const counts: number[][] = [[0, 0, 0], [0, 0, 0]];
  for (const s of st.squads) {
    if (s.landingTicks > 0 || Math.abs(s.z) > a.fieldZmm) continue;
    counts[s.player][sectorOf(s.x, a)]++;
  }
  for (let sec = 0 as SectorIx; sec <= 2; sec = (sec + 1) as SectorIx) {
    let ctl: -1 | 0 | 1 = -1;
    if (counts[0][sec] > 0 && counts[1][sec] === 0) ctl = 0;
    else if (counts[1][sec] > 0 && counts[0][sec] === 0) ctl = 1;
    st.sectorController[sec] = ctl;
    for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
      const P = st.players[p];
      if (ctl === p) {
        P.controlTicks[sec]++;
        if (!P.forward[sec] && P.controlTicks[sec] >= a.forwardHoldTicks) {
          P.forward[sec] = true;
          events.push({ t: 'forward', player: p, sector: sec });
        }
        if (st.tick >= a.graceTicks) {
          P.scoreMilli += sec === 1 ? a.scoreMidMilliPerTick : a.scoreSectorMilliPerTick;
        }
      } else {
        P.controlTicks[sec] = 0;
        P.forward[sec] = false;
      }
    }
  }
  st.midController = st.sectorController[1];

  // 6) المؤقت والأطوار وشروط النصر بالنقاط
  st.tick++;
  const diff = st.players[0].scoreMilli - st.players[1].scoreMilli;
  if (st.phase === 'main' && st.tick >= a.mainTicks) {
    if (Math.abs(diff) >= a.winMarginMainMilli) {
      endMatch(st, events, { winner: diff > 0 ? 0 : 1, reason: 'score' });
    } else {
      st.phase = 'overtime';
      events.push({ t: 'phase', phase: 'overtime' });
    }
  } else if (st.phase === 'overtime') {
    if (Math.abs(diff) >= a.winMarginOvertimeMilli) {
      endMatch(st, events, { winner: diff > 0 ? 0 : 1, reason: 'overtime_margin' });
    } else if (st.tick >= a.mainTicks + a.overtimeTicks) {
      const d0 = st.players[0].hqDamageDealtCenti, d1 = st.players[1].hqDamageDealtCenti;
      if (d0 !== d1) endMatch(st, events, { winner: d0 > d1 ? 0 : 1, reason: 'hq_damage' });
      else endMatch(st, events, { winner: -1, reason: 'draw' });
    }
  }
  return events;
}

function moveToward(
  sq: Squad, u: RtUnit, tx: number, tz: number, st: SimState, a: RtArena, extraMill = 1000
): void {
  let speed = u.speedMmTick;
  if (sq.slowUntilTick > st.tick) speed = Math.floor((speed * 650) / 1000);
  speed = Math.floor((speed * extraMill) / 1000);
  speed = Math.floor((speed * sq.buffMill) / 1000);
  // راية القيادة تسرّع من في نطاقها
  const P = st.players[sq.player];
  if (P.flagUntilTick > st.tick && dist(sq.x, sq.z, P.flagX, P.flagZ) <= a.flagRadiusMm) {
    speed = Math.floor((speed * 1200) / 1000);
  }
  const dx = tx - sq.x, dz = tz - sq.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1) return;
  sq.x += Math.round((dx * speed) / d);
  sq.z += Math.round((dz * speed) / d);
  // غير الطائر لا يتجاوز بوابة قائمة نحو الفناء
  const enemy = (1 - sq.player) as PlayerIx;
  if (!u.flying && st.players[enemy].gateHpCenti > 0) {
    const lim = a.gateZmm - 1200;
    if (sq.player === 0 && sq.z > lim) sq.z = lim;
    if (sq.player === 1 && sq.z < -lim) sq.z = -lim;
  }
  clampToField(sq, a, u.flying);
}

function attack(
  st: SimState, ctx: SimContext, sq: Squad, u: RtUnit, tgt: Squad, events: SimEvent[]
): void {
  const alive = membersAlive(sq, u);
  const tu = ctx.units[tgt.unit];
  let dmg = Math.floor((u.dmgCentiPerTick * alive * sq.dmgMill) / (u.size * 1000));
  dmg = Math.floor((dmg * counterMill(u, tu)) / 1000);
  dmg = Math.floor((dmg * sq.buffMill) / 1000);
  if (u.role === 'ranged') dmg = Math.floor((dmg * tu.fromRangedMill) / 1000);
  // Charge فرسان الجوف: الضربة الأولى بعد مسير حر ×1.8
  if (u.charge && sq.chargeReady) {
    dmg = Math.floor((dmg * 1800) / 1000);
    sq.chargeReady = false;
  }
  sq.attackedThisTick = true;

  if (u.areaRadiusMm > 0) {
    const cx = tgt.x, cz = tgt.z;
    const hit = st.squads.filter(s =>
      s.player !== sq.player && dist(s.x, s.z, cx, cz) <= u.areaRadiusMm);
    for (const h of hit.sort((x, y) => x.id - y.id)) {
      let hd = Math.floor((u.dmgCentiPerTick * alive * sq.dmgMill) / (u.size * 1000));
      hd = Math.floor((hd * counterMill(u, ctx.units[h.unit])) / 1000);
      hd = Math.floor((hd * ctx.units[h.unit].fromRangedMill) / 1000);
      hd = Math.floor((hd * sq.buffMill) / 1000);
      damageSquad(st, ctx, h, Math.max(1, hd), sq.player, events);
    }
    return;
  }
  if (u.slowMill > 0) {
    const hit = st.squads.filter(s =>
      s.player !== sq.player && dist(s.x, s.z, tgt.x, tgt.z) <= u.slowRadiusMm);
    for (const h of hit) h.slowUntilTick = st.tick + 20;
  }
  damageSquad(st, ctx, tgt, Math.max(1, dmg), sq.player, events);
}

function endMatch(st: SimState, events: SimEvent[], result: MatchResult): void {
  if (st.phase === 'ended') return;
  st.phase = 'ended';
  st.result = result;
  events.push({ t: 'end', result });
}

// ─── التجزئة والتسلسل ───────────────────────────────────────────

export function hashState(st: SimState): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    h ^= v & 0xffffffff;
    h = Math.imul(h, 0x01000193);
    h >>>= 0;
  };
  mix(st.tick); mix(st.phase === 'main' ? 1 : st.phase === 'overtime' ? 2 : 3);
  for (const P of st.players) {
    mix(P.cp); mix(P.hqHpCenti); mix(P.gateHpCenti); mix(P.scoreMilli); mix(P.regenCounter);
    mix(P.flagUntilTick); mix(P.flagReadyTick);
    for (const o of P.order) mix(o + 11);
    mix((P.forward[0] ? 1 : 0) | (P.forward[1] ? 2 : 0) | (P.forward[2] ? 4 : 0));
  }
  for (const s of st.squads.slice().sort((a, b) => a.id - b.id)) {
    mix(s.id); mix(s.x); mix(s.z); mix(s.hpCenti); mix(s.landingTicks);
    mix(s.chargeReady ? 7 : 3);
  }
  return h >>> 0;
}

export function serialize(st: SimState): string {
  return JSON.stringify(st);
}

export function deserialize(json: string): SimState {
  return JSON.parse(json) as SimState;
}
