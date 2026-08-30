// بوت معلَن — أوامره تمر عبر تيار الأوامر العادي فلا تمس الحتمية.
// يتعامل مع يد الأربع من دورة الثمانية، ويستخدم راية القيادة أحياناً.
import type { Command, PlayerIx, SimState } from './types';
import type { SimContext } from './sim';
import { deployValid, handOf, sectorOf } from './sim';
import { rngInt } from './rng';

export interface BotState { rng: number; nextThinkTick: number; }

export function createBot(seed: number): BotState {
  return { rng: seed | 0, nextThinkTick: 40 };
}

export function botThink(
  bot: BotState, st: SimState, ctx: SimContext, player: PlayerIx
): Command[] {
  if (st.phase === 'ended' || st.tick < bot.nextThinkTick) return [];
  const a = ctx.arena;
  const P = st.players[player];
  const out: Command[] = [];
  const r = (n: number) => { const x = rngInt(bot.rng, n); bot.rng = x.state; return x.value; };
  bot.nextThinkTick = st.tick + 30 + r(30);

  const enemies = st.squads.filter(s => s.player !== player);
  const mine = st.squads.filter(s => s.player === player);
  const sign = player === 0 ? -1 : 1;

  // مهارة القائد على عنقود متقدم
  if (!P.skillUsed && st.tick >= a.skillChargeTicks) {
    for (const e of enemies) {
      const advanced = player === 0 ? e.z < 0 : e.z > 0;
      const cluster = enemies.filter(o =>
        Math.abs(o.x - e.x) < a.skillRadiusMm && Math.abs(o.z - e.z) < a.skillRadiusMm);
      if (advanced && cluster.length >= 2) {
        out.push({ type: 'skill', player, x: e.x, z: e.z });
        break;
      }
    }
  }

  // راية القيادة: عند امتلاك 3+ فرق غير مشتبكة، اجمعها نحو الوسط الأمامي
  if (st.tick >= P.flagReadyTick && mine.length >= 3 && r(3) === 0) {
    out.push({ type: 'flag', player, x: 0, z: -sign * 2000 });
  }

  // اختيار خانة يد: كاونتر بسيط ثم عشوائي مستطاع
  const roleCount: Record<string, number> = {};
  for (const e of enemies) {
    const eu = ctx.units[e.unit];
    roleCount[eu.role] = (roleCount[eu.role] ?? 0) + 1;
    if (eu.flying) roleCount['flying'] = (roleCount['flying'] ?? 0) + 1;
  }
  const hand = handOf(P);
  const affordable: number[] = [];
  for (let slot = 0; slot < hand.length; slot++) {
    const u = ctx.units[P.deck[hand[slot]]];
    if (u && P.cp >= u.cost) affordable.push(slot);
  }
  if (affordable.length > 0 && mine.length < a.maxLiveSquads) {
    let slot = -1;
    const want = (pred: (id: string) => boolean) =>
      affordable.find(s => pred(P.deck[hand[s]]));
    if ((roleCount['cavalry'] ?? 0) > 0) {
      const s = want(id => ctx.units[id].tags.indexOf('anti_cavalry') >= 0);
      if (s !== undefined) slot = s;
    }
    if (slot < 0 && (roleCount['flying'] ?? 0) > 0) {
      const s = want(id => ctx.units[id].role === 'ranged');
      if (s !== undefined) slot = s;
    }
    if (slot < 0 && (roleCount['ranged'] ?? 0) >= 2) {
      const s = want(id => ctx.units[id].role === 'cavalry' || ctx.units[id].tags.indexOf('assassin') >= 0);
      if (s !== undefined) slot = s;
    }
    if (slot < 0 && (roleCount['siege'] ?? 0) > 0) {
      const s = want(id => ctx.units[id].role === 'cavalry' || ctx.units[id].role === 'frontline');
      if (s !== undefined) slot = s;
    }
    if (slot < 0) slot = affordable[r(affordable.length)];

    const invader = enemies.find(e => (player === 0 ? e.z < -a.deployOwnZmm : e.z > a.deployOwnZmm));
    let x: number, z: number;
    if (invader) {
      x = invader.x + (r(3) - 1) * 1500;
      z = invader.z + sign * 3000;
    } else {
      const secWeights = [0, 1, 2].map(sec =>
        1 + enemies.filter(e => sectorOf(e.x, a) === sec).length * 2 + (sec === 1 ? 1 : 0));
      const total = secWeights[0] + secWeights[1] + secWeights[2];
      let pick = r(total), sec = 0;
      while (pick >= secWeights[sec]) { pick -= secWeights[sec]; sec++; }
      const centers = [-12000, 0, 12000];
      x = centers[sec] + (r(5) - 2) * 1200;
      const fwd = P.forward[sec];
      z = sign * (fwd ? 4000 + r(3000) : a.deployOwnZmm + 2000 + r(6000));
    }
    if (deployValid(st, ctx, player, x, z)) {
      out.push({ type: 'deploy', player, slot, x, z });
    } else {
      const zSafe = sign * (a.deployOwnZmm + 4000);
      const xSafe = (r(2) === 0 ? -1 : 1) * 12000;
      if (deployValid(st, ctx, player, xSafe, zSafe)) {
        out.push({ type: 'deploy', player, slot, x: xSafe, z: zSafe });
      }
    }
  }
  return out;
}
