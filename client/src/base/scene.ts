// مشهد القاعدة — كهف المعقل ثلاثي الأبعاد: مبانٍ قابلة للنقر بلوحة الواقعية الداكنة.
import * as THREE from 'three';
import { t } from '../i18n';

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

export class BaseScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private ray = new THREE.Raycaster();
  private groups = new Map<string, THREE.Group>();
  private labels = new Map<string, HTMLElement>();
  private labelRoot: HTMLElement;
  private view: any = null;
  private mats = new Map<string, THREE.Material>();
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, private onPick: (id: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x121317);
    this.scene.fog = new THREE.Fog(0x121317, 55, 130);
    this.camera = new THREE.PerspectiveCamera(52, 1, 1, 160);
    this.camera.position.set(0, 30, 34);
    this.camera.lookAt(0, 0, 1);
    this.labelRoot = document.getElementById('baselabels')!;
    this.lights();
    this.cavern();
    for (const s of SPOTS) this.buildSpot(s);
    this.resize();
    this.onResize = this.onResize.bind(this);
    addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', e => this.pick(e));
  }

  private onResize(): void { this.resize(); }

  private mat(key: string, make: () => THREE.Material): THREE.Material {
    let m = this.mats.get(key);
    if (!m) { m = make(); this.mats.set(key, m); }
    return m;
  }
  private lamb(color: number): THREE.Material {
    return this.mat('l' + color, () => new THREE.MeshLambertMaterial({ color }));
  }
  private glow(color: number): THREE.Material {
    return this.mat('g' + color, () => new THREE.MeshBasicMaterial({ color }));
  }

  private lights(): void {
    this.scene.add(new THREE.HemisphereLight(0xa8b2c4, 0x453c2e, 1.15));
    const torch1 = new THREE.PointLight(0xe8a45a, 2.2, 60, 1.4);
    torch1.position.set(0, 9, -2);
    this.scene.add(torch1);
    const torch2 = new THREE.PointLight(0x7a96c0, 1.3, 55, 1.6);
    torch2.position.set(0, 11, 16);
    this.scene.add(torch2);
    const fill = new THREE.DirectionalLight(0xd8c9a8, 0.75);
    fill.position.set(-14, 34, 22);
    this.scene.add(fill);
  }

  private cavern(): void {
    // أرضية صخرية مدكوكة
    const floor = new THREE.Mesh(new THREE.CircleGeometry(34, 40), this.lamb(0x413a30));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(20, 36), this.lamb(0x4c4436));
    inner.rotation.x = -Math.PI / 2; inner.position.y = 0.02;
    this.scene.add(inner);
    // جدار الكهف: حلقة صخور غير منتظمة + سقف ستالكتيت
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = 30 + Math.sin(i * 3.1) * 2.5;
      const h = 10 + Math.abs(Math.sin(i * 2.3)) * 8;
      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(3.4 + Math.sin(i * 1.7) * 1.2, h, 5),
        this.lamb(i % 3 ? 0x39332b : 0x453e34));
      rock.position.set(Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
      rock.rotation.y = a;
      this.scene.add(rock);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3;
      const r = 23 + (i % 4) * 3; // بعيدة عن مركز القاعدة كي لا تحجبها
      const st = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4 + (i % 3) * 2, 5), this.lamb(0x332e26));
      st.position.set(Math.cos(a) * r, 22, Math.sin(a) * r);
      st.rotation.x = Math.PI;
      this.scene.add(st);
    }
    // بلورات متوهجة متناثرة (هوية الكهف)
    for (let i = 0; i < 8; i++) {
      const a = i * 0.9, r = 24 + (i % 3) * 3;
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + (i % 3) * 0.25), this.glow(0x3d5a80));
      c.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
      this.scene.add(c);
    }
  }

  private buildSpot(s: Spot): void {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.userData.building = s.id;
    const add = (m: THREE.Mesh, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
    const stone = this.lamb(0x6e6a60), wood = this.lamb(0x6a5540), gold = this.lamb(0xb08a35);
    switch (s.id) {
      case 'hall': {
        add(new THREE.Mesh(new THREE.BoxGeometry(7, 4.6, 5.6), this.lamb(0x767065)), 0, 2.3);
        add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 6.6), this.lamb(0x554f45)), 0, 4.9);
        for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 6.2, 8), stone), sx * 4, 3.1);
        add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), this.glow(0xd88a3a)), 0, 1.4, 2.85); // بوابة مضيئة
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), wood), 0, 6.6);
        add(new THREE.Mesh(new THREE.PlaneGeometry(2, 1.1), this.mat('flag', () =>
          new THREE.MeshLambertMaterial({ color: 0x3d5a80, side: THREE.DoubleSide }))), 1, 7);
        break;
      }
      case 'gold_mine': case 'gold_mine_2': {
        add(new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), this.lamb(0x7a7268)), 0, 1.6);
        add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), this.glow(0x2b211a)), 0, 0.75, 2.15);
        for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.OctahedronGeometry(0.4), this.glow(0xe8c56a)), -1.4 + i, 0.35, 2.6 + (i % 2) * 0.5);
        add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1), wood), 2.4, 0.5, 1.6);
        break;
      }
      case 'farm': {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.25, r = 1.6;
          const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.1, 6), this.lamb(0x7a6f52)), Math.cos(a) * r, 0.55, Math.sin(a) * r);
          add(new THREE.Mesh(new THREE.SphereGeometry(0.55 + (i % 2) * 0.2, 8, 6), this.glow(0x9fb86a)), stem.position.x, 1.25, stem.position.z);
        }
        add(new THREE.Mesh(new THREE.CircleGeometry(2.8, 16), this.lamb(0x33392a)), 0, 0.03).rotation.x = -Math.PI / 2;
        break;
      }
      case 'store': {
        add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), wood), -0.9, 0.8);
        add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), wood), 0.9, 0.65, 0.4);
        add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), wood), 0, 2, 0.1);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 8), this.lamb(0x7d6448)), 1.7, 0.65, -1);
        break;
      }
      case 'barracks': {
        add(new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 4), this.lamb(0x7d6448)), 0, 1.4).rotation.y = Math.PI / 4;
        add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.16), wood), 2.4, 0.55);
        for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 5), this.lamb(0x8b8f98)), 1.7 + i * 0.6, 1.4, 0.1).rotation.z = 0.3;
        add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), this.mat('bflag', () =>
          new THREE.MeshLambertMaterial({ color: 0x8c3b2e, side: THREE.DoubleSide }))), -2, 2.2);
        break;
      }
      case 'siege_shop': {
        add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.6), wood), 0, 0.6);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), wood), -0.6, 1.6).rotation.z = -0.7;
        for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 10), wood), sx * 1.1, 0.55, 0.9).rotation.x = Math.PI / 2;
        add(new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 0.14), stone), 1.6, 0.7, -1.2);
        break;
      }
      case 'lab': {
        for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4 + (i % 2) * 0.5, 8), this.glow(0x5a8a8a)), -1 + i, 0.8, (i % 2) * 0.8);
        add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 2.4), stone), 0, 0.2);
        break;
      }
      case 'monument': {
        add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), stone), 0, 0.35);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.5), gold), 0, 1.8);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), gold), 0, 2.9);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), gold), 0.55, 2.2).rotation.z = -0.4;
        break;
      }
      case 'gate': {
        for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.4, 1.2), stone), sx * 2.4, 2.7);
        add(new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 1.4), stone), 0, 5.6);
        add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), this.mat('portal', () =>
          new THREE.MeshBasicMaterial({ color: 0x3d5a80, transparent: true, opacity: 0.55, side: THREE.DoubleSide }))), 0, 2.5);
        break;
      }
    }
    this.scene.add(g);
    this.groups.set(s.id, g);
    const label = document.createElement('div');
    label.className = 'blabel';
    this.labelRoot.appendChild(label);
    this.labels.set(s.id, label);
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
    const t01 = nowMs * 0.001;
    for (const [id, g] of this.groups) {
      const b = this.view?.buildings?.[id];
      const lvl = b?.level ?? 0;
      const locked = lvl <= 0;
      g.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) { m.transparent = locked; m.opacity = locked ? 0.28 : 1; }
      });
      g.scale.setScalar(locked ? 0.85 : 1 + Math.min(0.35, (lvl - 1) * 0.05));
      // نبض خفيف للمبنى قيد الترقية
      if (this.view?.upgrading?.id === id) g.position.y = Math.abs(Math.sin(t01 * 5)) * 0.25;
      else g.position.y = 0;
      const label = this.labels.get(id)!;
      const p = new THREE.Vector3(g.position.x, 6.2, g.position.z).project(this.camera);
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
