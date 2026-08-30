// نماذج أفراد الفرق — صورة ظلية مميزة لكل وحدة (UNIT_SYSTEM §2 وART_DIRECTION §4):
// وجوه بعيون ظاهرة، خوذ وأعراف، دروع ورماح وأقواس، خيول للفرسان وذئاب حقيقية،
// وكبش ومنجنيق فعليان. كل نموذج هندسة مدموجة واحدة ملوّنة الرؤوس = Draw Call واحد.
import * as THREE from 'three';
import { box, cyl, cone, ball, arc, merge } from '../gfx';

export interface Palette {
  armor: number; armorDark: number; cloth: number; skin: number;
  metal: number; leather: number; accent: number; hair: number;
}

export const COLD: Palette = { // جيشي — لهجة فولاذية باردة
  armor: 0x4d6f9c, armorDark: 0x35507a, cloth: 0x2e3b4d, skin: 0xc9ac8a,
  metal: 0x99a2ad, leather: 0x5c4a38, accent: 0xaecbec, hair: 0x3a2e22
};
export const WARM: Palette = { // العدو — لهجة صدئة دافئة
  armor: 0xa4462f, armorDark: 0x7c3324, cloth: 0x4a352b, skin: 0xc9a684,
  metal: 0xa39486, leather: 0x453324, accent: 0xe8b48a, hair: 0x2e2019
};

const EYE = 0x14100c;

// ── لبنات الإنسان ──────────────────────────────────────────────
function legs(p: Palette): THREE.BufferGeometry[] {
  return [
    box(0.15, 0.5, 0.17, p.cloth, -0.11, 0.25),
    box(0.15, 0.5, 0.17, p.cloth, 0.11, 0.25),
    box(0.17, 0.09, 0.24, p.leather, -0.11, 0.045, 0.02),
    box(0.17, 0.09, 0.24, p.leather, 0.11, 0.045, 0.02)
  ];
}

function torso(p: Palette, armored = true): THREE.BufferGeometry[] {
  const main = armored ? p.armor : p.cloth;
  return [
    box(0.44, 0.52, 0.27, main, 0, 0.76),
    box(0.46, 0.1, 0.29, p.leather, 0, 0.55),            // حزام
    box(0.1, 0.1, 0.05, p.metal, 0, 0.55, 0.15),         // إبزيم
    box(0.48, 0.12, 0.29, p.armorDark, 0, 0.99)          // كتفيات
  ];
}

function arms(p: Palette, sleeveHex?: number): THREE.BufferGeometry[] {
  const sleeve = sleeveHex ?? p.armorDark;
  return [
    box(0.12, 0.42, 0.14, sleeve, -0.29, 0.8),
    box(0.12, 0.42, 0.14, sleeve, 0.29, 0.8),
    box(0.1, 0.12, 0.12, p.skin, -0.29, 0.56),
    box(0.1, 0.12, 0.12, p.skin, 0.29, 0.56)
  ];
}

// رأس بوجه حقيقي: عينان بارزتان للأمام + شعر/لحية حسب النوع
function head(p: Palette, y = 1.35): THREE.BufferGeometry[] {
  return [
    ball(0.155, p.skin, 0, y, 0),
    box(0.045, 0.05, 0.03, EYE, -0.06, y + 0.02, 0.135),
    box(0.045, 0.05, 0.03, EYE, 0.06, y + 0.02, 0.135),
    box(0.03, 0.03, 0.04, p.skin, 0, y - 0.02, 0.15),     // أنف
    box(0.12, 0.05, 0.02, p.hair, 0, y - 0.09, 0.12)      // لحية قصيرة
  ];
}

function helmetCap(p: Palette, y = 1.35, crest = false): THREE.BufferGeometry[] {
  const out = [
    ball(0.17, p.metal, 0, y + 0.05, -0.015, 8, 5, 0.85),
    box(0.36, 0.05, 0.06, p.metal, 0, y + 0.02, -0.11)   // واقي القفا
  ];
  if (crest) out.push(box(0.05, 0.14, 0.3, p.accent, 0, y + 0.22, -0.02));
  return out;
}

function hood(p: Palette, hex: number, y = 1.35): THREE.BufferGeometry[] {
  return [
    ball(0.185, hex, 0, y + 0.04, -0.03, 8, 6),
    cone(0.13, 0.22, hex, 0, y + 0.22, -0.08, 6)
  ];
}

// ── أسلحة ودروع ────────────────────────────────────────────────
const spear = (p: Palette, x = 0.32) => [
  cyl(0.022, 0.022, 1.75, 0x6a5540, x, 0.95, 0.05, 5),
  cone(0.05, 0.2, p.metal, x, 1.9, 0.05, 5)
];
const roundShield = (p: Palette, x = -0.34) => [
  cyl(0.3, 0.3, 0.05, p.armorDark, x, 0.82, 0.1, 10, 0, Math.PI / 2),
  ball(0.07, p.metal, x, 0.82, 0.13)
];
const towerShield = (p: Palette, x = -0.32) => [
  box(0.52, 0.85, 0.06, p.armorDark, x, 0.8, 0.16),
  box(0.44, 0.75, 0.02, p.armor, x, 0.8, 0.2),
  box(0.06, 0.6, 0.03, p.metal, x, 0.8, 0.21)
];
const axe = (p: Palette, x = 0.32) => [
  cyl(0.03, 0.03, 0.95, 0x6a5540, x, 0.95, 0.08, 5),
  box(0.06, 0.22, 0.3, p.metal, x, 1.32, 0.18),
  box(0.02, 0.26, 0.1, p.metal, x, 1.32, 0.34)
];
const bow = (p: Palette, x = 0.33) => [
  arc(0.42, 0.025, 0x6a5540, x, 0.95, 0.05, Math.PI / 2),
  box(0.008, 0.82, 0.008, 0xd8d2c2, x, 0.95, 0.05)
];
const staff = (glow: number, x = 0.32) => [
  cyl(0.025, 0.03, 1.5, 0x54432f, x, 0.85, 0.05, 5),
  ball(0.09, glow, x, 1.62, 0.05)
];

// ── الحيوانات ──────────────────────────────────────────────────
function horse(p: Palette, coat: number): THREE.BufferGeometry[] {
  const mane = p.hair;
  return [
    box(0.42, 0.4, 1.05, coat, 0, 0.72, 0),
    ...[-0.14, 0.14].flatMap(x => [-0.36, 0.36].map(z => cyl(0.06, 0.07, 0.55, coat, x, 0.28, z, 5))),
    box(0.2, 0.45, 0.28, coat, 0, 1.05, 0.5, 0, 0, -0.5),       // رقبة مائلة
    box(0.16, 0.18, 0.4, coat, 0, 1.28, 0.68),                   // رأس
    box(0.12, 0.12, 0.16, coat, 0, 1.22, 0.9),                   // خطم
    box(0.04, 0.05, 0.03, EYE, -0.07, 1.32, 0.78),
    box(0.04, 0.05, 0.03, EYE, 0.07, 1.32, 0.78),
    ...[-0.05, 0.05].map(x => cone(0.035, 0.1, coat, x, 1.42, 0.62, 4)),
    box(0.05, 0.34, 0.1, mane, 0, 1.2, 0.42),                    // عرف
    cyl(0.03, 0.01, 0.5, mane, 0, 0.62, -0.58, 4, 0, 0.7),      // ذيل
    box(0.46, 0.08, 0.5, p.leather, 0, 0.94, 0),                 // سرج
    box(0.5, 0.16, 0.2, p.armorDark, 0, 1.02, 0.28)              // درع صدر
  ];
}

function rider(p: Palette): THREE.BufferGeometry[] {
  const parts = [
    box(0.36, 0.42, 0.24, p.armor, 0, 1.32, -0.05),
    box(0.4, 0.1, 0.26, p.armorDark, 0, 1.52, -0.05),
    box(0.12, 0.3, 0.14, p.cloth, -0.22, 1.05, -0.05),
    box(0.12, 0.3, 0.14, p.cloth, 0.22, 1.05, -0.05)
  ];
  for (const g of head(p, 1.78)) parts.push(g);
  for (const g of helmetCap(p, 1.78)) parts.push(g);
  return parts;
}

function wolf(p: Palette): THREE.BufferGeometry[] {
  const coat = 0x5a544c, belly = 0x6e675c;
  return [
    box(0.3, 0.3, 0.72, coat, 0, 0.4, 0),
    box(0.26, 0.1, 0.5, belly, 0, 0.27, 0.05),
    ...[-0.1, 0.1].flatMap(x => [-0.24, 0.26].map(z => cyl(0.045, 0.05, 0.32, coat, x, 0.13, z, 5))),
    box(0.2, 0.2, 0.24, coat, 0, 0.52, 0.42),
    box(0.1, 0.1, 0.2, coat, 0, 0.47, 0.58),                     // خطم
    box(0.035, 0.045, 0.03, 0xd8b04a, -0.06, 0.56, 0.52),        // عينان صفراوان
    box(0.035, 0.045, 0.03, 0xd8b04a, 0.06, 0.56, 0.52),
    ...[-0.06, 0.06].map(x => cone(0.035, 0.1, coat, x, 0.68, 0.4, 4)),
    cyl(0.035, 0.012, 0.42, coat, 0, 0.5, -0.44, 4, 0, 0.9),
    box(0.32, 0.05, 0.2, p.armorDark, 0, 0.56, 0.08)             // لُبدة درع خفيفة
  ];
}

// ── آلات الحصار (تُعرض كهيكل مركزي وطاقم حوله) ─────────────────
export function siegeProp(unit: string, p: Palette): THREE.BufferGeometry | null {
  if (unit === 'siege_engineers') {
    return merge([
      box(1.5, 0.14, 2.6, 0x6a5540, 0, 1.15, 0),
      box(1.6, 0.1, 2.7, p.armorDark, 0, 1.24, 0),
      ...[-0.65, 0.65].flatMap(x => [-1.05, 1.05].map(z => cyl(0.06, 0.06, 1.1, 0x54432f, x, 0.6, z, 5))),
      cyl(0.16, 0.16, 2.4, 0x54432f, 0, 0.7, 0, 7, 0, Math.PI / 2),
      box(0.4, 0.4, 0.34, p.metal, 0, 0.7, 1.3),
      ...[-0.7, 0.7].flatMap(x => [-0.9, 0.9].map(z => cyl(0.22, 0.22, 0.12, 0x4a3b2a, x, 0.22, z, 9, 0, Math.PI / 2)))
    ]);
  }
  return null;
}

// خفاش يركبه جندي — طيران
function batRider(p: Palette): THREE.BufferGeometry[] {
  const bat = 0x3a3540, wing = 0x2e2a34;
  return [
    ball(0.34, bat, 0, 0.5, 0, 8, 6, 0.75),                       // جسد الخفاش
    box(0.18, 0.16, 0.26, bat, 0, 0.62, 0.34),                    // رأس
    box(0.04, 0.05, 0.03, 0xd8b04a, -0.06, 0.66, 0.46),
    box(0.04, 0.05, 0.03, 0xd8b04a, 0.06, 0.66, 0.46),
    ...[-0.07, 0.07].map(x => cone(0.045, 0.14, bat, x, 0.8, 0.3, 4)),
    box(1.15, 0.04, 0.55, wing, -0.75, 0.6, -0.05, 0, 0.35),      // جناحان
    box(1.15, 0.04, 0.55, wing, 0.75, 0.6, -0.05, 0, -0.35),
    // الراكب
    box(0.3, 0.36, 0.2, p.armor, 0, 0.95, -0.1),
    ball(0.13, p.skin, 0, 1.24, -0.1),
    ball(0.15, p.metal, 0, 1.29, -0.11, 8, 5, 0.8),
    box(0.04, 0.04, 0.03, EYE, -0.05, 1.26, 0.02),
    box(0.04, 0.04, 0.03, EYE, 0.05, 1.26, 0.02)
  ];
}

// غولم حجري ضخم
function golem(p: Palette): THREE.BufferGeometry[] {
  const rock = 0x5e5850, rockD = 0x494440;
  return [
    box(1.15, 1.2, 0.75, rock, 0, 1.15, 0),
    box(0.95, 0.5, 0.65, rockD, 0, 0.45, 0),
    box(0.42, 0.9, 0.42, rockD, -0.42, 0.45, 0.05),
    box(0.42, 0.9, 0.42, rockD, 0.42, 0.45, 0.05),
    box(0.4, 1.1, 0.4, rock, -0.85, 1.15, 0, 0, 0.12),
    box(0.4, 1.1, 0.4, rock, 0.85, 1.15, 0, 0, -0.12),
    box(0.5, 0.45, 0.45, rockD, -0.9, 0.5, 0.1),
    box(0.5, 0.45, 0.45, rockD, 0.9, 0.5, 0.1),
    box(0.6, 0.5, 0.5, rock, 0, 2.05, 0.05),
    box(0.07, 0.09, 0.04, 0xd88a3a, -0.14, 2.1, 0.31),            // عينان متوهجتان
    box(0.07, 0.09, 0.04, 0xd88a3a, 0.14, 2.1, 0.31),
    box(0.8, 0.25, 0.6, p.armorDark, 0, 1.82, 0)                  // كتف بلون الجهة
  ];
}

// ── الفرد المكتمل لكل وحدة ──────────────────────────────────────
function humanoid(p: Palette, opts: {
  helmet?: 'cap' | 'crest' | 'hood' | 'none';
  hoodHex?: number;
  weapon?: 'spear' | 'axe' | 'bow' | 'staff' | 'hammer' | 'dagger' | 'banner' | 'none';
  glow?: number;
  shield?: 'round' | 'tower' | 'none';
  robe?: number;
  cape?: boolean;
}): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (opts.robe !== undefined) {
    parts.push(cone(0.3, 0.85, opts.robe, 0, 0.44, 0, 7));
    parts.push(box(0.44, 0.5, 0.28, opts.robe, 0, 0.78));
  } else {
    parts.push(...legs(p), ...torso(p));
  }
  parts.push(...arms(p, opts.robe));
  parts.push(...head(p));
  if (opts.helmet === 'cap') parts.push(...helmetCap(p));
  else if (opts.helmet === 'crest') parts.push(...helmetCap(p, 1.35, true));
  else if (opts.helmet === 'hood') parts.push(...hood(p, opts.hoodHex ?? p.cloth));
  if (opts.cape) parts.push(box(0.42, 0.72, 0.05, p.armorDark, 0, 0.85, -0.19));
  if (opts.weapon === 'spear') parts.push(...spear(p));
  else if (opts.weapon === 'axe') parts.push(...axe(p));
  else if (opts.weapon === 'bow') parts.push(...bow(p));
  else if (opts.weapon === 'staff') parts.push(...staff(opts.glow ?? p.accent));
  else if (opts.weapon === 'hammer') parts.push(
    cyl(0.03, 0.03, 0.9, 0x6a5540, 0.32, 0.95, 0.08, 5),
    box(0.16, 0.16, 0.3, p.metal, 0.32, 1.34, 0.12));
  else if (opts.weapon === 'dagger') parts.push(
    box(0.03, 0.3, 0.05, p.metal, 0.3, 0.72, 0.14, 0, -0.4),
    box(0.03, 0.3, 0.05, p.metal, -0.3, 0.72, 0.14, 0, 0.4));
  else if (opts.weapon === 'banner') parts.push(
    cyl(0.035, 0.035, 2.5, 0x54432f, 0.32, 1.3, 0.05, 5),
    box(0.65, 0.45, 0.03, p.armor, 0.62, 2.3, 0.05),
    box(0.65, 0.06, 0.04, p.accent, 0.62, 2.06, 0.05));
  if (opts.shield === 'round') parts.push(...roundShield(p));
  else if (opts.shield === 'tower') parts.push(...towerShield(p));
  return merge(parts);
}

const cache = new Map<string, THREE.BufferGeometry>();

export function memberGeo(unit: string, mine: boolean): THREE.BufferGeometry {
  const key = `${unit}:${mine ? 'c' : 'w'}`;
  let g = cache.get(key);
  if (g) return g;
  const p = mine ? COLD : WARM;
  switch (unit) {
    case 'steel_guard': g = humanoid(p, { helmet: 'crest', shield: 'tower', weapon: 'none' }); break;
    case 'vale_archers': g = humanoid(p, { helmet: 'cap', weapon: 'bow' }); break;
    case 'spear_bearers': g = humanoid(p, { helmet: 'cap', weapon: 'spear', shield: 'round' }); break;
    case 'hollow_knights': g = merge([...horse(p, mine ? 0x4a3b2c : 0x3a2c22), ...rider(p),
      ...spear(p, 0.42).map(x => x.translate(0, 0.55, 0.2) as any)]); break;
    case 'flame_casters': g = humanoid(p, { helmet: 'hood', hoodHex: 0x3a2a24, weapon: 'staff', glow: 0xd88a3a }); break;
    case 'bat_riders': g = merge(batRider(p)); break;
    case 'siege_engineers': g = humanoid(p, { helmet: 'cap', weapon: 'hammer' }); break;
    case 'banner_guards': g = humanoid(p, { helmet: 'cap', weapon: 'banner', shield: 'round' }); break;
    case 'running_shadows': g = humanoid(p, { helmet: 'hood', hoodHex: 0x22202a, weapon: 'dagger', cape: true }); break;
    case 'stone_golem': g = merge(golem(p)); break;
    default: g = humanoid(p, { helmet: 'cap', weapon: 'spear' });
  }
  cache.set(key, g);
  return g;
}
