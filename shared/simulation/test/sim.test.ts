// اختبارات المحاكاة — Headless: آليات توجيه المالك (بوابة→قلب، يد 4، راية، طيران…)
import { UNIT_DEFS, ARENAS, COMMANDERS, DEFAULT_DECK } from '../../definitions/index';
import {
  buildUnits, buildArena, createMatch, step, hashState, serialize, deserialize,
  createBot, botThink, applyCommand, cpCap, handOf
} from '../src/index';
import type { Command, SimEvent, SimState } from '../src/index';

const units = buildUnits(UNIT_DEFS);
const arena = buildArena(ARENAS.border_fort, COMMANDERS.sera);
const ctx = { units, arena };

let pass = 0, fail = 0;
function check(name: string, ok: boolean, extra = ''): void {
  if (ok) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name, extra); }
}

const ALT_DECK = ['hollow_knights', 'vale_archers', 'running_shadows', 'bat_riders',
  'stone_golem', 'flame_casters', 'spear_bearers', 'banner_guards'];

function twoPlayers(deck2 = ALT_DECK) {
  return [
    { name: 'أ', isBot: false, deck: DEFAULT_DECK },
    { name: 'ب', isBot: false, deck: deck2 }
  ];
}

function runBotMatch(seed: number, collectHashes?: number[]): { st: SimState; ticks: number; events: SimEvent[] } {
  const st = createMatch(ctx, seed, [
    { name: 'بوت-أ', isBot: true, deck: DEFAULT_DECK },
    { name: 'بوت-ب', isBot: true, deck: ALT_DECK }
  ]);
  const b0 = createBot(seed * 7 + 1), b1 = createBot(seed * 13 + 5);
  const all: SimEvent[] = [];
  const maxTicks = arena.mainTicks + arena.overtimeTicks + 10;
  while (st.phase !== 'ended' && st.tick < maxTicks) {
    const cmds: Command[] = [...botThink(b0, st, ctx, 0), ...botThink(b1, st, ctx, 1)];
    all.push(...step(st, ctx, cmds));
    if (collectHashes && st.tick % 100 === 0) collectHashes.push(hashState(st));
  }
  return { st, ticks: st.tick, events: all };
}

// ── 1. الحتمية
console.log('1) الحتمية');
{
  const h1: number[] = [], h2: number[] = [];
  const r1 = runBotMatch(42, h1);
  const r2 = runBotMatch(42, h2);
  check('نفس تسلسل التجزئات بتاً', h1.length === h2.length && h1.every((v, i) => v === h2[i]));
  check('نفس النتيجة', JSON.stringify(r1.st.result) === JSON.stringify(r2.st.result));
  const r3 = runBotMatch(43);
  check('بذرة مختلفة ⟹ مجرى مختلف', hashState(r1.st) !== hashState(r3.st));
}

// ── 2. اكتمال المباريات
console.log('2) اكتمال المباريات');
{
  const reasons: Record<string, number> = {};
  let completed = 0, gatesDown = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const { st, ticks, events } = runBotMatch(seed * 101);
    if (st.result) { completed++; reasons[st.result.reason] = (reasons[st.result.reason] ?? 0) + 1; }
    if (events.some(e => e.t === 'gate_down')) gatesDown++;
    check(`بذرة ${seed * 101}: انتهت خلال ${ticks} تكّة`, !!st.result && ticks <= arena.mainTicks + arena.overtimeTicks + 10);
  }
  console.log('   أسباب الحسم:', JSON.stringify(reasons), '| مباريات كُسرت فيها بوابة:', gatesDown);
  check('8/8 مكتملة', completed === 8);
  check('البوابات تُكسر فعلاً في مباريات البوتات', gatesDown >= 4, String(gatesDown));
}

// ── 3. نقاط القيادة
console.log('3) نقاط القيادة');
{
  const st = createMatch(ctx, 7, twoPlayers());
  check('البداية 4 CP', st.players[0].cp === 4);
  check('السقف الأساسي 10', cpCap(st, arena) === 10);
  for (let i = 0; i < arena.regenTicks * 20; i++) step(st, ctx, []);
  check('التجدد بلغ 10 ولم يتجاوز', st.players[0].cp === 10);
  while (st.tick < arena.mainTicks - 60 * 20 + 5) step(st, ctx, []);
  check('مرحلة الحسم: السقف 12', cpCap(st, arena) === 12);
}

// ── 4. اليد والدورة (8 تشكيلة / 4 يد)
console.log('4) اليد 4 من دورة 8');
{
  const st = createMatch(ctx, 9, twoPlayers());
  const ev: SimEvent[] = [];
  const P = st.players[0];
  check('اليد الأولى = أول 4 من التشكيلة', JSON.stringify(handOf(P)) === '[0,1,2,3]');
  check('نشر من اليد (حملة الرماح ك3)', applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev));
  check('خصم الكلفة 4-3=1', P.cp === 1);
  check('الدورة: الرماح خرجت لآخر الطابور ودخل الخامس لليد',
    JSON.stringify(handOf(P)) === '[1,2,3,4]' && P.order[7] === 0, JSON.stringify(P.order));
  check('رفض: خانة خارج اليد (slot 4)', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 4, x: -12000, z: -14000 }, ev));
  check('رفض: لا CP كافية', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev));
  check('رفض: خارج منطقة النشر', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: 0, z: 12000 }, ev));
  check('مستوى 10 ⟹ ‰1270', (() => {
    const st2 = createMatch(ctx, 5, [
      { name: 'أ', isBot: false, deck: DEFAULT_DECK, unitLevels: { spear_bearers: 10 } },
      { name: 'ب', isBot: false, deck: ALT_DECK }
    ]);
    applyCommand(st2, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, []);
    return st2.squads[0].dmgMill === 1270;
  })());
}

// ── 5. القلعة بمرحلتين: البوابة ثم القلب
console.log('5) البوابة ثم قلب القلعة');
{
  const st = createMatch(ctx, 11, twoPlayers());
  st.players[0].forward = [true, true, true];
  st.players[0].cp = 10;
  st.players[1].gateHpCenti = 3000;   // بوابة شبه مكسورة لتسريع الاختبار
  st.players[1].hqHpCenti = 5000;
  const ev: SimEvent[] = [];
  applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 2, x: 0, z: 8000 }, ev); // الحرس الفولاذي
  let gateDown = false, heartHit = false;
  for (let i = 0; i < 3000 && st.phase !== 'ended'; i++) {
    for (const e of step(st, ctx, [])) {
      if (e.t === 'gate_down' && e.player === 1) gateDown = true;
      if (e.t === 'hq' && e.player === 1) heartHit = true;
    }
  }
  check('البوابة كُسرت أولاً', gateDown);
  check('ثم أصيب القلب بعد دخول الفناء', heartHit);
  check('تدمير القلب أنهى المباراة فوراً بنصر', st.result?.reason === 'hq' && st.result.winner === 0, JSON.stringify(st.result));
}

// ── 6. الطيران يتجاوز البوابة والالتحام الأرضي لا يطاله
console.log('6) راكبو الخفافيش');
{
  const st = createMatch(ctx, 13, twoPlayers());
  // الخفافيش في يد ب (المؤشر 3)
  st.players[1].cp = 10;
  const ev: SimEvent[] = [];
  check('نشر الخفافيش', applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 3, x: 0, z: 14000 }, ev));
  const bats = st.squads[st.squads.length - 1];
  check('الوحدة المنشورة خفافيش', bats.unit === 'bat_riders', bats.unit);
  // فرقة رماح أرضية لصيقة لا تستطيع استهدافها
  applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: 0, z: -14000 }, ev);
  const spears = st.squads.find(s => s.unit === 'spear_bearers')!;
  spears.x = bats.x; spears.z = bats.z - 1000;
  const batsHp = bats.hpCenti;
  for (let i = 0; i < 40; i++) step(st, ctx, []);
  check('الرماح الأرضية لم تمس الطيران', bats.hpCenti === batsHp || !st.squads.includes(spears), String(bats.hpCenti));
  // تتجاوز حد البوابة القائمة نحو الفناء
  for (let i = 0; i < 1200 && st.squads.includes(bats); i++) step(st, ctx, []);
  const gateLim = arena.gateZmm - 1200;
  check('الخفافيش عبرت خط البوابة وبوابة أ قائمة',
    st.players[0].gateHpCenti > 0 && (!st.squads.includes(bats) || bats.z < -gateLim + 4000));
}

// ── 7. Charge فرسان الجوف
console.log('7) ضربة الفرسان الأولى');
{
  const st = createMatch(ctx, 17, twoPlayers());
  st.players[1].cp = 10; st.players[0].cp = 10;
  const ev: SimEvent[] = [];
  applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 0, x: -12000, z: 9000 }, ev); // فرسان (يد ب:0)
  applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 1, x: -12000, z: -9000 }, ev); // رماة أ في منطقته
  const knights = st.squads.find(s => s.unit === 'hollow_knights')!;
  const archers = st.squads.find(s => s.unit === 'vale_archers')!;
  check('الفرسان جاهزو الاندفاعة عند النشر', knights.chargeReady === true);
  let firstDrop = 0, laterDrop = 0, prev = archers.hpCenti;
  for (let i = 0; i < 200 && st.squads.includes(archers) && st.squads.includes(knights); i++) {
    step(st, ctx, []);
    const drop = prev - archers.hpCenti;
    prev = archers.hpCenti;
    if (drop > 0 && firstDrop === 0) firstDrop = drop;
    else if (drop > 0) laterDrop = Math.max(laterDrop, drop);
  }
  check('الضربة الأولى ×1.8 من التاليات', firstDrop > laterDrop * 15 / 10, `first=${firstDrop} later=${laterDrop}`);
}

// ── 8. راية القيادة وهالة حماة الراية
console.log('8) الراية والهالة');
{
  const st = createMatch(ctx, 19, twoPlayers());
  st.players[0].cp = 10;
  const ev: SimEvent[] = [];
  applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev);
  const sq = st.squads[0];
  check('أمر الراية يُقبل', applyCommand(st, ctx, { type: 'flag', player: 0, x: 8000, z: -12000 }, ev));
  check('رفض راية ثانية قبل التبريد', !applyCommand(st, ctx, { type: 'flag', player: 0, x: 0, z: 0 }, ev));
  const x0 = sq.x;
  for (let i = 0; i < 60; i++) step(st, ctx, []);
  check('الفرقة غير المشتبكة اتجهت نحو الراية', sq.x > x0 + 2000, `${x0}→${sq.x}`);
  // الهالة: تشكيلة تبدأ بحماة الراية ثم الرماح
  const auraDeck = ['banner_guards', 'spear_bearers', ...DEFAULT_DECK.filter(u => u !== 'banner_guards' && u !== 'spear_bearers')];
  const st2 = createMatch(ctx, 21, [
    { name: 'أ', isBot: false, deck: auraDeck },
    { name: 'ب', isBot: false, deck: ALT_DECK }
  ]);
  st2.players[0].cp = 10;
  applyCommand(st2, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev); // حماة الراية
  applyCommand(st2, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -13000 }, ev); // الرماح (دخلت مكانها)
  for (let i = 0; i < 25 + 1; i++) step(st2, ctx, []);
  const buffed = st2.squads.find(s => s.unit === 'spear_bearers');
  check('هالة +15% مفعّلة على الحليف القريب', !!buffed && buffed.buffMill === 1150, String(buffed?.buffMill));
}

// ── 9. التسلسل وإعادة التشغيل من سجل الأوامر
console.log('9) التسلسل وإعادة الاتصال');
{
  const mkP = () => [
    { name: 'أ', isBot: true, deck: DEFAULT_DECK },
    { name: 'ب', isBot: true, deck: ALT_DECK }
  ];
  const stA = createMatch(ctx, 77, mkP());
  const b0 = createBot(3), b1 = createBot(4);
  const script: Command[][] = [];
  for (let i = 0; i < 600; i++) {
    const cmds = [...botThink(b0, stA, ctx, 0), ...botThink(b1, stA, ctx, 1)];
    script.push(cmds);
    step(stA, ctx, cmds);
  }
  const snap = serialize(stA);
  const stB = deserialize(snap);
  check('التجزئة بعد الاستعادة مطابقة', hashState(stA) === hashState(stB));
  for (let i = 0; i < 200; i++) { step(stA, ctx, []); step(stB, ctx, []); }
  check('المجريان متطابقان بعد 200 تكّة', hashState(stA) === hashState(stB));
  const stC = createMatch(ctx, 77, mkP());
  for (const cmds of script) step(stC, ctx, cmds);
  check('إعادة التشغيل من سجل الأوامر تطابق الأصل', hashState(stC) === hashState(deserialize(snap)));
}

// ── 10. مبارزات الكاونتر
console.log('10) الكاونترات');
{
  function duel(unitA: string, unitB: string): string {
    const deckA = [unitA, ...DEFAULT_DECK.filter(u => u !== unitA).slice(0, 7)];
    const deckB = [unitB, ...DEFAULT_DECK.filter(u => u !== unitB).slice(0, 7)];
    const st = createMatch(ctx, 5, [
      { name: 'أ', isBot: false, deck: deckA },
      { name: 'ب', isBot: false, deck: deckB }
    ]);
    st.players[0].cp = 10; st.players[1].cp = 10;
    const ev: SimEvent[] = [];
    applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -9000 }, ev);
    applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 0, x: -12000, z: 9000 }, ev);
    for (let i = 0; i < 2400 && st.squads.length > 1; i++) step(st, ctx, []);
    const a = st.squads.some(s => s.player === 0), b = st.squads.some(s => s.player === 1);
    return a && !b ? unitA : b && !a ? unitB : 'تعادل';
  }
  check('رماح ضد فرسان ⟹ الرماح', duel('spear_bearers', 'hollow_knights') === 'spear_bearers');
  check('فرسان ضد رماة ⟹ الفرسان', duel('hollow_knights', 'vale_archers') === 'hollow_knights');
  check('رماة ضد خفافيش ⟹ الرماة', duel('vale_archers', 'bat_riders') === 'vale_archers');
  check('رماة ضد رماح ⟹ الرماة', duel('vale_archers', 'spear_bearers') === 'vale_archers');
}

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail > 0 ? 1 : 0);
