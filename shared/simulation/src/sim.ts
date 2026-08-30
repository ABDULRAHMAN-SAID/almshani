// قلب المحاكاة الحتمية — خطوة ثابتة 20Hz، أعداد صحيحة، بلا عرض.
// نفس البذرة + نفس تسلسل الأوامر ⟹ نفس الحالة بتاً على العميل والخادم.
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
  players: { name: string; isBot: boolean; deck: string[] }[]
): SimState {
  const mk = (p: { name: string; isBot: boolean; deck: string[] }): PlayerState => ({
    name: p.name,
    isBot: p.isBot,
    cp: ctx.arena.cpStart,
    regenCounter: 0,
    deck: p.deck.slice(0, 7),
    musterReadyTick: [0, 0, 0, 0, 0, 0, 0],
    hqHpCenti: ctx.arena.hqHpCenti,
    hqDamageDealtCenti: 0,
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

function hqPos(player: PlayerIx, a: RtArena): { x: number; z: number } {
  return { x: 0, z: player === 0 ? -a.hqZmm : a.hqZmm };
}

function clampToField(s: { x: number; z: number }, a: RtArena): void {
  const m = a.halfWmm - 500;
  if (s.x < -m) s.x = -m;
  if (s.x > m) s.x = m;
  const zm = a.hqZmm - 500;
  if (s.z < -zm) s.z = -zm;
  if (s.z > zm) s.z = zm;
  // الجسر: القطاع الأوسط يضيق عند عبور المنتصف
  if (Math.abs(s.z) < a.bridgeZmm && Math.abs(s.x) <= a.sectorEdgeMm) {
    if (s.x < -a.bridgeHalfWmm) s.x = -a.bridgeHalfWmm;
    if (s.x > a.bridgeHalfWmm) s.x = a.bridgeHalfWmm;
  }
}

export function membersAlive(sq: Squad, u: RtUnit): number {
  return Math.max(0, Math.ceil(sq.hpCenti / u.memberHpCenti));
}

export function cpCap(st: SimState, a: RtArena): number {
  const decisive = st.phase === 'overtime' || st.tick >= a.mainTicks - 60 * 20;
  return decisive ? a.cpCapOvertime : a.cpCap;
}

// صلاحية موضع النشر — تُستخدم أيضاً في العميل لتلوين شبح النشر
export function deployValid(
  st: SimState, ctx: SimContext, player: PlayerIx, x: number, z: number
): boolean {
  const a = ctx.arena;
  if (Math.abs(x) > a.halfWmm - 500) return false;
  const zSigned = player === 0 ? z : -z; // نطبّع: القيم السالبة جهة اللاعب
  if (zSigned > a.deployForwardZmm) return false;
  if (zSigned < -(a.fieldZmm - 500)) return false;
  const sec = sectorOf(x, a);
  if (zSigned > -a.deployOwnZmm && !st.players[player].forward[sec]) return false;
  if (sec === 1 && Math.abs(z) < a.bridgeZmm && Math.abs(x) > a.bridgeHalfWmm) return false;
  return true;
}

// ─── تطبيق الأوامر (نوايا مصدَّق عليها بالمحاكاة نفسها) ─────────

export function applyCommand(
  st: SimState, ctx: SimContext, cmd: Command, events: SimEvent[]
): boolean {
  if (st.phase === 'ended') return false;
  const a = ctx.arena;
  const P = st.players[cmd.player];
  switch (cmd.type) {
    case 'deploy': {
      if (cmd.slot < 0 || cmd.slot >= P.deck.length) return reject(events, cmd.player, 'slot');
      const u = ctx.units[P.deck[cmd.slot]];
      if (!u) return reject(events, cmd.player, 'unit');
      if (P.cp < u.cost) return reject(events, cmd.player, 'cp');
      if (st.tick < P.musterReadyTick[cmd.slot]) return reject(events, cmd.player, 'muster');
      const live = st.squads.filter(s => s.player === cmd.player).length;
      if (live >= a.maxLiveSquads) return reject(events, cmd.player, 'cap');
      if (!deployValid(st, ctx, cmd.player, cmd.x, cmd.z)) return reject(events, cmd.player, 'zone');
      P.cp -= u.cost;
      P.musterReadyTick[cmd.slot] = st.tick + u.musterTicks;
      const sq: Squad = {
        id: st.nextSquadId++,
        player: cmd.player,
        unit: u.id,
        slot: cmd.slot,
        x: cmd.x, z: cmd.z,
        hpCenti: u.squadHpCenti,
        landingTicks: a.landingTicks,
        targetId: -1,
        wayX: null, wayZ: null,
        rallyReadyTick: 0,
        slowUntilTick: 0,
        attackedThisTick: false
      };
      clampToField(sq, a);
      st.squads.push(sq);
      events.push({ t: 'deploy', player: cmd.player, squadId: sq.id, unit: u.id, x: sq.x, z: sq.z });
      return true;
    }
    case 'rally': {
      const sq = st.squads.find(s => s.id === cmd.squadId && s.player === cmd.player);
      if (!sq || sq.landingTicks > 0) return reject(events, cmd.player, 'squad');
      if (st.tick < sq.rallyReadyTick) return reject(events, cmd.player, 'rally_cd');
      sq.wayX = cmd.x; sq.wayZ = cmd.z;
      clampToField({ x: sq.wayX, z: sq.wayZ } as Squad, a);
      sq.rallyReadyTick = st.tick + a.rallyCooldownTicks;
      sq.targetId = -1;
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

// ─── الضرر والقتل ────────────────────────────────────────────────

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

function damageHq(
  st: SimState, ctx: SimContext, defender: PlayerIx, dmgCenti: number, events: SimEvent[]
): void {
  const D = st.players[defender];
  const A = st.players[(1 - defender) as PlayerIx];
  const applied = Math.min(dmgCenti, D.hqHpCenti);
  if (applied <= 0) return;
  D.hqHpCenti -= applied;
  // نقاط ضرر المقر: 1% = 2000 ملي-نقطة ⇒ 0.5 ملي لكل سنتي-صحة (مقر 4000)
  const before = A.hqDamageDealtCenti;
  A.hqDamageDealtCenti += applied;
  A.scoreMilli += (A.hqDamageDealtCenti >> 1) - (before >> 1);
  events.push({ t: 'hq', player: defender, dmgCenti: applied });
  if (D.hqHpCenti <= 0) {
    endMatch(st, events, { winner: (1 - defender) as PlayerIx, reason: 'hq' });
  }
}

// معدِّل الكاونتر: الأفضلية من أي من الجهتين (بلا مضاعفة مزدوجة) ‰
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

// ─── اختيار الأهداف ──────────────────────────────────────────────

function pickTarget(st: SimState, ctx: SimContext, sq: Squad, u: RtUnit): void {
  if (u.buildingsOnly) { sq.targetId = -2; return; }
  const enemies = st.squads.filter(s => s.player !== sq.player);
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

// ─── خطوة واحدة (تكّة 50ms) ──────────────────────────────────────

export function step(st: SimState, ctx: SimContext, inputs: Command[]): SimEvent[] {
  const events: SimEvent[] = [];
  if (st.phase === 'ended') return events;
  const a = ctx.arena;

  for (const cmd of inputs) applyCommand(st, ctx, cmd, events);
  if ((st.phase as Phase) === 'ended') return events; // قد ينهيها انسحاب ضمن الأوامر

  // 1) تجدد نقاط القيادة (مكافأة السيطرة على الوسط)
  for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
    const P = st.players[p];
    const cap = cpCap(st, a);
    if (P.cp < cap) {
      P.regenCounter++;
      const need = st.midController === p ? a.regenTicksMid : a.regenTicks;
      if (P.regenCounter >= need) { P.cp++; P.regenCounter = 0; }
    } else P.regenCounter = 0;
  }

  // 2) الفرق: هبوط، أهداف، حركة، هجوم — بترتيب معرّفات ثابت (حتمية)
  const byId = st.squads.slice().sort((x, y) => x.id - y.id);
  for (const sq of byId) {
    if (st.squads.indexOf(sq) < 0) continue; // قُتلت هذه التكّة
    sq.attackedThisTick = false;
    const u = ctx.units[sq.unit];
    if (sq.landingTicks > 0) { sq.landingTicks--; continue; }

    // (أ) المعالج: تضميد أقرب حليف الأكثر تضرراً
    if (u.healer) {
      let ally: Squad | null = null, worst = 1001;
      for (const s of st.squads) {
        if (s.player !== sq.player || s.id === sq.id) continue;
        const su = ctx.units[s.unit];
        if (s.hpCenti >= su.squadHpCenti) continue;
        if (dist(sq.x, sq.z, s.x, s.z) > 10000) continue;
        const frac = Math.floor((s.hpCenti * 1000) / su.squadHpCenti);
        if (frac < worst || (frac === worst && ally && s.id < ally.id)) { worst = frac; ally = s; }
      }
      if (ally) {
        const d = dist(sq.x, sq.z, ally.x, ally.z);
        if (d > 4000) moveToward(sq, u, ally.x, ally.z, st, a);
        else {
          const au = ctx.units[ally.unit];
          const alive = membersAlive(sq, u);
          ally.hpCenti = Math.min(au.squadHpCenti,
            ally.hpCenti + Math.floor((u.healCentiPerTick * alive) / u.size));
          sq.attackedThisTick = true;
        }
        continue;
      }
      // لا جرحى: يرافق التقدم
    }

    // (ب) أمر Rally يتقدم على كل شيء
    if (sq.wayX !== null && sq.wayZ !== null) {
      if (dist(sq.x, sq.z, sq.wayX, sq.wayZ) <= 1500) { sq.wayX = null; sq.wayZ = null; }
      else { moveToward(sq, u, sq.wayX, sq.wayZ, st, a, 800); continue; }
    }

    // (ج) الهدف
    if (sq.targetId >= 0 && !st.squads.some(s => s.id === sq.targetId)) sq.targetId = -1;
    if (sq.targetId === -1 || (st.tick & 3) === 0) pickTarget(st, ctx, sq, u);

    const enemyHq = hqPos((1 - sq.player) as PlayerIx, a);
    const hqDist = dist(sq.x, sq.z, enemyHq.x, enemyHq.z) - a.hqRadiusMm;

    if (sq.targetId === -2 || (sq.targetId === -1 && hqDist <= u.rangeMm)) {
      // مهاجمة المقر
      if (hqDist <= Math.max(u.rangeMm, 600) && hqDist >= u.minRangeMm - a.hqRadiusMm) {
        const alive = membersAlive(sq, u);
        damageHq(st, ctx, (1 - sq.player) as PlayerIx,
          Math.max(1, Math.floor((u.hqDmgCentiPerTick * alive) / u.size)), events);
        sq.attackedThisTick = true;
      } else {
        moveToward(sq, u, enemyHq.x, enemyHq.z, st, a);
      }
      continue;
    }

    const tgt = sq.targetId >= 0 ? st.squads.find(s => s.id === sq.targetId)! : null;
    if (tgt) {
      const d = dist(sq.x, sq.z, tgt.x, tgt.z);
      const melee = u.rangeMm <= 1500;
      const holdAt = melee ? u.rangeMm : Math.floor((u.rangeMm * 9) / 10);
      if (d <= holdAt && d >= u.minRangeMm) {
        attack(st, ctx, sq, u, tgt, events);
      } else if (d < u.minRangeMm) {
        // أعمى قريباً (منجنيق): يتراجع خطوة نحو مقره
        const own = hqPos(sq.player, a);
        moveToward(sq, u, own.x, own.z, st, a);
      } else {
        moveToward(sq, u, tgt.x, tgt.z, st, a);
      }
    } else {
      // لا عدو قريباً: تقدّم في قطاعك نحو مقر الخصم
      const advZ = sq.player === 0 ? a.fieldZmm + 2000 : -(a.fieldZmm + 2000);
      if (Math.abs(sq.z) < a.fieldZmm) moveToward(sq, u, sq.x, advZ, st, a);
      else moveToward(sq, u, enemyHq.x, enemyHq.z, st, a);
    }
  }

  // 3) دفاع المقرين الذاتي
  for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
    const hq = hqPos(p, a);
    let near: Squad | null = null, nd = Infinity;
    for (const s of st.squads) {
      if (s.player === p) continue;
      const d = dist(s.x, s.z, hq.x, hq.z);
      if (d < nd || (d === nd && near && s.id < near.id)) { nd = d; near = s; }
    }
    if (near && nd <= a.hqDefRangeMm + a.hqRadiusMm) {
      damageSquad(st, ctx, near, a.hqDefDmgCentiPerTick, p, events);
    }
  }

  // 4) السيطرة على القطاعات + النشر المتقدم + النقاط
  const counts: number[][] = [[0, 0, 0], [0, 0, 0]];
  for (const s of st.squads) {
    if (s.landingTicks > 0 || Math.abs(s.z) > a.fieldZmm) continue;
    counts[s.player][sectorOf(s.x, a)]++;
  }
  for (let sec = 0 as SectorIx; sec <= 2; sec = (sec + 1) as SectorIx) {
    let ctrl: -1 | 0 | 1 = -1;
    if (counts[0][sec] > 0 && counts[1][sec] === 0) ctrl = 0;
    else if (counts[1][sec] > 0 && counts[0][sec] === 0) ctrl = 1;
    st.sectorController[sec] = ctrl;
    for (let p = 0 as PlayerIx; p <= 1; p = (p + 1) as PlayerIx) {
      const P = st.players[p];
      if (ctrl === p) {
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

  // 5) المؤقت والأطوار وشروط النصر بالنقاط
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
  const dx = tx - sq.x, dz = tz - sq.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1) return;
  sq.x += Math.round((dx * speed) / d);
  sq.z += Math.round((dz * speed) / d);
  clampToField(sq, a);
}

function attack(
  st: SimState, ctx: SimContext, sq: Squad, u: RtUnit, tgt: Squad, events: SimEvent[]
): void {
  const alive = membersAlive(sq, u);
  const tu = ctx.units[tgt.unit];
  let dmg = Math.floor((u.dmgCentiPerTick * alive) / u.size);
  dmg = Math.floor((dmg * counterMill(u, tu)) / 1000);
  if (u.role === 'ranged') dmg = Math.floor((dmg * tu.fromRangedMill) / 1000);
  sq.attackedThisTick = true;

  if (u.areaRadiusMm > 0) {
    // ضرر منطقة حول الهدف (رماة اللهب)
    const cx = tgt.x, cz = tgt.z;
    const hit = st.squads.filter(s =>
      s.player !== sq.player && dist(s.x, s.z, cx, cz) <= u.areaRadiusMm);
    for (const h of hit.sort((x, y) => x.id - y.id)) {
      let hd = Math.floor((u.dmgCentiPerTick * alive) / u.size);
      hd = Math.floor((hd * counterMill(u, ctx.units[h.unit])) / 1000);
      hd = Math.floor((hd * ctx.units[h.unit].fromRangedMill) / 1000);
      damageSquad(st, ctx, h, Math.max(1, hd), sq.player, events);
    }
    return;
  }
  if (u.slowMill > 0) {
    // ساحرة الصقيع: إبطاء منطقة حول الهدف + ضرر رمزي
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

// ─── التجزئة والتسلسل (كشف الانحراف + إعادة الاتصال) ─────────────

export function hashState(st: SimState): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    h ^= v & 0xffffffff;
    h = Math.imul(h, 0x01000193);
    h >>>= 0;
  };
  mix(st.tick); mix(st.phase === 'main' ? 1 : st.phase === 'overtime' ? 2 : 3);
  for (const P of st.players) {
    mix(P.cp); mix(P.hqHpCenti); mix(P.scoreMilli); mix(P.regenCounter);
    mix((P.forward[0] ? 1 : 0) | (P.forward[1] ? 2 : 0) | (P.forward[2] ? 4 : 0));
  }
  for (const s of st.squads.slice().sort((a, b) => a.id - b.id)) {
    mix(s.id); mix(s.x); mix(s.z); mix(s.hpCenti); mix(s.landingTicks);
  }
  return h >>> 0;
}

export function serialize(st: SimState): string {
  return JSON.stringify(st);
}

export function deserialize(json: string): SimState {
  return JSON.parse(json) as SimState;
}
