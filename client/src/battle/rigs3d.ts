// جنود مهيكلة حقيقية (KayKit Adventurers — CC0): فكّ GLB المضمّن، استنساخ هيكلي
// لكل فرد، وربط حركات مشي/هجوم/سكون حقيقية بدل مجسمات الصناديق.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RIGS } from '../rigs';

export interface RigSpec {
  char: string;
  weapons: string[];          // عقد العتاد الظاهرة — البقية تُخفى
  attack: string;
  walk: string;
  scale: number;
}

// خريطة وحدات اللعبة إلى شخصيات الحزمة وحركاتها
// (راكبو الخفافيش والغولم يبقيان مجسمَين خاصين — لا مقابل لهما في الحزمة)
export const UNIT_RIGS: Record<string, RigSpec> = {
  steel_guard: { char: 'Knight', weapons: ['1H_Sword', 'Round_Shield'], attack: '1H_Melee_Attack_Slice_Diagonal', walk: 'Walking_A', scale: 1.5 },
  spear_bearers: { char: 'Knight', weapons: ['2H_Sword'], attack: '2H_Melee_Attack_Stab', walk: 'Walking_A', scale: 1.42 },
  hollow_knights: { char: 'Knight', weapons: ['1H_Sword', 'Round_Shield'], attack: '1H_Melee_Attack_Slice_Diagonal', walk: 'Running_A', scale: 1.62 },
  banner_guards: { char: 'Knight', weapons: [], attack: 'Cheer', walk: 'Walking_A', scale: 1.48 },
  vale_archers: { char: 'Rogue_Hooded', weapons: ['2H_Crossbow'], attack: '2H_Ranged_Shoot', walk: 'Walking_A', scale: 1.42 },
  running_shadows: { char: 'Rogue_Hooded', weapons: ['Knife', 'Knife_Offhand'], attack: 'Dualwield_Melee_Attack_Slice', walk: 'Running_A', scale: 1.42 },
  flame_casters: { char: 'Mage', weapons: ['2H_Staff'], attack: 'Spellcast_Shoot', walk: 'Walking_A', scale: 1.48 },
  siege_engineers: { char: 'Barbarian', weapons: ['2H_Axe'], attack: '2H_Melee_Attack_Chop', walk: 'Walking_A', scale: 1.42 }
};

const ALL_WEAPONS = new Set([
  '1H_Sword', '1H_Sword_Offhand', '2H_Sword', 'Round_Shield', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield',
  '1H_Axe', '1H_Axe_Offhand', '2H_Axe', 'Barbarian_Round_Shield', 'Mug',
  '1H_Wand', '2H_Staff', 'Spellbook', 'Spellbook_open',
  'Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable'
]);

interface CharLib { scene: THREE.Group; clips: Map<string, THREE.AnimationClip>; }

class RigLibrary {
  chars = new Map<string, CharLib>();
  ready = false;
  private started = false;
  // خامات مصبوغة لكل (شخصية، جهة) — نسخ مشتركة لا لكل فرد
  private tinted = new Map<string, Map<THREE.Material, THREE.Material>>();

  load(): void {
    if (this.started) return;
    this.started = true;
    const loader = new GLTFLoader();
    let left = Object.keys(RIGS).length;
    for (const [name, b64] of Object.entries(RIGS)) {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      loader.parse(bin.buffer, '', gltf => {
        const clips = new Map<string, THREE.AnimationClip>();
        for (const c of gltf.animations) clips.set(c.name, c);
        this.chars.set(name, { scene: gltf.scene, clips });
        if (--left === 0) this.ready = true;
      }, err => { console.warn('rig parse', name, err); if (--left === 0) this.ready = true; });
    }
  }

  private tintFor(char: string, mine: boolean, src: THREE.Material): THREE.Material {
    const key = char + (mine ? ':m' : ':f');
    let map = this.tinted.get(key);
    if (!map) { map = new Map(); this.tinted.set(key, map); }
    let m = map.get(src);
    if (!m) {
      m = (src as THREE.MeshStandardMaterial).clone();
      // صبغة جهة واضحة: أنت فولاذ أزرق، والخصم قرمزي دافئ — تُقرأ من كاميرا الميدان
      (m as THREE.MeshStandardMaterial).color.multiply(new THREE.Color(mine ? 0xa8c4f2 : 0xf09a78));
      map.set(src, m);
    }
    return m;
  }

  // فرد جديد: استنساخ هيكلي + إظهار عتاد الوحدة + مازج حركات خاص به
  makeMember(unit: string, mine: boolean): { obj: THREE.Object3D; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction; attack: THREE.AnimationAction; idle: THREE.AnimationAction } | null {
    const spec = UNIT_RIGS[unit];
    if (!spec || !this.ready) return null;
    const lib = this.chars.get(spec.char);
    if (!lib) return null;
    const obj = skClone(lib.scene);
    obj.scale.setScalar(spec.scale);
    obj.traverse(o => {
      if (ALL_WEAPONS.has(o.name)) o.visible = spec.weapons.includes(o.name);
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        mesh.material = this.tintFor(spec.char, mine, mesh.material as THREE.Material);
        mesh.frustumCulled = false; // الهياكل المتحركة تُقصّ خطأً من زوايا الكاميرا العالية
      }
    });
    const mixer = new THREE.AnimationMixer(obj);
    const get = (n: string) => lib.clips.get(n) ?? lib.clips.values().next().value!;
    const walk = mixer.clipAction(get(spec.walk));
    const idle = mixer.clipAction(get('Idle'));
    const attack = mixer.clipAction(get(spec.attack));
    attack.setLoop(THREE.LoopOnce, 1);
    walk.play();
    walk.time = Math.random() * walk.getClip().duration; // أطوار متفاوتة — لا مسير آلي متطابق
    return { obj, mixer, walk, attack, idle };
  }
}

export const rigLib = new RigLibrary();
