// مشغّل المحاكاة الجماعية — توازن بلا رندر: مئات المباريات بوت-ضد-بوت.
// npm run sim -- [عدد المباريات]
import { UNIT_DEFS, ARENAS, COMMANDERS, DEFAULT_DECK, UNIT_IDS } from '../../shared/definitions/index';
import {
  buildUnits, buildArena, createMatch, step, createBot, botThink
} from '../../shared/simulation/src/index';
import type { Command } from '../../shared/simulation/src/index';
import { rngInt } from '../../shared/simulation/src/rng';

const units = buildUnits(UNIT_DEFS);
const arena = buildArena(ARENAS.border_fort, COMMANDERS.sera);
const ctx = { units, arena };
const N = parseInt(process.argv[2] ?? '60', 10);

function randomDeck(seed: number): string[] {
  let rng = seed;
  const pool = UNIT_IDS.slice();
  const deck: string[] = [];
  while (deck.length < 8) {
    const r = rngInt(rng, pool.length); rng = r.state;
    deck.push(pool.splice(r.value, 1)[0]);
  }
  return deck;
}

const reasons: Record<string, number> = {};
const unitWins: Record<string, number> = {};
const unitGames: Record<string, number> = {};
let totalTicks = 0, hqWins = 0;

for (let m = 0; m < N; m++) {
  const d0 = m % 3 === 0 ? DEFAULT_DECK : randomDeck(m * 991 + 7);
  const d1 = randomDeck(m * 613 + 3);
  const st = createMatch(ctx, m * 7919 + 11, [
    { name: 'أ', isBot: true, deck: d0 },
    { name: 'ب', isBot: true, deck: d1 }
  ]);
  const b0 = createBot(m * 31 + 1), b1 = createBot(m * 53 + 2);
  const maxTicks = arena.mainTicks + arena.overtimeTicks + 10;
  while (st.phase !== 'ended' && st.tick < maxTicks) {
    const cmds: Command[] = [...botThink(b0, st, ctx, 0), ...botThink(b1, st, ctx, 1)];
    step(st, ctx, cmds);
  }
  const res = st.result!;
  totalTicks += st.tick;
  reasons[res.reason] = (reasons[res.reason] ?? 0) + 1;
  if (res.reason === 'hq') hqWins++;
  for (const [pIx, deck] of [[0, d0], [1, d1]] as [number, string[]][]) {
    for (const u of deck) {
      unitGames[u] = (unitGames[u] ?? 0) + 1;
      if (res.winner === pIx) unitWins[u] = (unitWins[u] ?? 0) + 1;
    }
  }
}

console.log(`── ${N} مباراة بوت-ضد-بوت ──`);
console.log(`متوسط مدة المباراة: ${(totalTicks / N / 20).toFixed(1)} ثانية`);
console.log(`أسباب الحسم: ${JSON.stringify(reasons)}`);
console.log(`نسبة الحسم بتدمير المقر: ${((hqWins / N) * 100).toFixed(0)}%`);
console.log('\nمعدل فوز المباريات التي تضم الوحدة (الصحي 45–55% — راجع UNIT_SYSTEM §8):');
for (const u of UNIT_IDS) {
  const g = unitGames[u] ?? 0, w = unitWins[u] ?? 0;
  const wr = g ? ((w / g) * 100).toFixed(0) : '—';
  const flag = g && (w / g < 0.40 || w / g > 0.60) ? '  ⚠' : '';
  console.log(`  ${u.padEnd(16)} ${String(g).padStart(4)} مباراة  فوز ${wr}%${flag}`);
}
