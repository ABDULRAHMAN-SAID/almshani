// مشهد المعركة — Three.js معياري. جودة شريحة: أشكال منخفضة التفصيل
// بلوحة ART_DIRECTION (فحم/فولاذ/جلد) ولهجتا ملكية باردة/دافئة للقراءة الفورية.
import * as THREE from 'three';
import type { MatchClient } from './game';
import { membersAlive, sectorOf, type Squad } from '../../../shared/simulation/src/index';
import { memberGeo, siegeProp, COLD, WARM } from './models';
import { modelMat, merge, box as gbox, cyl as gcyl, cone as gcone } from '../gfx';

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
  unit: string;
  mine: boolean;
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
  private hqMeshes: THREE.Group[] = [];
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
    this.camera.position.set(0, 67, s * 37);
    this.camera.lookAt(0, 0, 0);
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
    const g = new THREE.Mesh(new THREE.PlaneGeometry(W + 22, L + 8), this.mat(0x2a2622));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.4; // منخفضة كفاية فلا تتصارع عمقياً مع القطاعات
    this.scene.add(g);

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
      hq.position.set(0, 0, (p === 0 ? -1 : 1) * a.hqZmm * M);
      this.scene.add(hq);
      this.hqMeshes.push(hq);
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

  private mkGhost(): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0x5ac46a, transparent: true, opacity: 0.45 }));
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  setGhost(x: number | null, z: number | null, valid = true): void {
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
    }
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
    const big = sq.unit === 'raid_cavalry';
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
    this.scene.add(group);
    return { group, members, ring, unit: sq.unit, mine };
  }

  selectSquad(id: number | null): void {
    for (const [sid, v] of this.views) {
      (v.ring.material as THREE.MeshBasicMaterial).opacity = sid === id ? 1 : 0.5;
      v.ring.scale.setScalar(sid === id ? 1.25 : 1);
    }
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
          if (sq.attackedThisTick) {
            m.position.y = Math.abs(Math.sin(t * 14 + i)) * 0.12;
            m.rotation.x = -0.22 * Math.abs(Math.sin(t * 14 + i));      // اندفاعة الضربة
          } else {
            m.position.y = Math.abs(Math.sin(t * 6 + i * 1.3)) * 0.05;
            m.rotation.x = Math.sin(t * 6 + i * 1.3) * 0.05;            // تمايل المسير
          }
        }
      }
      // اتجاه المسير العام
      const face = sq.player === 0 ? 0 : Math.PI;
      v.group.rotation.y = face;
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
    // بورتريه: كاميرا عالية مائلة تُظهر المقرين معاً
    const portrait = h > w;
    const s = this.flipped ? 1 : -1;
    this.camera.position.set(0, portrait ? 67 : 50, s * (portrait ? 37 : 33));
    this.camera.fov = portrait ? 62 : 53;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    for (const [, v] of this.views) this.scene.remove(v.group);
    this.views.clear();
    this.renderer.dispose();
  }
}
