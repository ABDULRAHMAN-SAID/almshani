// يحوّل شخصيات KayKit (CC0) إلى حزم خفيفة للعبة: يبقي حركات القتال المطلوبة فقط،
// يبسّط الهندسة ويصغّر الخامة، ثم يولّد client/src/rigs.ts بالنماذج مضمنة Base64.
// المصدر: KayKit Character Pack Adventures (رخصة CC0 — بلا شرط نسب).
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { prune, resample, simplify, textureCompress, dedup, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SRC = '/home/user/kaykit-game-assets/kaykit-character-pack-adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf';
const OUT = new URL('../client/src/rigs.ts', import.meta.url).pathname;

// لكل شخصية: حركاتها المستخدمة فعلاً وقطع عتادها المطلوبة — البقية تُحذف لتقليص الحجم
const CHARS = {
  Knight: {
    anims: ['Idle', 'Walking_A', 'Running_A', '1H_Melee_Attack_Slice_Diagonal', '2H_Melee_Attack_Stab', 'Cheer', 'Death_A'],
    dropNodes: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield']
  },
  Barbarian: {
    anims: ['Idle', 'Walking_A', '2H_Melee_Attack_Chop', 'Cheer'],
    dropNodes: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug']
  },
  Mage: {
    anims: ['Idle', 'Walking_A', 'Spellcast_Shoot'],
    dropNodes: ['Spellbook', 'Spellbook_open', '1H_Wand']
  },
  Rogue_Hooded: {
    anims: ['Idle', 'Walking_A', 'Running_A', '2H_Ranged_Shoot', 'Dualwield_Melee_Attack_Slice'],
    dropNodes: ['Throwable', '1H_Crossbow']
  }
};

const io = new NodeIO();
let out = '// ملف مولّد — tools/build-rigs.mjs يبنيه من حزمة KayKit Adventurers (CC0).\n';
out += '// نماذج مهيكلة متحركة مضمنة GLB Base64 — تُفك في client/src/battle/rigs3d.ts\n';
out += 'export const RIGS: Record<string, string> = {\n';

let total = 0;
for (const [name, spec] of Object.entries(CHARS)) {
  const doc = await io.read(`${SRC}/${name}.glb`);
  const keepA = new Set(spec.anims);
  for (const anim of doc.getRoot().listAnimations()) {
    if (!keepA.has(anim.getName())) {
      // dispose للحركة وحدها يترك قنواتها وعيّناتها حية فتُبقي المخزن كله — أسقطها صراحة
      for (const ch of anim.listChannels()) { ch.getSampler()?.dispose(); ch.dispose(); }
      anim.dispose();
    }
  }
  // احذف قطع العتاد غير المستخدمة (كل شخصية تحمل كل الأسلحة افتراضياً)
  const dropN = new Set(spec.dropNodes);
  for (const node of doc.getRoot().listNodes()) {
    if (dropN.has(node.getName())) node.dispose();
  }
  // KayKit يخبز قناة لكل عظمة في كل حركة حتى الساكنة تماماً — نحذف كل قناة
  // ثابتة تساوي وضع السكون، فتنهار آلاف المداخل إلى العشرات المؤثرة فقط.
  const near = (a, b) => Math.abs(a - b) < 2e-3;
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode(); const smp = ch.getSampler();
      if (!node || !smp) continue;
      const out = smp.getOutput(); const arr = out.getArray();
      const n = out.getElementSize();
      let constant = true;
      for (let i = n; i < arr.length && constant; i++) constant = near(arr[i], arr[i % n]);
      if (!constant) continue;
      const path = ch.getTargetPath();
      const rest = path === 'translation' ? node.getTranslation()
        : path === 'rotation' ? node.getRotation() : node.getScale();
      let matchesRest = true;
      for (let i = 0; i < n; i++) if (!near(arr[i], rest[i])) matchesRest = false;
      if (matchesRest) { ch.dispose(); smp.dispose(); }
    }
  }
  await doc.transform(
    resample({ tolerance: 0.005 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.0015 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [128, 128] }),
    dedup(),
    quantize(),
    // صراحةً مع ACCESSOR: الافتراضي يترك آلاف موارد الحركات المحذوفة يتيمة في الملف
    prune({
      propertyTypes: [
        PropertyType.NODE, PropertyType.SKIN, PropertyType.MESH, PropertyType.PRIMITIVE,
        PropertyType.ANIMATION, PropertyType.MATERIAL, PropertyType.TEXTURE,
        PropertyType.ACCESSOR, PropertyType.BUFFER
      ]
    })
  );
  const glb = await io.writeBinary(doc);
  total += glb.byteLength;
  out += `  ${name}: '${Buffer.from(glb).toString('base64')}',\n`;
  console.log(`${name}: ${(glb.byteLength / 1024).toFixed(0)}KB`);
}
out += '};\n';
writeFileSync(OUT, out);
console.log(`rigs.ts إجمالي GLB: ${(total / 1024).toFixed(0)}KB (Base64 يزيد ~33%)`);
