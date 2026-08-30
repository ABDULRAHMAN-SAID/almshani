// مشهد القاعدة — كهف المعقل: مبانٍ مفصّلة (هندسات مدموجة ملوّنة الرؤوس)،
// حراس يتجولون، شرر متصاعد، ومشاعل تخفق. كل مبنى قابل للنقر.
import * as THREE from 'three';
import { t } from '../i18n';
import { box, cyl, cone, ball, merge, modelMat } from '../gfx';
import { memberGeo } from '../battle/models';

interface Spot { id: string; x: number; z: number; }

const SPOTS: Spot[] = [
  { id: 'hall', x: 0, z: -5 },
  { id: 'gold_mine', x: -8.5, z: 0 },
  { id: 'gold_mine_2', x: -10.5, z: -9 },
  { id: 'farm', x: 8.5, z: 0 },
  { id: 'store', x: 10.5, z: -9 },
  { id: 'barracks', x: -6.5, z: 8 },
  { id: 'siege_shop', x: 6.5, z: 8 },
  { id: 'lab', x: -11, z: 15 },
  { id: 'monument', x: 11, z: 15 },
  { id: 'gate', x: 0, z: 18 }
];

const STONE = 0x76716a, STONE_D = 0x57534b, WOOD = 0x6a5540, WOOD_D = 0x54432f;
const GOLDX = 0xb08a35, IRON = 0x99a2ad;

export class BaseScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private ray = new THREE.Raycaster();
  private groups = new Map<string, THREE.Group>();
  private labels = new Map<string, HTMLElement>();
  private labelRoot: HTMLElement;
  private view: any = null;
  private disposed = false;
  private torches: THREE.PointLight[] = [];
  private embers!: THREE.Points;
  private emberVel: Float32Array = new Float32Array(0);
  private guards: { mesh: THREE.Mesh; angle: number; radius: number; speed: number }[] = [];
  private sparring: THREE.Mesh[] = [];
  private smoke!: THREE.Points;
  private smokeVel: Float32Array = new Float32Array(0);
  private coins = new Map<string, THREE.Mesh>();
  private lastMs = 0;

  constructor(private canvas: HTMLCanvasElement, private onPick: (id: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x121317);
    this.scene.fog = new THREE.Fog(0x121317, 55, 130);
    this.camera = new THREE.PerspectiveCamera(52, 1, 1, 160);
    this.labelRoot = document.getElementById('baselabels')!;
    this.lights();
    this.cavern();
    for (const s of SPOTS) this.buildSpot(s);
    this.ambientLife();
    this.resize();
    this.onResize = this.onResize.bind(this);
    addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', e => this.pick(e));
  }

  private onResize(): void { this.resize(); }

  private glowMat(hex: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ color: hex });
  }

  private lights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb4bdcd, 0x4c4234, 1.28)); // «داكنة لكن أوضح» — البند 4
    const mk = (hex: number, i: number, d: number, x: number, y: number, z: number) => {
      const l = new THREE.PointLight(hex, i, d, 1.5);
      l.position.set(x, y, z);
      this.scene.add(l);
      this.torches.push(l);
    };
    mk(0xe8a45a, 2.2, 55, 0, 8, -4);     // قاعة القيادة
    mk(0xe8a45a, 1.2, 30, -8.5, 5, 0);   // المنجم
    mk(0x7a96c0, 1.4, 50, 0, 9, 17);     // البوابة
    const fill = new THREE.DirectionalLight(0xe0d2b2, 0.85);
    fill.position.set(-14, 34, 22);
    this.scene.add(fill);
  }

  private cavern(): void {
    // أرضية بممر بلاطات نحو القاعة وبقع تراب متمايزة
    const floorParts = [
      box(70, 0.4, 70, 0x413a30, 0, -0.22, 0),
      cyl(21, 21, 0.1, 0x4c4436, 0, 0.02, 2, 36)
    ];
    for (let i = 0; i < 9; i++) {
      floorParts.push(box(1.6 - (i % 2) * 0.25, 0.14, 1.1, i % 2 ? 0x5b5346 : 0x655c4d, ((i % 3) - 1) * 0.35, 0.08, 15 - i * 2.1));
    }
    let sd = 11;
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 12; i++) {
      floorParts.push(cyl(0.8 + rnd() * 1.6, 0.9 + rnd() * 1.6, 0.06, rnd() > 0.5 ? 0x463e32 : 0x51483a,
        (rnd() * 2 - 1) * 18, 0.05, (rnd() * 2 - 1) * 16, 9));
    }
    this.scene.add(new THREE.Mesh(merge(floorParts), modelMat()));

    const rocks: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = 30 + Math.sin(i * 3.1) * 2.5;
      const h = 10 + Math.abs(Math.sin(i * 2.3)) * 8;
      rocks.push(cone(3.4 + Math.sin(i * 1.7) * 1.2, h, i % 3 ? 0x39332b : 0x453e34, Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r, 5));
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3;
      const r = 23 + (i % 4) * 3;
      rocks.push(cone(0.8, 4 + (i % 3) * 2, 0x332e26, Math.cos(a) * r, 22, Math.sin(a) * r, 5, Math.PI));
    }
    this.scene.add(new THREE.Mesh(merge(rocks), modelMat()));
    for (let i = 0; i < 8; i++) {
      const a = i * 0.9, r = 24 + (i % 3) * 3;
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + (i % 3) * 0.25), this.glowMat(0x3d5a80));
      c.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
      this.scene.add(c);
    }
  }

  private torchGeo(x: number, z: number): THREE.BufferGeometry[] {
    return [
      cyl(0.05, 0.07, 1.5, WOOD_D, x, 0.75, z, 5),
      cyl(0.09, 0.07, 0.18, 0x3a3630, x, 1.56, z, 6)
    ];
  }
  private flame(g: THREE.Group, x: number, z: number): void {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), this.glowMat(0xe8a45a));
    f.position.set(x, 1.78, z);
    g.add(f);
  }

  private buildSpot(s: Spot): void {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.userData.building = s.id;
    const parts: THREE.BufferGeometry[] = [];
    const glow = (mesh: THREE.Mesh) => g.add(mesh);
    const gm = (hex: number, w: number, h: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.glowMat(hex));
      m.position.set(x, y, z);
      return m;
    };
    switch (s.id) {
      case 'hall': {
        parts.push(box(7, 4.6, 5.6, STONE, 0, 2.3, 0), box(8, 0.7, 6.6, STONE_D, 0, 4.85, 0));
        for (let i = -3; i <= 3; i++) parts.push(box(0.62, 0.5, 0.5, STONE, i * 1.1, 5.4, 3.05));
        for (const sx of [-1, 1]) {
          parts.push(cyl(1.1, 1.35, 6.4, STONE, sx * 4.1, 3.2, 0, 8));
          parts.push(cone(1.45, 1.3, 0x3d5a80, sx * 4.1, 7.05, 0, 8));
          parts.push(...this.torchGeo(sx * 2.2, 3.1));
          this.flame(g, sx * 2.2, 3.1);
        }
        parts.push(box(2, 3, 0.3, WOOD_D, 0, 1.5, 2.75));
        parts.push(cyl(0.08, 0.08, 3.2, WOOD_D, 0, 6.8, 0, 5));
        glow(gm(0xd88a3a, 1.5, 2.5, 0, 1.35, 2.92));
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2),
          new THREE.MeshLambertMaterial({ color: 0x3d5a80, side: THREE.DoubleSide }));
        flag.position.set(1.15, 7.1, 0);
        g.add(flag);
        break;
      }
      case 'gold_mine': case 'gold_mine_2': {
        parts.push(cone(2.7, 3.4, 0x59524a, 0, 1.65, -0.4, 7));
        parts.push(box(0.32, 2, 0.35, WOOD_D, -0.75, 1, 1.1), box(0.32, 2, 0.35, WOOD_D, 0.75, 1, 1.1));
        parts.push(box(2.4, 0.32, 0.35, WOOD_D, 0, 2.1, 1.1));
        parts.push(box(0.12, 0.1, 3, 0x4a4640, -0.45, 0.06, 2.2), box(0.12, 0.1, 3, 0x4a4640, 0.45, 0.06, 2.2));
        for (let i = 0; i < 4; i++) parts.push(box(1.15, 0.08, 0.16, WOOD_D, 0, 0.03, 1 + i * 0.75));
        parts.push(box(1.15, 0.75, 0.8, 0x4a3b2a, 0, 0.55, 2.8));
        parts.push(...[-0.35, 0.35].map(x => cyl(0.2, 0.2, 0.1, 0x322a20, x, 0.22, 3.15, 8, 0, Math.PI / 2)));
        glow(gm(0x1f1812, 1.1, 1.5, 0, 0.8, 1.12));
        for (let i = 0; i < 4; i++) {
          const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (i % 2) * 0.09), this.glowMat(0xe8c56a));
          c.position.set(-0.35 + i * 0.25, 0.98 + (i % 2) * 0.1, 2.8);
          g.add(c);
        }
        break;
      }
      case 'farm': {
        parts.push(cyl(3, 3.1, 0.14, 0x3a4030, 0, 0.07, 0, 14));
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          parts.push(box(0.14, 0.75, 0.14, WOOD_D, Math.cos(a) * 3.1, 0.37, Math.sin(a) * 3.1));
        }
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05, r = 0.5 + (i % 3) * 0.75;
          parts.push(cyl(0.16, 0.24, 0.9 + (i % 2) * 0.4, 0x8a7f62, Math.cos(a) * r, 0.5, Math.sin(a) * r, 6));
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42 + (i % 2) * 0.18, 8, 6), this.glowMat(i % 3 ? 0x9fb86a : 0xb8cf7d));
          cap.scale.y = 0.72;
          cap.position.set(Math.cos(a) * r, 1.05 + (i % 2) * 0.35, Math.sin(a) * r);
          g.add(cap);
        }
        break;
      }
      case 'store': {
        for (const [w, x, y, z] of [[1.5, -0.9, 0.75, 0], [1.25, 0.85, 0.62, 0.4], [1.1, -0.2, 1.95, 0.1], [1.0, 1.6, 0.5, -1.1]] as const) {
          parts.push(box(w, w, w, WOOD, x, y, z, 0.2));
        }
        parts.push(cyl(0.5, 0.55, 1.25, 0x7d6448, 2.1, 0.62, 0.7, 9));
        parts.push(cyl(0.5, 0.55, 1.25, 0x7d6448, 2.6, 0.62, -0.4, 9));
        parts.push(ball(0.5, 0xa89468, -2, 0.4, 0.6, 7, 5, 0.7));
        parts.push(ball(0.4, 0x98855c, -2.6, 0.32, -0.2, 7, 5, 0.7));
        parts.push(box(3, 0.14, 2.4, 0x5c5244, -0.2, 2.6, 0.1, 0.2));
        break;
      }
      case 'barracks': {
        for (const [sx, sz, sc] of [[-1.1, 0, 1], [1.3, -0.6, 0.8]] as const) {
          parts.push(cone(2 * sc, 2.4 * sc, 0x7d6448, sx, 1.2 * sc, sz, 4));
          parts.push(box(0.55, 1.1 * sc, 0.1, 0x2e241c, sx, 0.55 * sc, sz + 0.95 * sc));
        }
        parts.push(box(2.2, 1.15, 0.14, WOOD, 0.4, 0.6, 1.7));
        for (let i = 0; i < 3; i++) parts.push(cyl(0.045, 0.045, 1.6, IRON, i * 0.45, 1.25, 1.75, 4, 0.35));
        parts.push(cyl(0.1, 0.12, 1.5, WOOD_D, -2.4, 0.75, 1.4, 5));
        parts.push(ball(0.22, 0xa89468, -2.4, 1.65, 1.4));
        parts.push(box(0.85, 0.16, 0.16, 0x8a7f62, -2.4, 1.25, 1.4));
        parts.push(cyl(0.05, 0.05, 2.4, WOOD_D, -3.1, 1.5, 0.2, 5));
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75),
          new THREE.MeshLambertMaterial({ color: 0x8c3b2e, side: THREE.DoubleSide }));
        flag.position.set(-2.5, 2.5, 0.2); g.add(flag);
        break;
      }
      case 'siege_shop': {
        parts.push(box(2.6, 0.5, 1.7, WOOD, 0, 0.55, -0.4));
        parts.push(box(0.3, 2.4, 0.3, WOOD_D, -0.7, 1.45, -0.5, 0, -0.6));
        for (const sx of [-1.15, 1.15]) parts.push(cyl(0.5, 0.5, 0.14, 0x4a3b2a, sx, 0.5, 0.4, 9, 0, Math.PI / 2));
        parts.push(box(1.9, 0.8, 1, WOOD_D, 1.9, 0.4, 1.2));
        parts.push(box(0.5, 0.4, 0.4, IRON, 1.6, 1, 1.2));
        parts.push(cyl(0.35, 0.45, 0.5, 0x3a3630, 2.5, 0.25, 1.9, 8));
        const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 8), this.glowMat(0xd86a2a));
        coals.position.set(2.5, 0.52, 1.9); g.add(coals);
        break;
      }
      case 'lab': {
        parts.push(box(3.6, 0.5, 2.6, STONE_D, 0, 0.25, 0));
        for (let i = 0; i < 3; i++) {
          parts.push(cyl(0.42, 0.52, 0.4, IRON, -1.1 + i * 1.1, 0.7, (i % 2) * 0.7, 9));
          const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.9 + (i % 2) * 0.5, 9), this.glowMat(i % 2 ? 0x5aa8a8 : 0x74c0b0));
          vat.position.set(-1.1 + i * 1.1, 1.35 + (i % 2) * 0.25, (i % 2) * 0.7);
          g.add(vat);
          parts.push(cyl(0.45, 0.45, 0.12, IRON, -1.1 + i * 1.1, 1.9 + (i % 2) * 0.5, (i % 2) * 0.7, 9));
        }
        parts.push(cyl(0.05, 0.05, 1.7, 0x6f7a84, 0, 1.6, -0.9, 5, 0.9));
        break;
      }
      case 'monument': {
        parts.push(box(2.2, 0.5, 2.2, STONE_D, 0, 0.25, 0));
        parts.push(box(1.6, 0.5, 1.6, STONE, 0, 0.75, 0));
        parts.push(box(0.55, 1.3, 0.4, GOLDX, 0, 1.85, 0));
        parts.push(ball(0.26, GOLDX, 0, 2.75, 0));
        parts.push(box(0.7, 0.18, 0.45, 0x9a7a2c, 0, 2.42, 0));
        parts.push(cyl(0.045, 0.045, 2.2, 0x9a7a2c, 0.5, 2.1, 0.1, 5));
        parts.push(cone(0.09, 0.3, GOLDX, 0.5, 3.3, 0.1, 5));
        parts.push(box(0.5, 0.8, 0.1, 0x9a7a2c, -0.42, 1.8, 0.15));
        break;
      }
      case 'gate': {
        for (const sx of [-1, 1]) {
          parts.push(box(1.3, 5.6, 1.3, STONE, sx * 2.5, 2.8, 0));
          parts.push(box(1.6, 0.5, 1.6, STONE_D, sx * 2.5, 5.75, 0));
          parts.push(...this.torchGeo(sx * 1.6, 0.9));
          this.flame(g, sx * 1.6, 0.9);
        }
        parts.push(box(6.6, 1.2, 1.4, STONE_D, 0, 6.2, 0));
        parts.push(box(5, 0.5, 1.1, STONE, 0, 6.95, 0));
        const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.7),
          new THREE.MeshBasicMaterial({ color: 0x3d5a80, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        portal.position.y = 2.6; g.add(portal);
        break;
      }
    }
    if (parts.length) g.add(new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
    this.scene.add(g);
    this.groups.set(s.id, g);
    const label = document.createElement('div');
    label.className = 'blabel';
    this.labelRoot.appendChild(label);
    this.labels.set(s.id, label);
  }

  private ambientLife(): void {
    // شرر متصاعد قرب القاعة والبوابة
    const N = 46;
    const pos = new Float32Array(N * 3);
    this.emberVel = new Float32Array(N);
    for (let i = 0; i < N; i++) this.resetEmber(pos, i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe8a45a, size: 0.14, transparent: true, opacity: 0.85 }));
    this.scene.add(this.embers);
    // حراس يطوفون حول القاعة (نماذج جنود المعركة نفسها)
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(memberGeo(i === 2 ? 'steel_guard' : 'spear_bearers', true), modelMat());
      this.scene.add(mesh);
      this.guards.push({ mesh, angle: i * 2.1, radius: 6.5 + i * 1.3, speed: 0.14 + i * 0.03 });
    }
    // متبارزان قرب الثكنة (البند 4: مناطق تدريب فيها جنود يتبارزون)
    for (const [ux, sx] of [['spear_bearers', -1], ['steel_guard', 1]] as [string, number][]) {
      const m = new THREE.Mesh(memberGeo(ux, true), modelMat());
      m.position.set(-6.5 + sx * 1.1, 0, 11.3);
      m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(m);
      this.sparring.push(m);
    }
    // دخان ورشة الحصار
    const SN = 18;
    const spos = new Float32Array(SN * 3);
    this.smokeVel = new Float32Array(SN);
    for (let i = 0; i < SN; i++) this.resetSmoke(spos, i, true);
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    this.smoke = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0x8a8478, size: 0.5, transparent: true, opacity: 0.35 }));
    this.scene.add(this.smoke);
    // مؤشرات الاستلام فوق مباني الإنتاج
    for (const id of ['gold_mine', 'gold_mine_2', 'farm']) {
      const spot = SPOTS.find(sp => sp.id === id)!;
      const coin = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), this.glowMat(id === 'farm' ? 0x9fb86a : 0xe8c56a));
      coin.position.set(spot.x, 4.6, spot.z);
      coin.visible = false;
      this.scene.add(coin);
      this.coins.set(id, coin);
    }
  }

  private resetSmoke(pos: Float32Array, i: number, spread = false): void {
    pos[i * 3] = 9.0 + (Math.random() * 2 - 1) * 0.4;   // فوق جمر الورشة
    pos[i * 3 + 1] = spread ? Math.random() * 6 : 0.7;
    pos[i * 3 + 2] = 9.9 + (Math.random() * 2 - 1) * 0.4;
    this.smokeVel[i] = 0.5 + Math.random() * 0.7;
  }

  private resetEmber(pos: Float32Array, i: number, spread = false): void {
    const src = i % 2 === 0 ? { x: 0, z: -3 } : { x: 0, z: 17.5 };
    pos[i * 3] = src.x + (Math.random() * 2 - 1) * 2.2;
    pos[i * 3 + 1] = spread ? Math.random() * 7 : 0.3;
    pos[i * 3 + 2] = src.z + (Math.random() * 2 - 1) * 1.6;
    this.emberVel[i] = 0.8 + Math.random() * 1.4;
  }

  setState(view: any): void { this.view = view; }

  private pick(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const hits = this.ray.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData.building) { this.onPick(o.userData.building); return; }
        o = o.parent;
      }
    }
  }

  sync(nowMs: number): void {
    if (this.disposed) return;
    const dt = Math.min(0.1, (nowMs - this.lastMs) / 1000) || 0.016;
    this.lastMs = nowMs;
    const t01 = nowMs * 0.001;
    // خفقان المشاعل
    const baseInt = [2.2, 1.2, 1.4];
    for (let i = 0; i < this.torches.length; i++) {
      this.torches[i].intensity = baseInt[i] * (0.88 + Math.sin(t01 * 9 + i * 2.4) * 0.08 + Math.sin(t01 * 23 + i) * 0.05);
    }
    // الشرر
    const pos = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + this.emberVel[i] * dt;
      if (y > 8) { this.resetEmber(pos.array as Float32Array, i); y = 0.3; }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    // الدخان يتصاعد
    const spos = this.smoke.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < spos.count; i++) {
      let y = spos.getY(i) + this.smokeVel[i] * dt;
      if (y > 7) { this.resetSmoke(spos.array as Float32Array, i); y = 0.7; }
      spos.setY(i, y);
      spos.setX(i, spos.getX(i) + Math.sin(t01 + i) * 0.003);
    }
    spos.needsUpdate = true;
    // المتبارزان يتضاربان
    for (let i = 0; i < this.sparring.length; i++) {
      const m = this.sparring[i];
      m.rotation.x = -0.25 * Math.abs(Math.sin(t01 * 5 + i * Math.PI));
      m.position.y = Math.abs(Math.sin(t01 * 5 + i * Math.PI)) * 0.06;
    }
    // مؤشر الاستلام يظهر عند تكدس ≥ ثلث السعة
    for (const [id, coin] of this.coins) {
      const bb = this.view?.buildings?.[id];
      const show = !!bb && bb.level > 0 && bb.bufferCap > 0 && bb.pending >= bb.bufferCap / 3;
      coin.visible = show;
      if (show) { coin.rotation.y = t01 * 2; coin.position.y = 4.6 + Math.sin(t01 * 3) * 0.25; }
    }
    // الحراس يطوفون
    for (const gd of this.guards) {
      gd.angle += gd.speed * dt;
      const x = Math.cos(gd.angle) * gd.radius, z = -5 + Math.sin(gd.angle) * (gd.radius * 0.7);
      gd.mesh.position.set(x, Math.abs(Math.sin(t01 * 6 + gd.radius)) * 0.05, z);
      gd.mesh.rotation.y = -gd.angle - Math.PI / 2;
    }
    // المباني: قفل/مستوى/ترقية + لافتات
    for (const [id, g] of this.groups) {
      const b = this.view?.buildings?.[id];
      const lvl = b?.level ?? 0;
      const locked = lvl <= 0;
      g.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) { m.transparent = locked; m.opacity = locked ? 0.26 : 1; }
      });
      g.scale.setScalar(locked ? 0.85 : 1 + Math.min(0.3, (lvl - 1) * 0.045));
      g.position.y = this.view?.upgrading?.id === id ? Math.abs(Math.sin(t01 * 5)) * 0.25 : 0;
      const label = this.labels.get(id)!;
      const p = new THREE.Vector3(g.position.x, 6.6, g.position.z).project(this.camera);
      const r = this.canvas.getBoundingClientRect();
      label.style.left = `${(p.x * 0.5 + 0.5) * r.width}px`;
      label.style.top = `${(-p.y * 0.5 + 0.5) * r.height}px`;
      label.classList.toggle('locked', locked);
      let sub = locked ? t('locked') : `${t('level')} ${lvl}`;
      if (this.view?.upgrading?.id === id) {
        const left = Math.max(0, Math.ceil((this.view.upgrading.doneAt - Date.now()) / 1000));
        sub = `⏳ ${left}s`;
      }
      label.innerHTML = `${t('b.' + id)}<small>${sub}</small>`;
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const portrait = h > w;
    this.camera.position.set(0, portrait ? 36 : 26, portrait ? 38 : 30);
    this.camera.fov = portrait ? 58 : 50;
    this.camera.lookAt(0, 0, 1);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    removeEventListener('resize', this.onResize);
    for (const [, l] of this.labels) l.remove();
    this.labels.clear();
    this.renderer.dispose();
  }
}
