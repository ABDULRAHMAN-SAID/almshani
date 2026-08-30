// اختبارات المحاكاة — تعمل Headless بلا أي عرض (شرط قبول المرحلة 1).
import { UNIT_DEFS, ARENAS, COMMANDERS, DEFAULT_DECK } from '../../definitions/index';
import {
  buildUnits, buildArena, createMatch, step, hashState, serialize, deserialize,
  createBot, botThink, applyCommand, cpCap
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

const ALT_DECK = ['axe_warriors', 'light_slingers', 'north_wolves', 'frost_witch', 'shield_guard', 'iron_ram', 'archers'];

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

// ── 1. الحتمية: نفس البذرة ⟹ نفس التجزئات تكّة بتكّة ونفس النتيجة
console.log('1) الحتمية');
{
  const h1: number[] = [], h2: number[] = [];
  const r1 = runBotMatch(42, h1);
  const r2 = runBotMatch(42, h2);
  check('نفس تسلسل التجزئات بتاً', h1.length === h2.length && h1.every((v, i) => v === h2[i]));
  check('نفس النتيجة', JSON.stringify(r1.st.result) === JSON.stringify(r2.st.result));
  check('نفس التجزئة النهائية', hashState(r1.st) === hashState(r2.st));
  const r3 = runBotMatch(43);
  check('بذرة مختلفة ⟹ مجرى مختلف', hashState(r1.st) !== hashState(r3.st));
}

// ── 2. المباراة تكتمل بنتيجة ضمن الوقت الأقصى
console.log('2) اكتمال المباريات');
{
  const reasons: Record<string, number> = {};
  let completed = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const { st, ticks } = runBotMatch(seed * 101);
    if (st.result) { completed++; reasons[st.result.reason] = (reasons[st.result.reason] ?? 0) + 1; }
    check(`بذرة ${seed * 101}: انتهت خلال ${ticks} تكّة`, !!st.result && ticks <= arena.mainTicks + arena.overtimeTicks + 10);
  }
  console.log('   أسباب الحسم:', JSON.stringify(reasons));
  check('10/10 مباريات مكتملة', completed === 10);
}

// ── 3. قواعد نقاط القيادة
console.log('3) نقاط القيادة');
{
  const st = createMatch(ctx, 7, [
    { name: 'أ', isBot: false, deck: DEFAULT_DECK },
    { name: 'ب', isBot: false, deck: DEFAULT_DECK }
  ]);
  check('البداية 4 CP', st.players[0].cp === 4);
  check('السقف الأساسي 10', cpCap(st, arena) === 10);
  for (let i = 0; i < arena.regenTicks * 20; i++) step(st, ctx, []);
  check('التجدد بلغ السقف 10 ولم يتجاوزه', st.players[0].cp === 10);
  while (st.tick < arena.mainTicks - 60 * 20 + 5) step(st, ctx, []);
  check('مرحلة الحسم: السقف 12', cpCap(st, arena) === 12);
}

// ── 4. تصديق النشر
console.log('4) تصديق أوامر النشر');
{
  const st = createMatch(ctx, 9, [
    { name: 'أ', isBot: false, deck: DEFAULT_DECK },
    { name: 'ب', isBot: false, deck: DEFAULT_DECK }
  ]);
  const ev: SimEvent[] = [];
  check('نشر سليم في المنطقة الخاصة', applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev));
  check('خصم الكلفة (4-3=1)', st.players[0].cp === 1);
  check('رفض: لا CP كافية', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 1, x: -12000, z: -14000 }, ev));
  check('رفض: خارج منطقة النشر (نصف الخصم)', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: 0, z: 12000 }, ev));
  check('رفض: إعادة التجهيز (Muster)', !applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -14000 }, ev));
  check('رفض: وسط الجسر خارج عرضه', !applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 0, x: 5000, z: 3000 }, ev));
  st.players[1].forward[1] = true;
  check('النشر المتقدم على الجسر ضمن عرضه', applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 0, x: 1000, z: 3000 }, ev));
}

// ── 5. الكاونتر: الرماح تفني الخيّالة، والعكس يفشل
console.log('5) نظام الكاونتر');
{
  function duel(unitA: string, unitB: string): string {
    const st = createMatch(ctx, 5, [
      { name: 'أ', isBot: false, deck: [unitA, ...DEFAULT_DECK.slice(1)] },
      { name: 'ب', isBot: false, deck: [unitB, ...DEFAULT_DECK.slice(1)] }
    ]);
    const ev: SimEvent[] = [];
    applyCommand(st, ctx, { type: 'deploy', player: 0, slot: 0, x: -12000, z: -9000 }, ev);
    applyCommand(st, ctx, { type: 'deploy', player: 1, slot: 0, x: -12000, z: 9000 }, ev);
    for (let i = 0; i < 2400 && st.squads.length > 1; i++) step(st, ctx, []);
    const a = st.squads.some(s => s.player === 0), b = st.squads.some(s => s.player === 1);
    return a && !b ? unitA : b && !a ? unitB : 'تعادل/انقطاع';
  }
  check('رماح ضد خيّالة ⟹ الرماح تنتصر', duel('spear_wall', 'raid_cavalry') === 'spear_wall');
  check('خيّالة ضد رماة ⟹ الخيّالة تنتصر', duel('raid_cavalry', 'archers') === 'raid_cavalry');
  check('رماة ضد رماح ⟹ الرماة تنتصر', duel('archers', 'spear_wall') === 'archers');
}

// ── 6. التسلسل: الحفظ والاستعادة يواصلان بنفس المجرى (إعادة الاتصال)
console.log('6) التسلسل وإعادة الاتصال');
{
  const stA = createMatch(ctx, 77, [
    { name: 'أ', isBot: true, deck: DEFAULT_DECK },
    { name: 'ب', isBot: true, deck: ALT_DECK }
  ]);
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
  check('المجريان متطابقان بعد 200 تكّة إضافية', hashState(stA) === hashState(stB));
  // إعادة بناء من سجل الأوامر (أساس الإعادات)
  const stC = createMatch(ctx, 77, [
    { name: 'أ', isBot: true, deck: DEFAULT_DECK },
    { name: 'ب', isBot: true, deck: ALT_DECK }
  ]);
  for (const cmds of script) step(stC, ctx, cmds);
  check('إعادة التشغيل من سجل الأوامر تطابق الأصل', hashState(stC) === hashState(deserialize(snap)));
}

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail > 0 ? 1 : 0);
