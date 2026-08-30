// مشهد المعركة — Three.js معياري. جودة شريحة: أشكال منخفضة التفصيل
// بلوحة ART_DIRECTION (فحم/فولاذ/جلد) ولهجتا ملكية باردة/دافئة للقراءة الفورية.
import * as THREE from 'three';
import type { MatchClient } from './game';
import { membersAlive, sectorOf, type Squad } from '../../../shared/simulation/src/index';
import { memberGeo, siegeProp, COLD, WARM } from './models';
import { modelMat, merge, box as gbox, cyl as gcyl, cone as gcone, ball as gball } from '../gfx';

const M = 0.001; // مم → متر

const COL = {
  ground: 0x35302a, groundHi: 0x403a32, pit: 0x0c0d10, bridge: 0x55493c,
  hqMine: 0x3d5a80, hqFoe: 0x8c3b2e, stone: 0x5c6270,
  mineBody: 0x4d6f9c, mineHead: 0xd8d2c2, foeBody: 0xa4462f, foeHead: 0xc4b299,
  mineRing: 0x6d8db4, foeRing: 0xb25b28
};

interface SquadView {
  group: THREE.Group;
  members: THREE.Object3D[];
  ring: THREE.Mesh;
  frost: THREE.Mesh;      // هالة الإبطاء (ساحرة الصقيع)
  unit: string;
  mine: boolean;
  lastHp: number;         // لكشف الشفاء بصرياً
  healAt: number;
}

export class BattleRender {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private views = new Map<number, SquadView>();
  private ray = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private sectorTints: THREE.Mesh[] = [];
  private zoneMine!: THREE.Mesh;
  private zoneFwd: THREE.Mesh[] = [];
  private ghost!: THREE.Mesh;
  private fx: { mesh: THREE.Mesh; born: number; life: number }[] = [];
  // مقذوفات مرئية (سهام/حجارة) — عرض فقط، الضرر تحسمه المحاكاة
  private shots: { mesh: THREE.Mesh; sx: number; sz: number; tx: number; tz: number; born: number; dur: number; arcH: number; color: number; impact: number }[] = [];
  private volleyAt = new Map<number, number>();
  private selectedId: number | null = null;
  private selRange: THREE.Mesh | null = null;
  private selMin: THREE.Mesh | null = null;
  private ghostRange: THREE.Mesh | null = null;
  private ghostRangeMm = 0;
  private arrowGeo = new THREE.BoxGeometry(0.09, 0.09, 0.95);
  private stoneGeo = new THREE.SphereGeometry(0.22, 6, 5);
  private shotMats = new Map<number, THREE.MeshBasicMaterial>();
  private hqMeshes: THREE.Group[] = [];
  private gateDoors: (THREE.Mesh | null)[] = [null, null];
  private flagMarks: (THREE.Group | null)[] = [null, null];
  // الجمهور: مجموعات بأطوار مختلفة كي يتموج المدرج لا يقفز كتلة واحدة
  private crowdGroups: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  private cheerUntil = 0;
  private mats = new Map<number, THREE.MeshLambertMaterial>();
  flipped = false; // اللاعب 1 يرى الميدان من جهته

  constructor(private canvas: HTMLCanvasElement, private mc: MatchClient) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.fog = new THREE.Fog(0x181a20, 95, 190);
    this.scene.background = new THREE.Color(0x181a20);
    this.camera = new THREE.PerspectiveCamera(50, 1, 4, 260); // near بعيد نسبياً لدقة عمق أفضل على المشغّلات الضعيفة
    this.flipped = mc.you === 1;
    this.setupCamera();
    this.setupLights();
    this.buildArena();
    this.ghost = this.mkGhost();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  private mat(color: number): THREE.MeshLambertMaterial {
    let m = this.mats.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); this.mats.set(color, m); }
    return m;
  }

  private setupCamera(): void {
    const s = this.flipped ? 1 : -1;
    this.camera.position.set(0, 70, s * 46);
    this.camera.lookAt(0, 0, s * 7); // ميل نحو جهة اللاعب: قلعته كاملة فوق شريط اليد
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xa8b0bf, 0x2a2620, 1.05));
    const sun = new THREE.DirectionalLight(0xe6d8b8, 1.05);
    sun.position.set(-20, 50, -14);
    this.scene.add(sun);
  }

  private buildArena(): void {
    const a = this.mc.ctx.arena;
    const W = a.halfWmm * M * 2, L = a.hqZmm * M * 2 + 10;
    const g = new THREE.Mesh(new THREE.PlaneGeometry(W + 36, L + 30), this.mat(0x2a2622));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.4; // منخفضة كفاية فلا تتصارع عمقياً مع القطاعات
    this.scene.add(g);
    this.buildStands();

    // القطاعات الثلاثة بتظليل خفيف متمايز + طبقة تلوين المسيطر
    const secW = [a.halfWmm - a.sectorEdgeMm, a.sectorEdgeMm * 2, a.halfWmm - a.sectorEdgeMm];
    const secX = [-(a.sectorEdgeMm + (a.halfWmm - a.sectorEdgeMm) / 2), 0, a.sectorEdgeMm + (a.halfWmm - a.sectorEdgeMm) / 2];
    for (let i = 0; i < 3; i++) {
      const base = new THREE.Mesh(
        new THREE.PlaneGeometry(secW[i] * M * 2, a.fieldZmm * M * 2),
        this.mat(i === 1 ? COL.groundHi : COL.ground)
      );
      base.rotation.x = -Math.PI / 2; base.position.set(secX[i] * M, 0, 0);
      this.scene.add(base);
      const tint = new THREE.Mesh(
        new THREE.PlaneGeometry(secW[i] * M * 2 - 0.4, a.fieldZmm * M * 2 - 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      tint.rotation.x = -Math.PI / 2; tint.position.set(secX[i] * M, 0.12, 0);
      this.scene.add(tint);
      this.sectorTints.push(tint);
    }

    // هوّة الوسط وجسرها (سمة «حصن الحدود»)
    const pitW = (a.sectorEdgeMm - a.bridgeHalfWmm) * M;
    for (const sx of [-1, 1]) {
      const pit = new THREE.Mesh(
        new THREE.BoxGeometry(pitW, 2.2, a.bridgeZmm * M * 2), this.mat(COL.pit));
      pit.position.set(sx * (a.bridgeHalfWmm * M + pitW / 2), -1.05, 0);
      this.scene.add(pit);
    }
    // جسر خشبي بألواح متمايزة وأوتاد حبال + صخور مبعثرة على الميدان
    const bw = a.bridgeHalfWmm * M * 2, bl = a.bridgeZmm * M * 2;
    const planks: THREE.BufferGeometry[] = [];
    const nP = Math.floor(bl / 0.62);
    for (let i = 0; i < nP; i++) {
      const tone = i % 3 === 0 ? 0x4a3d2f : i % 3 === 1 ? 0x55493c : 0x5e5142;
      planks.push(gbox(bw, 0.22, 0.52, tone, 0, 0.28, -bl / 2 + 0.34 + i * 0.62));
    }
    for (const sx of [-1, 1]) {
      planks.push(gbox(0.22, 0.55, bl, 0x4a3b2a, sx * (bw / 2 - 0.12), 0.55, 0));
      for (let i = 0; i < 5; i++) planks.push(gcyl(0.06, 0.08, 0.95, 0x3a2e22, sx * (bw / 2 - 0.12), 0.75, -bl / 2 + i * (bl / 4), 5));
    }
    this.scene.add(new THREE.Mesh(merge(planks), modelMat()));
    const props: THREE.BufferGeometry[] = [];
    let seedR = 7;
    const rnd = () => { seedR = (seedR * 16807) % 2147483647; return seedR / 2147483647; };
    for (let i = 0; i < 16; i++) {
      const px = (rnd() * 2 - 1) * (a.halfWmm * M - 2.5);
      const pz = (rnd() * 2 - 1) * (a.fieldZmm * M - 2.5);
      if (Math.abs(px) < a.sectorEdgeMm * M + 2 && Math.abs(pz) < a.bridgeZmm * M + 2) continue;
      const sc = 0.4 + rnd() * 0.8;
      props.push(gbox(sc, sc * 0.7, sc * 0.85, rnd() > 0.5 ? 0x4c463c : 0x59523f, px, sc * 0.3, pz, rnd() * 3));
    }
    this.scene.add(new THREE.Mesh(merge(props), modelMat()));

    // خطا حدود القطاعات
    for (const sx of [-1, 1]) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, a.fieldZmm * M * 2),
        new THREE.MeshBasicMaterial({ color: 0x565b64, transparent: true, opacity: 0.35 }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(sx * a.sectorEdgeMm * M, 0.2, 0);
      this.scene.add(line);
    }

    // المقران: حصنان بشرفات وبوابة مضيئة ورايات
    for (let p = 0; p < 2; p++) {
      const mine = p === this.mc.you;
      const hq = new THREE.Group();
      const c = mine ? COL.hqMine : COL.hqFoe;
      const stone = 0x6e6a60, stoneD = 0x565248;
      const parts = [
        gbox(6.5, 4.2, 5, stone, 0, 2.1, 0),
        gbox(7.3, 0.6, 5.8, stoneD, 0, 4.5, 0)
      ];
      for (let i = -3; i <= 3; i++) parts.push(gbox(0.6, 0.55, 0.5, stone, i * 1.05, 5.05, 2.7));
      for (let i = -3; i <= 3; i++) parts.push(gbox(0.6, 0.55, 0.5, stone, i * 1.05, 5.05, -2.7));
      for (const sx of [-1, 1]) {
        parts.push(gcyl(1.0, 1.25, 5.6, stone, sx * 3.7, 2.8, 0, 8));
        parts.push(gcone(1.3, 1.1, c, sx * 3.7, 6.15, 0, 8));
      }
      parts.push(gcyl(0.07, 0.07, 3.4, 0x2a2118, 0, 6.6, 0, 6));
      hq.add(new THREE.Mesh(merge(parts), modelMat()));
      const gate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.6),
        new THREE.MeshBasicMaterial({ color: mine ? 0x6d8db4 : 0xd88a3a }));
      gate.position.set(0, 1.3, (p === 0 ? 1 : -1) * 2.51);
      if (p === 1) gate.rotation.y = Math.PI;
      hq.add(gate);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3),
        new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
      flag.position.set(1.25, 7.25, 0);
      hq.add(flag);
      hq.position.set(0, 0, (p === 0 ? -1 : 1) * (a.hqZmm * M + 1.4)); // مزاحة خلف السور كي لا تخترقه بعد التكبير
      hq.scale.setScalar(1.3); // قلعة مهيبة تُرى بوضوح من كاميرا الميدان
      this.scene.add(hq);
      this.hqMeshes.push(hq);

      // سور البوابة (المرحلة الأولى من القلعة): جداران وبوابة خشبية قابلة للكسر
      const gz = (p === 0 ? -1 : 1) * a.gateZmm * M;
      const wallParts: THREE.BufferGeometry[] = [];
      const wallHalf = a.halfWmm * M;
      for (const side of [-1, 1]) {
        const segW = wallHalf - 2.6;
        wallParts.push(gbox(segW, 3.4, 1.6, stone, side * (2.6 + segW / 2), 1.7, 0));
        for (let i = 0; i < Math.floor(segW / 1.4); i++) {
          wallParts.push(gbox(0.7, 0.5, 1.0, stoneD, side * (2.9 + i * 1.4), 3.65, 0));
        }
        wallParts.push(gbox(1.4, 4.6, 1.9, stone, side * 2.7, 2.3, 0));
        wallParts.push(gcone(1.0, 0.9, c, side * 2.7, 5.05, 0, 6));
      }
      const wall = new THREE.Mesh(merge(wallParts), modelMat());
      wall.position.z = gz;
      this.scene.add(wall);
      const doors = new THREE.Mesh(
        merge([
          gbox(1.9, 3.6, 0.35, 0x5c4a38, -1.0, 1.8, 0),
          gbox(1.9, 3.6, 0.35, 0x5c4a38, 1.0, 1.8, 0),
          gbox(3.9, 0.28, 0.4, 0x3a2e22, 0, 1.2, 0),
          gbox(3.9, 0.28, 0.4, 0x3a2e22, 0, 2.6, 0)
        ]), modelMat());
      doors.position.z = gz;
      this.scene.add(doors);
      this.gateDoors[p] = doors;
    }

    // منطقتا النشر (تظهران أثناء السحب)
    const zoneMat = new THREE.MeshBasicMaterial({ color: 0x4a7a4a, transparent: true, opacity: 0 });
    const ownDepth = (a.fieldZmm - a.deployOwnZmm) * M;
    this.zoneMine = new THREE.Mesh(new THREE.PlaneGeometry(a.halfWmm * M * 2, ownDepth), zoneMat.clone());
    this.zoneMine.rotation.x = -Math.PI / 2;
    this.zoneMine.renderOrder = 2;
    const zs = this.mc.you === 0 ? -1 : 1;
    this.zoneMine.position.set(0, 0.3, zs * (a.deployOwnZmm * M + ownDepth / 2));
    this.scene.add(this.zoneMine);
    for (let i = 0; i < 3; i++) {
      const fwd = new THREE.Mesh(
        new THREE.PlaneGeometry(secW[i] * M * 2 - 0.5, (a.deployOwnZmm + a.deployForwardZmm) * M), zoneMat.clone());
      fwd.rotation.x = -Math.PI / 2;
      fwd.renderOrder = 2;
      fwd.position.set(secX[i] * M, 0.3, zs * (a.deployOwnZmm - a.deployForwardZmm) * M / 2);
      this.scene.add(fwd);
      this.zoneFwd.push(fwd);
    }
  }

  // ═══ الكولوسيوم: مدرجات محيطة بجمهور حي — الساحة حلبة استعراض لا ميدان مهجور ═══
  private buildStands(): void {
    const a = this.mc.ctx.arena;
    const stone = 0x45413a, stoneD = 0x3a362f, wallBack = 0x322e28;
    const skins = [0xd8c9a8, 0xc9b489, 0xb59a76, 0x8a6a4e];
    const garb = [0xc9b489, 0xa4462f, 0x4d6f9c, 0x8a7a5c, 0xb08d4a, 0x8c8478, 0x9c5a3c, 0x5c718a, 0x6d4a35, 0x746a80];
    let seed = 29;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    const tiers = 3, tierD = 2.1, tierH = 1.15;
    const sideX0 = a.halfWmm * M + 2.0;             // مسافة عن حافة الميدان
    const sideLen = a.hqZmm * M * 2 + 6;
    const endZ0 = a.hqZmm * M + 4.6;                // مدرج خلف كل قلعة — قلعتك محاطة بجمهورها
    const endW = a.halfWmm * M * 2 + 1;

    const steps: THREE.BufferGeometry[] = [];
    const deco: THREE.BufferGeometry[] = [];
    const flames: THREE.BufferGeometry[] = [];
    const buckets: THREE.BufferGeometry[][] = [[], [], [], []];
    const spectator = (x: number, y: number, z: number, faceY: number): void => {
      const b = buckets[Math.floor(rnd() * 4)];
      b.push(gbox(0.36, 0.52, 0.28, garb[Math.floor(rnd() * garb.length)], x, y + 0.26, z, faceY + (rnd() - 0.5) * 0.6));
      b.push(gball(0.155, skins[Math.floor(rnd() * skins.length)], x, y + 0.64, z, 6, 5));
    };

    // المدرجات الجانبية على طول الساحة كلها
    for (const side of [-1, 1]) {
      for (let t = 0; t < tiers; t++) {
        const x = side * (sideX0 + tierD * t + tierD / 2);
        const h = tierH * (t + 1);
        steps.push(gbox(tierD, h, sideLen, t % 2 ? stoneD : stone, x, h / 2, 0));
        const rowX = side * (sideX0 + tierD * t + tierD * 0.5);
        for (let z = -sideLen / 2 + 1.2; z < sideLen / 2 - 1; z += 1.25) {
          if (rnd() < 0.82) spectator(rowX + (rnd() - 0.5) * 0.7, h, z, side > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      }
      // جدار خلفي مع رايات المملكتين ومشاعل
      const bx = side * (sideX0 + tierD * tiers + 0.5);
      steps.push(gbox(1.0, tierH * tiers + 2.2, sideLen, wallBack, bx, (tierH * tiers + 2.2) / 2, 0));
      for (let i = 0; i < 7; i++) {
        const z = -sideLen / 2 + 4 + i * (sideLen - 8) / 6;
        const py = tierH * tiers + 2.2;
        deco.push(gcyl(0.07, 0.09, 2.6, 0x54432f, bx, py + 1.1, z, 5));
        deco.push(gbox(0.08, 1.0, 1.5, i % 2 ? COL.hqMine : COL.hqFoe, bx + side * 0.06, py + 1.9, z + 0.75));
        if (i % 2 === 0) {
          deco.push(gcyl(0.05, 0.07, 1.1, 0x3a2e22, bx - side * 0.6, py - 1.4, z + 2, 5));
          flames.push(gcone(0.22, 0.55, 0xe8a45a, bx - side * 0.6, py - 0.7, z + 2, 6));
        }
      }
    }

    // مدرجا النهايتين خلف القلعتين (منحنيان قليلاً نحو الميدان)
    for (const ez of [-1, 1]) {
      for (let t = 0; t < tiers; t++) {
        const z = ez * (endZ0 + tierD * t + tierD / 2);
        const h = tierH * (t + 1);
        steps.push(gbox(endW + t * 1.6, h, tierD, t % 2 ? stoneD : stone, 0, h / 2, z));
        for (let x = -(endW + t * 1.6) / 2 + 1; x < (endW + t * 1.6) / 2 - 0.8; x += 1.25) {
          if (rnd() < 0.8) spectator(x, h, z + (rnd() - 0.5) * 0.7, ez > 0 ? Math.PI : 0);
        }
      }
      const bz = ez * (endZ0 + tierD * tiers + 0.5);
      steps.push(gbox(endW + tiers * 1.6, tierH * tiers + 2.0, 1.0, wallBack, 0, (tierH * tiers + 2.0) / 2, bz));
    }

    // أبراج الزوايا الأربع برايات — إطار الكولوسيوم
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (sideX0 + tierD * tiers + 0.6), cz = sz * (endZ0 + tierD * tiers + 0.2);
      steps.push(gcyl(1.15, 1.45, tierH * tiers + 4.6, stone, cx, (tierH * tiers + 4.6) / 2, cz, 8));
      deco.push(gcone(1.5, 1.4, sz === (this.mc.you === 0 ? -1 : 1) ? COL.hqMine : COL.hqFoe, cx, tierH * tiers + 5.3, cz, 8));
      deco.push(gcyl(0.06, 0.06, 2.2, 0x2a2118, cx, tierH * tiers + 6.8, cz, 5));
    }

    this.scene.add(new THREE.Mesh(merge(steps), modelMat()));
    this.scene.add(new THREE.Mesh(merge(deco), modelMat()));
    // ألسنة المشاعل بخامة غير مضاءة كي تتوهج في العتمة
    this.scene.add(new THREE.Mesh(merge(flames), new THREE.MeshBasicMaterial({ vertexColors: true })));
    for (const b of buckets) {
      const mesh = new THREE.Mesh(merge(b), modelMat());
      this.scene.add(mesh);
      this.crowdGroups.push({ mesh, baseY: 0, phase: rnd() * Math.PI * 2 });
    }
  }

  // هتاف: يرفع تموج الجمهور لحظة القتل/كسر البوابة/المهارة
  cheer(): void { this.cheerUntil = performance.now() + 1400; }

  private mkGhost(): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0x5ac46a, transparent: true, opacity: 0.45 }));
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  setGhost(x: number | null, z: number | null, valid = true, rangeMm = 0, ringColor = 0xd8b04a): void {
    const dragging = x !== null && z !== null;
    this.ghost.visible = dragging;
    const op = dragging ? 0.16 : 0;
    (this.zoneMine.material as THREE.MeshBasicMaterial).opacity = op;
    this.zoneFwd.forEach((f, i) => {
      (f.material as THREE.MeshBasicMaterial).opacity =
        dragging && this.mc.st.players[this.mc.you].forward[i] ? op : 0;
    });
    if (dragging) {
      this.ghost.position.set(x! * M, 0.4, z! * M);
      (this.ghost.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x5ac46a : 0xc9503e);
      // دائرة مدى الوحدة المسحوبة — تخطيط الرمية قبل النشر
      const r = Math.max(rangeMm, 1500) * M;
      if (!this.ghostRange || Math.abs(this.ghostRangeMm - rangeMm) > 1) {
        this.ghostRange?.geometry.dispose();
        if (this.ghostRange) this.scene.remove(this.ghostRange);
        this.ghostRange = new THREE.Mesh(
          new THREE.RingGeometry(r - 0.18, r, 56),
          new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
        this.ghostRange.rotation.x = -Math.PI / 2;
        this.ghostRange.position.y = 0.35;
        this.scene.add(this.ghostRange);
        this.ghostRangeMm = rangeMm;
      }
      (this.ghostRange.material as THREE.MeshBasicMaterial).color.setHex(ringColor);
      this.ghostRange.visible = true;
      this.ghostRange.position.set(x! * M, 0.35, z! * M);
    } else if (this.ghostRange) {
      this.ghostRange.visible = false;
    }
  }

  private roleRingColor(unit: string): number {
    const u = this.mc.ctx.units[unit];
    if (u.healCentiPerTick > 0) return 0x9fb86a;
    if (u.slowMill > 0) return 0x9fd0e8;
    if (u.role === 'ranged' || u.role === 'siege') return 0xd8b04a;
    return 0x8fb2dd;
  }

  screenToWorld(px: number, py: number): { x: number; z: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.groundPlane, hit)) return null;
    return { x: Math.round(hit.x / M), z: Math.round(hit.z / M) };
  }

  worldToScreen(xMm: number, zMm: number, y = 1.6): { x: number; y: number } {
    const v = new THREE.Vector3(xMm * M, y, zMm * M).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
  }

  private mkView(sq: Squad): SquadView {
    const u = this.mc.ctx.units[sq.unit];
    const mine = sq.player === this.mc.you;
    const group = new THREE.Group();
    const members: THREE.Object3D[] = [];
    const geo = memberGeo(sq.unit, mine);
    const mat = modelMat();
    const big = sq.unit === 'hollow_knights' || sq.unit === 'stone_golem';
    const siege = u.role === 'siege';
    for (let i = 0; i < u.size; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(1.35); // تكبير بصري: التفاصيل تُقرأ من ارتفاع كاميرا الميدان
      const spread = big ? 1.05 : 0.78;
      const r = spread * Math.sqrt(i + 0.4), th = i * 2.39996;
      // طاقم الحصار يلتف حول الآلة بدل مركزها
      const rr = siege ? r + 1.2 : r;
      m.position.set(Math.cos(th) * rr, 0, Math.sin(th) * rr);
      m.rotation.y = Math.sin(i * 7.3) * 0.2;
      group.add(m);
      members.push(m);
    }
    if (siege) {
      const prop = siegeProp(sq.unit, mine ? COLD : WARM);
      if (prop) group.add(new THREE.Mesh(prop, mat));
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: mine ? COL.mineRing : COL.foeRing, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
    group.add(ring);
    const frost = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fd0e8, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    frost.rotation.x = -Math.PI / 2; frost.position.y = 0.28; frost.visible = false;
    group.add(frost);
    this.scene.add(group);
    return { group, members, ring, frost, unit: sq.unit, mine, lastHp: sq.hpCenti, healAt: 0 };
  }

  selectSquad(id: number | null): void {
    this.selectedId = id;
    for (const [sid, v] of this.views) {
      (v.ring.material as THREE.MeshBasicMaterial).opacity = sid === id ? 1 : 0.5;
      v.ring.scale.setScalar(sid === id ? 1.25 : 1);
    }
    // دوائر مدى الفرقة المختارة (+ منطقة العمى الدنيا للمنجنيق)
    if (this.selRange) { this.scene.remove(this.selRange); this.selRange.geometry.dispose(); this.selRange = null; }
    if (this.selMin) { this.scene.remove(this.selMin); this.selMin.geometry.dispose(); this.selMin = null; }
    if (id === null) return;
    const sq = this.mc.st.squads.find(s => s.id === id);
    if (!sq) return;
    const u = this.mc.ctx.units[sq.unit];
    const r = Math.max(u.rangeMm, 1500) * M;
    this.selRange = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.2, r, 64),
      new THREE.MeshBasicMaterial({ color: this.roleRingColor(sq.unit), transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    this.selRange.rotation.x = -Math.PI / 2; this.selRange.position.y = 0.32;
    this.scene.add(this.selRange);
    if (u.minRangeMm > 0) {
      const mr = u.minRangeMm * M;
      this.selMin = new THREE.Mesh(
        new THREE.RingGeometry(mr - 0.18, mr, 40),
        new THREE.MeshBasicMaterial({ color: 0xc9503e, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      this.selMin.rotation.x = -Math.PI / 2; this.selMin.position.y = 0.32;
      this.scene.add(this.selMin);
    }
  }

  private shotMat(color: number): THREE.MeshBasicMaterial {
    let m = this.shotMats.get(color);
    if (!m) { m = new THREE.MeshBasicMaterial({ color }); this.shotMats.set(color, m); }
    return m;
  }

  private fireShot(sx: number, sz: number, tx: number, tz: number, kind: 'arrow' | 'flame' | 'stone' | 'boulder' | 'ice', delayMs = 0): void {
    const spec = {
      arrow: { geo: this.arrowGeo, color: 0xd8d2c2, dur: 380, arc: 2.2, impact: 1.2 },
      flame: { geo: this.arrowGeo, color: 0xe8a45a, dur: 400, arc: 2.2, impact: 2.2 },
      stone: { geo: this.stoneGeo, color: 0x8b8478, dur: 480, arc: 3.6, impact: 1.2 },
      boulder: { geo: this.stoneGeo, color: 0x6e675c, dur: 950, arc: 9, impact: 2.8 },
      ice: { geo: this.stoneGeo, color: 0x9fd0e8, dur: 420, arc: 1.6, impact: 2.0 }
    }[kind];
    const mesh = new THREE.Mesh(spec.geo, this.shotMat(spec.color));
    if (kind === 'boulder') mesh.scale.setScalar(1.6);
    mesh.visible = false;
    this.scene.add(mesh);
    this.shots.push({ mesh, sx, sz, tx, tz, born: performance.now() + delayMs, dur: spec.dur, arcH: spec.arc, color: spec.color, impact: spec.impact });
  }

  spawnFx(xMm: number, zMm: number, color: number, maxR = 3): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.7, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(xMm * M, 0.35, zMm * M);
    ring.userData.maxR = maxR;
    this.scene.add(ring);
    this.fx.push({ mesh: ring, born: performance.now(), life: 650 });
  }

  sync(nowMs: number): void {
    const mc = this.mc;
    const alpha = mc.alpha(nowMs);
    const live = new Set<number>();
    for (const sq of mc.st.squads) {
      live.add(sq.id);
      let v = this.views.get(sq.id);
      if (!v) { v = this.mkView(sq); this.views.set(sq.id, v); }
      const pose = mc.pose(sq.id, alpha);
      if (!pose) continue;
      v.group.position.set(pose.x * M, 0, pose.z * M);
      const u = mc.ctx.units[sq.unit];
      const alive = membersAlive(sq, u);
      const landing = sq.landingTicks > 0;
      const scale = landing ? 0.4 + 0.6 * (1 - sq.landingTicks / mc.ctx.arena.landingTicks) : 1;
      v.group.scale.setScalar(scale);
      const t = nowMs * 0.001;
      for (let i = 0; i < v.members.length; i++) {
        const m = v.members[i];
        m.visible = i < alive;
        if (m.visible && !landing) {
          const flyBase = mc.ctx.units[sq.unit].flying ? 2.1 + Math.sin(t * 3 + i) * 0.25 : 0;
          if (sq.attackedThisTick) {
            m.position.y = flyBase + Math.abs(Math.sin(t * 14 + i)) * 0.12;
            m.rotation.x = -0.22 * Math.abs(Math.sin(t * 14 + i));      // اندفاعة الضربة
          } else {
            m.position.y = flyBase + Math.abs(Math.sin(t * 6 + i * 1.3)) * 0.05;
            m.rotation.x = Math.sin(t * 6 + i * 1.3) * 0.05;            // تمايل المسير
          }
        }
      }
      // اتجاه المسير العام
      const face = sq.player === 0 ? 0 : Math.PI;
      v.group.rotation.y = face;
      // هالة الصقيع على المبطَّئين
      v.frost.visible = sq.slowUntilTick > mc.st.tick;
      // وميض شفاء أخضر عند ارتفاع الصحة
      if (sq.hpCenti > v.lastHp + 5 && nowMs - v.healAt > 550) {
        this.spawnFx(pose.x, pose.z, 0x9fb86a, 1.4);
        v.healAt = nowMs;
      }
      v.lastHp = sq.hpCenti;
      // رشقة مقذوفات مرئية من الرماة والحصار والساحرة
      const uu = mc.ctx.units[sq.unit];
      const shooter = uu.role === 'ranged' || uu.role === 'siege' || uu.slowMill > 0;
      if (shooter && sq.attackedThisTick && !landing && nowMs - (this.volleyAt.get(sq.id) ?? 0) > 430) {
        this.volleyAt.set(sq.id, nowMs);
        let tx: number | null = null, tz: number | null = null;
        if (sq.targetId >= 0) {
          const tp = mc.pose(sq.targetId, alpha);
          if (tp) { tx = tp.x * M; tz = tp.z * M; }
        }
        if (tx === null) {
          tz = (sq.player === 0 ? 1 : -1) * mc.ctx.arena.hqZmm * M;
          tx = 0;
        }
        const sxm = pose.x * M, szm = pose.z * M;
        if (sq.unit === 'flame_casters') { this.fireShot(sxm, szm, tx!, tz!, 'flame'); this.fireShot(sxm + 0.5, szm, tx! + 0.4, tz!, 'flame', 90); }
        else if (uu.slowMill > 0) this.fireShot(sxm, szm, tx!, tz!, 'ice');
        else if (uu.role === 'ranged') { this.fireShot(sxm, szm, tx!, tz!, 'arrow'); this.fireShot(sxm - 0.5, szm + 0.3, tx! + 0.5, tz! - 0.3, 'arrow', 110); }
      }
    }
    // بوابتا القلعتين: تختفي الأبواب عند الكسر — يُفتح الفناء
    for (let p = 0; p < 2; p++) {
      const doors = this.gateDoors[p];
      if (doors) doors.visible = mc.st.players[p].gateHpCenti > 0;
      // راية القيادة النشطة
      const P = mc.st.players[p];
      const active = P.flagUntilTick > mc.st.tick;
      let fm = this.flagMarks[p];
      if (active && !fm) {
        fm = new THREE.Group();
        const mine = p === mc.you;
        const col = mine ? COL.hqMine : COL.hqFoe;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), this.mat(0x54432f));
        pole.position.y = 1.7; fm.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0),
          new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
        cloth.position.set(0.85, 2.8, 0); fm.add(cloth);
        const ring = new THREE.Mesh(new THREE.RingGeometry(mc.ctx.arena.flagRadiusMm * M - 0.2, mc.ctx.arena.flagRadiusMm * M, 48),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; fm.add(ring);
        this.scene.add(fm);
        this.flagMarks[p] = fm;
      }
      if (fm) {
        fm.visible = active;
        if (active) fm.position.set(P.flagX * M, 0, P.flagZ * M);
      }
    }
    // دوائر مدى الفرقة المختارة تلاحقها
    if (this.selectedId !== null) {
      const selPose = mc.pose(this.selectedId, alpha);
      if (selPose && this.selRange) {
        this.selRange.position.set(selPose.x * M, 0.32, selPose.z * M);
        this.selMin?.position.set(selPose.x * M, 0.32, selPose.z * M);
      } else if (!selPose) {
        this.selectSquad(null);
      }
    }
    // تحليق المقذوفات: قوس مكافئ + توجيه + أثر ارتطام
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      const k = (nowMs - sh.born) / sh.dur;
      if (k < 0) { sh.mesh.visible = false; continue; }
      if (k >= 1) {
        this.scene.remove(sh.mesh);
        this.shots.splice(i, 1);
        this.spawnFx(sh.tx / M, sh.tz / M, sh.color, sh.impact);
        continue;
      }
      sh.mesh.visible = true;
      const x = sh.sx + (sh.tx - sh.sx) * k;
      const z = sh.sz + (sh.tz - sh.sz) * k;
      const y = 1.6 + Math.sin(k * Math.PI) * sh.arcH;
      sh.mesh.position.set(x, y, z);
      sh.mesh.lookAt(sh.tx, 1.2, sh.tz);
    }
    for (const [id, v] of this.views) {
      if (!live.has(id)) { this.scene.remove(v.group); this.views.delete(id); }
    }
    // تلوين القطاعات بالمسيطر
    for (let i = 0; i < 3; i++) {
      const ctl = mc.st.sectorController[i];
      const m = this.sectorTints[i].material as THREE.MeshBasicMaterial;
      if (ctl === -1) m.opacity = 0;
      else { m.opacity = 0.07; m.color.setHex(ctl === mc.you ? COL.mineRing : COL.foeRing); }
    }
    // تموج الجمهور — ويشتد هتافاً بعد قتل أو كسر بوابة
    const tc = nowMs * 0.001;
    const cheering = nowMs < this.cheerUntil;
    for (const cg of this.crowdGroups) {
      cg.mesh.position.y = cg.baseY +
        Math.abs(Math.sin(tc * (cheering ? 5.2 : 2.1) + cg.phase)) * (cheering ? 0.28 : 0.08);
    }
    // مؤثرات
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      const k = (nowMs - f.born) / f.life;
      if (k >= 1) { this.scene.remove(f.mesh); this.fx.splice(i, 1); continue; }
      f.mesh.scale.setScalar(1 + k * (f.mesh.userData.maxR ?? 3));
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // بورتريه: كاميرا عالية مائلة أبعد قليلاً — قلعتك كاملة في الإطار مع المدرجات
    const portrait = h > w;
    const s = this.flipped ? 1 : -1;
    this.camera.position.set(0, portrait ? 70 : 54, s * (portrait ? 46 : 40));
    this.camera.fov = portrait ? 60 : 50;
    this.camera.lookAt(0, 0, s * (portrait ? 7 : 3)); // قلعة اللاعب كاملة في الإطار
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    for (const [, v] of this.views) this.scene.remove(v.group);
    this.views.clear();
    this.renderer.dispose();
  }
}
