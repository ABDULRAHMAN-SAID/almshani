// خدمة تحدّي: الحسابات، الحفظ السحابي، النتائج المتحقَّق منها، لوحات الصدارة، وتتابع الغرف.
// القاعدة الذهبية: أي قيمة تصل من العميل ادّعاء يُفحص — الهوية من الجلسة، والرتبة من هنا لا من الهاتف.
import { randomBytes } from 'node:crypto';
import RankCore from '../../../src/progression/rank.js';
import type { RankProfile } from '../../../src/progression/rank.js';
import { RecordStore, type Row } from './tstore';
import CATALOG from '../../../src/economy/catalog.js';
import { verify as verifyReceipt, iapStatus } from './iap';
import type { ClientMsg, ServerMsg, CloudSave, ResultReport, PeerView, FriendView, LeaderRow, GameId, PurchaseClaim, PurchaseRec } from './protocol';

export interface Account {
  token: string; id: string; name: string; email?: string; createdAt: number; lastSeen: number;
  save: CloudSave | null;
  ranks: Record<string, RankProfile>;
  friends: string[];      // معرّفات أصدقاء مقبولين من الطرفين
  reqIn: string[];        // طلبات وصلتك
  reqOut: string[];       // طلبات أرسلتها
}
export interface Session {
  peer: string; account: Account; presence: Record<string, unknown>;
  send: (m: ServerMsg) => void;
  rl?: Record<string, { n: number; t: number }>;   // دلاء المعدّل لكل نوع رسالة
}
interface Pending {
  gameId: GameId; mode: string; participants: string[]; createdAt: number;
  reports: Map<string, ResultReport>;
}
interface Persisted { v: 1; accounts: Account[]; purchases?: PurchaseRec[] }
const PLATFORMS = new Set(['ios', 'android', 'test']);
const MAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_RECEIPT_BYTES = 64 * 1024;

const MAX_SAVE_BYTES = 256 * 1024;
const MAX_PRESENCE_BYTES = 4 * 1024;
const MAX_EMIT_BYTES = 8 * 1024;
const RESULT_WAIT_MS = parseInt(process.env.TAHADDI_RESULT_WAIT_MS ?? '90000', 10);
const SWEEP_MS = parseInt(process.env.TAHADDI_SWEEP_MS ?? '5000', 10);
const TOPIC_RE = /^[a-z][a-z0-9_.-]{0,47}$/;

export function sanitizeName(n: unknown): string | null {
  if (typeof n !== 'string') return null;
  const s = n.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return s.length >= 2 ? s : null;
}
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v ?? null), 'utf8');
const ID_RE = /^p[0-9a-f]{12}$/;
const MAX_FRIENDS = 200;
/* حدّ المعدّل لكل جلسة ولكل نوع رسالة: [الرشقة المسموحة, المتجدّد في الثانية].
   الحدود السابقة كانت حدود حجم فقط — لا شيء كان يمنع ألف رسالة في الثانية من جلسة واحدة. */
const RATE: Record<string, [number, number]> = {
  emit: [60, 30], presence: [40, 15], saveCloud: [6, 1], loadCloud: [6, 1],
  submitResult: [8, 2], leaderboard: [8, 2], profile: [24, 6],
  friendAdd: [12, 1], friendAccept: [12, 1], friendRemove: [12, 1], friends: [12, 3],
  setName: [6, 1], setEmail: [6, 1], purchase: [8, 1], purchases: [8, 1]
};
const RATE_ANY: [number, number] = [30, 10];
const MAX_PEER_LIST = 60;      // صفّ البحث عن مباراة قد يكون ضخمًا — تكفي عيّنة للاختيار منها
const IDLE = '\u0000idle';     // من ليس في غرفة ولا يبحث عن مباراة: لا قائمة أقران له
const idList = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ID_RE.test(x)))].slice(0, MAX_FRIENDS) : [];

export class TahaddiService {
  private accounts = new Map<string, Account>();      // token → account
  private byId = new Map<string, Account>();          // id → account
  private sessions = new Map<string, Session>();      // peer → session
  private groups = new Map<string, Set<Session>>();   // مفتاح المجموعة → جلساتها (فهرس البثّ)
  private byAcc = new Map<string, Set<Session>>();    // معرّف الحساب → جلساته
  private pending = new Map<string, Pending>();       // matchId → reports
  private purchases = new Map<string, PurchaseRec>();  // txId → شراء ممنوح (منع إعادة الاستخدام)
  private store: RecordStore;
  private sweeper: ReturnType<typeof setInterval>;

  constructor(store?: RecordStore) {
    this.store = store ?? new RecordStore();
    this.store.onCompact(() => this.allRows());
    const saved = this.store.load();
    if (saved?.accounts) {
      for (const a of saved.accounts as any[]) {
        const acc: Account = {
          token: String(a.token), id: String(a.id), name: sanitizeName(a.name) ?? 'لاعب',
          createdAt: +a.createdAt || Date.now(), lastSeen: +a.lastSeen || 0,
          save: a.save && typeof a.save === 'object' && a.save.blob && typeof a.save.blob === 'object' ? { t: +a.save.t || 0, blob: a.save.blob } : null,
          ranks: {},
          friends: idList(a.friends), reqIn: idList(a.reqIn), reqOut: idList(a.reqOut)
        };
        for (const g of RankCore.GAMES) acc.ranks[g] = RankCore.sanitizeProfile((a.ranks || {})[g], g);
        this.accounts.set(acc.token, acc); this.byId.set(acc.id, acc);
      }
      for (const r of (saved.purchases ?? []) as PurchaseRec[]) if (r && typeof r.txId === 'string') this.purchases.set(r.txId, r);
      console.log(`tahaddi/store: حُمّل ${this.accounts.size} حسابًا و${this.purchases.size} شراءً`);
    }
    this.sweeper = setInterval(() => this.sweepPending(), SWEEP_MS);
    (this.sweeper as any).unref?.();
  }

  /** كل السجلات الحيّة — للكبس الدوريّ وحده، لا لكل حفظ */
  private allRows(): Row[] {
    const out: Row[] = [];
    for (const a of this.accounts.values()) out.push({ k: 'a', i: a.token, v: a });
    for (const r of this.purchases.values()) out.push({ k: 'p', i: r.txId, v: r });
    return out;
  }
  /** حساب واحد تغيّر — سطر واحد في السجلّ، بلا تسلسل بقيّة الحسابات */
  private persist(a?: Account): void {
    if (a) this.store.put('a', a.token, a); else this.store.compact();
  }
  private persistBuy(r: PurchaseRec): void { this.store.put('p', r.txId, r); }
  flush(): void { this.store.flush(); }
  close(): void { clearInterval(this.sweeper); this.store.close(); }

  /* ── فهرس البثّ ──
     كلفة أي رسالة يجب أن تكون بحجم الغرفة لا بعدد المتصلين بالخادم.
     مفتاح المجموعة: رمز الغرفة (r…)، أو صفّ البحث عن مباراة (q…)، أو الخمول.
     الخامل لا تُبنى له قائمة بكل من على الخادم — يُرسَل له نفسه فقط. */
  private key(s: Session): string {
    const pc = s.presence.pc, lf = s.presence.lf;
    if (typeof pc === 'string' && pc) return 'r' + pc;
    if (typeof lf === 'string' && lf) return 'q' + lf;
    return IDLE;
  }
  private gJoin(s: Session, k: string): void {
    let set = this.groups.get(k); if (!set) this.groups.set(k, set = new Set()); set.add(s);
  }
  private gLeave(s: Session, k: string): void {
    const set = this.groups.get(k); if (!set) return;
    set.delete(s); if (!set.size) this.groups.delete(k);
  }
  private accJoin(s: Session): void {
    let set = this.byAcc.get(s.account.id); if (!set) this.byAcc.set(s.account.id, set = new Set()); set.add(s);
  }
  private accLeave(s: Session): void {
    const set = this.byAcc.get(s.account.id); if (!set) return;
    set.delete(s); if (!set.size) this.byAcc.delete(s.account.id);
  }
  private pv(x: Session): PeerView { return { peer: x.peer, by: x.account.id, kind: 'viewer' as const, presence: x.presence }; }
  private sendSelf(s: Session): void { s.send({ t: 'peers', list: [this.pv(s)] }); }
  /** قائمة الأقران لمجموعة واحدة — تُبنى مرّة وتُرسل لأهلها وحدهم */
  private bcast(k: string): void {
    if (k === IDLE) return;
    const set = this.groups.get(k); if (!set) return;
    const list: PeerView[] = [];
    for (const x of set) { if (list.length >= MAX_PEER_LIST) break; list.push(this.pv(x)); }
    for (const x of set) x.send({ t: 'peers', list });
  }

  /* ── الحساب ── */
  hello(send: (m: ServerMsg) => void, token?: string, name?: string, rid?: string, peerWant?: string): Session {
    const found = typeof token === 'string' ? this.accounts.get(token) : undefined;
    let account = found;
    if (!account) {
      account = {
        token: randomBytes(16).toString('hex'),
        id: 'p' + randomBytes(6).toString('hex'),
        name: sanitizeName(name) ?? `لاعب-${this.byId.size + 1}`,
        createdAt: Date.now(), lastSeen: Date.now(), save: null, ranks: {}, friends: [], reqIn: [], reqOut: []
      };
      for (const g of RankCore.GAMES) account.ranks[g] = RankCore.newRankProfile(g);
      this.accounts.set(account.token, account); this.byId.set(account.id, account);
    }
    // الاسم ملك الحساب: جهاز جديد بالرمز نفسه يأخذ اسم الحساب ولا يفرض اسمه المحلي (setName هو الطريق الوحيد للتغيير)
    account.lastSeen = Date.now();
    // استئناف بعد انقطاع: الحساب نفسه يطلب معرّف اتصاله السابق فيبقى في غرفته بالهوية نفسها.
    // لا يُمنح إلا لصاحب الرمز، ولا يُنتزع من جلسة حيّة لحساب آخر.
    let peer = 'k' + randomBytes(8).toString('hex');
    if (found && typeof peerWant === 'string' && /^k[0-9a-f]{16}$/.test(peerWant)) {
      const held = this.sessions.get(peerWant);
      if (!held || held.account === account) {
        if (held) { this.sessions.delete(peerWant); this.gLeave(held, this.key(held)); this.accLeave(held); }
        peer = peerWant;
      }
    }
    const session: Session = { peer, account, presence: {}, send };
    this.sessions.set(peer, session);
    this.gJoin(session, IDLE); this.accJoin(session);
    send({ t: 'welcome', rid, token: account.token, id: account.id, name: account.name, peer,
      ranks: account.ranks, seasonId: RankCore.SEASON_ID, hasCloud: !!account.save });
    this.sendSelf(session);
    this.persist(account);
    return session;
  }
  drop(s: Session): void {
    if (!this.sessions.delete(s.peer)) return;
    const k = this.key(s);
    this.gLeave(s, k); this.accLeave(s);
    this.bcast(k);
  }
  setName(s: Session, name: unknown, rid?: string): void {
    const n = sanitizeName(name);
    if (!n) return s.send({ t: 'error', rid, code: 'bad_name' });
    s.account.name = n; this.persist(s.account);
    s.send({ t: 'nameSet', rid, name: n });
  }

  /* ── بريد الحساب: يُخزَّن مع الحساب ولا يُرسل لأحد — لا يظهر في الملفّات ولا لوائح المتصدّرين ── */
  setEmail(s: Session, email: unknown, rid?: string): void {
    const e = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (e.length < 5 || e.length > 120 || !MAIL_RE.test(e)) return s.send({ t: 'error', rid, code: 'bad_email' });
    s.account.email = e; this.persist(s.account);
    s.send({ t: 'emailSet', rid, email: e });
  }

  /* ── الحفظ السحابي: الخادم يحفظ ما يرسله الهاتف كما هو، لكنّ الرتب لا تُؤخذ منه أبدًا ── */
  saveCloud(s: Session, save: unknown, rid?: string): void {
    const sv = save as CloudSave;
    if (!sv || typeof sv !== 'object' || !sv.blob || typeof sv.blob !== 'object' || Array.isArray(sv.blob))
      return s.send({ t: 'error', rid, code: 'bad_save' });
    if (bytes(sv.blob) > MAX_SAVE_BYTES) return s.send({ t: 'error', rid, code: 'save_too_big' });
    const blob = { ...sv.blob } as Record<string, unknown>;
    delete blob.gameRanks; delete blob.ranked; delete blob.account;   // ملك الخادم — لا يُخزَّن ادّعاء عنها
    const t2 = Date.now();
    s.account.save = { t: typeof sv.t === 'number' ? sv.t : t2, blob };
    this.persist(s.account);
    s.send({ t: 'cloudSaved', rid, t2 });
  }
  loadCloud(s: Session, rid?: string): void {
    s.send({ t: 'cloud', rid, save: s.account.save, ranks: s.account.ranks });
  }
  /* ── الأصدقاء: طلب من طرف وقبول من الآخر؛ الهوية من الجلسة لا من العميل ── */
  private online(id: string): boolean { return this.byAcc.has(id); }
  private view(ids: string[]): FriendView[] {
    const out: FriendView[] = [];
    for (const id of ids) { const a = this.byId.get(id); if (a) out.push({ id: a.id, name: a.name, online: this.online(a.id) }); }
    return out;
  }
  private sendFriends(s: Session, rid?: string): void {
    const a = s.account;
    s.send({ t: 'friendList', rid, friends: this.view(a.friends), reqIn: this.view(a.reqIn), reqOut: this.view(a.reqOut) });
  }
  private pushFriends(id: string): void {
    const set = this.byAcc.get(id); if (!set) return;
    for (const ss of set) this.sendFriends(ss);
  }
  friends(s: Session, rid?: string): void { this.sendFriends(s, rid); }
  friendAdd(s: Session, id: unknown, rid?: string): void {
    const me = s.account;
    if (typeof id !== 'string' || !ID_RE.test(id)) return s.send({ t: 'error', rid, code: 'bad_id', message: 'معرّف غير صالح' });
    if (id === me.id) return s.send({ t: 'error', rid, code: 'self', message: 'هذا معرّفك أنت' });
    const other = this.byId.get(id);
    if (!other) return s.send({ t: 'error', rid, code: 'not_found', message: 'لا يوجد لاعب بهذا المعرّف' });
    if (me.friends.includes(id)) return this.sendFriends(s, rid);
    if (me.friends.length >= MAX_FRIENDS || other.friends.length >= MAX_FRIENDS)
      return s.send({ t: 'error', rid, code: 'full', message: 'قائمة الأصدقاء ممتلئة' });
    if (me.reqIn.includes(id)) {                              // طلبه سابق: القبول يتمّ الصداقة
      me.reqIn = me.reqIn.filter(x => x !== id); other.reqOut = other.reqOut.filter(x => x !== me.id);
      me.friends.push(id); other.friends.push(me.id);
    } else if (!me.reqOut.includes(id)) {
      me.reqOut.push(id);
      if (!other.reqIn.includes(me.id)) other.reqIn.push(me.id);
    }
    this.persist(me); this.persist(other);
    this.sendFriends(s, rid); this.pushFriends(id);
  }
  friendAccept(s: Session, id: unknown, rid?: string): void {
    const me = s.account;
    if (typeof id !== 'string' || !ID_RE.test(id)) return s.send({ t: 'error', rid, code: 'bad_id', message: 'معرّف غير صالح' });
    if (!me.reqIn.includes(id)) return s.send({ t: 'error', rid, code: 'no_req', message: 'لا يوجد طلب من هذا اللاعب' });
    const other = this.byId.get(id);
    me.reqIn = me.reqIn.filter(x => x !== id);
    if (other) {
      other.reqOut = other.reqOut.filter(x => x !== me.id);
      if (!me.friends.includes(id)) me.friends.push(id);
      if (!other.friends.includes(me.id)) other.friends.push(me.id);
    }
    this.persist(me); if (other) this.persist(other);
    this.sendFriends(s, rid); if (other) this.pushFriends(other.id);
  }
  friendRemove(s: Session, id: unknown, rid?: string): void {
    const me = s.account;
    if (typeof id !== 'string' || !ID_RE.test(id)) return s.send({ t: 'error', rid, code: 'bad_id', message: 'معرّف غير صالح' });
    me.friends = me.friends.filter(x => x !== id);
    me.reqIn = me.reqIn.filter(x => x !== id);
    me.reqOut = me.reqOut.filter(x => x !== id);
    const other = this.byId.get(id);
    if (other) {
      other.friends = other.friends.filter(x => x !== me.id);
      other.reqIn = other.reqIn.filter(x => x !== me.id);
      other.reqOut = other.reqOut.filter(x => x !== me.id);
    }
    this.persist(me); if (other) this.persist(other);
    this.sendFriends(s, rid); if (other) this.pushFriends(other.id);
  }

  profile(s: Session, id: unknown, rid?: string): void {
    const a = typeof id === 'string' && id ? this.byId.get(id) : s.account;
    if (!a) return s.send({ t: 'error', rid, code: 'no_such_player' });
    s.send({ t: 'profileView', rid, id: a.id, name: a.name, ranks: a.ranks });
  }

  /* ── النتائج: المصنّف يحتاج تقارير كل المشاركين ويتّفق فيها الفائز ── */
  submitResult(s: Session, report: unknown, rid?: string): void {
    const r = report as ResultReport;
    const def = r && RankCore.gameDef(String(r.gameId));
    if (!def) return s.send({ t: 'error', rid, code: 'bad_game' });
    const matchId = typeof r.matchId === 'string' ? r.matchId.slice(0, 64) : '';
    if (!matchId) return s.send({ t: 'error', rid, code: 'bad_match' });
    const mode = RankCore.MODES_ALL.includes(String(r.mode)) ? String(r.mode) : 'casual';
    const result = (r.result && typeof r.result === 'object') ? r.result : {};
    const me = s.account;
    const prof = me.ranks[def.id];

    if (!RankCore.grantsRP(mode)) {
      // إتقان فقط — الهاتف موثوق هنا لأنه لا نقاط ولا رتبة على المحكّ
      const out = RankCore.resolve(prof, { gameId: def.id, mode, matchId, result, opponents: [] });
      this.persist(me);
      return s.send({ t: 'result', rid, status: out.applied ? 'applied' : 'ignored', reason: out.reason, profile: prof, delta: out as any });
    }

    // مصنّف: من شارك؟ حسابات حقيقية، أنا بينها، ولا أقلّ من اثنين
    const parts = Array.isArray(r.participants) ? [...new Set(r.participants.map(String))].slice(0, 12).sort() : [];
    if (!parts.includes(me.id) || parts.length < 2 || parts.some(id => !this.byId.has(id)))
      return s.send({ t: 'error', rid, code: 'bad_participants' });
    if (prof.seen && prof.seen.includes(matchId))
      return s.send({ t: 'result', rid, status: 'ignored', reason: 'نتيجة مكرّرة', profile: prof, delta: null });

    let pend = this.pending.get(matchId);
    if (!pend) { pend = { gameId: def.id as GameId, mode, participants: parts, createdAt: Date.now(), reports: new Map() }; this.pending.set(matchId, pend); }
    else if (pend.participants.join() !== parts.join())
      return s.send({ t: 'error', rid, code: 'participants_mismatch' });
    if (pend.reports.has(me.id))
      return s.send({ t: 'result', rid, status: 'pending', reason: 'تقريرك مسجّل — بانتظار الباقين', profile: prof, delta: null });
    pend.reports.set(me.id, { matchId, gameId: def.id as GameId, mode: mode as any, result, participants: parts });

    if (pend.reports.size < pend.participants.length)
      return s.send({ t: 'result', rid, status: 'pending', reason: 'بانتظار تقارير بقيّة اللاعبين', profile: prof, delta: null });

    const ok = this.consistent(def.scoreModel, pend);
    this.pending.delete(matchId);
    const outcome = this.settle(pend, matchId, ok);
    const mine = outcome.get(me.id);
    s.send({ t: 'result', rid, status: ok ? 'applied' : 'disputed', reason: ok ? '' : 'تقارير اللاعبين متناقضة — لا نقاط',
      profile: me.ranks[def.id], delta: mine ?? null });
    for (const [id, delta] of outcome) {
      if (id === me.id) continue;
      const acc = this.byId.get(id)!;
      this.toAccount(id, { t: 'resultFinal', matchId, status: ok ? 'applied' : 'disputed', profile: acc.ranks[def.id], delta });
    }
  }
  /** الفائز واحد لا اثنان، والترتيب بلا تكرار — ما لا يتّسق لا يُحتسب */
  private consistent(model: string, pend: Pending): boolean {
    const reps = [...pend.reports.values()];
    if (model === 'winLoss') {
      const winners = reps.filter(r => !!(r.result as any).won).length;
      return winners >= 1 && winners < reps.length;
    }
    if (model === 'placement') {
      const n = reps.length;
      const places = reps.map(r => (r.result as any).place | 0);
      if (new Set(places).size !== n) return false;
      return places.every(p => p >= 1 && p <= n) && reps.every(r => ((r.result as any).total | 0) === n);
    }
    if (model === 'teamResult') {
      // فريقان: لا يفوز الجميع ولا يخسر الجميع
      const won = reps.filter(r => !!(r.result as any).teamWon).length;
      return won >= 1 && won < reps.length;
    }
    if (model === 'roundsAggregate') {
      const rounds = new Set(reps.map(r => (r.result as any).rounds | 0));
      return rounds.size === 1 && [...rounds][0] >= 1;
    }
    return false;
  }
  private settle(pend: Pending, matchId: string, ok: boolean): Map<string, Record<string, unknown> | null> {
    const out = new Map<string, Record<string, unknown> | null>();
    for (const id of pend.participants) {
      const acc = this.byId.get(id)!; const prof = acc.ranks[pend.gameId];
      if (!ok) {   // تُختم النتيجة كمرئيّة حتى لا يعاد تقديمها بعد التنقيح
        if (!prof.seen) prof.seen = [];
        if (!prof.seen.includes(matchId)) { prof.seen.push(matchId); if (prof.seen.length > 24) prof.seen.splice(0, prof.seen.length - 24); }
        out.set(id, null); continue;
      }
      const rep = pend.reports.get(id)!;
      // MMR الخصوم من هنا لا من الهاتف
      const opponents = pend.participants.filter(x => x !== id).map(x => ({ mmr: this.byId.get(x)!.ranks[pend.gameId].mmr }));
      const delta = RankCore.resolve(prof, { gameId: pend.gameId, mode: pend.mode, matchId, result: rep.result, opponents });
      out.set(id, delta as any);
      this.persist(acc);
    }
    return out;
  }
  private sweepPending(): void {
    const now = Date.now();
    for (const [matchId, pend] of this.pending) {
      if (now - pend.createdAt < RESULT_WAIT_MS) continue;
      this.pending.delete(matchId);
      // انتهت المهلة بلا تقارير الجميع: لا نقاط لأحد، وتُختم حتى لا تعود
      for (const id of pend.participants) {
        const acc = this.byId.get(id); if (!acc) continue;
        const prof = acc.ranks[pend.gameId];
        if (!prof.seen) prof.seen = [];
        if (!prof.seen.includes(matchId)) prof.seen.push(matchId);
        if (pend.reports.has(id)) this.toAccount(id, { t: 'resultFinal', matchId, status: 'incomplete', profile: prof, delta: null });
        this.persist(acc);
      }
    }
  }
  pendingCount(): number { return this.pending.size; }

  /* ── لوحة الصدارة: من الخادم، مرتّبة بالرتبة ثم الدرجة ثم النقاط ── */
  leaderboard(s: Session, gameId: unknown, limit: unknown, rid?: string): void {
    const g = RankCore.gameDef(String(gameId));
    if (!g) return s.send({ t: 'error', rid, code: 'bad_game' });
    const n = Math.max(1, Math.min(100, (limit as number) | 0 || 50));
    const rows = [...this.byId.values()]
      .map(a => ({ a, p: a.ranks[g.id], sc: RankCore.score(a.ranks[g.id]) }))
      .filter(x => x.p.gamesPlayed > 0)
      .sort((x, y) => y.sc - x.sc || y.p.mmr - x.p.mmr || x.a.createdAt - y.a.createdAt);
    const row = (x: { a: Account; p: RankProfile }): LeaderRow => ({ id: x.a.id, name: x.a.name, tier: x.p.tier, div: x.p.div, rp: x.p.rp, wins: x.p.wins, losses: x.p.losses, placed: x.p.placed });
    const meIx = rows.findIndex(x => x.a === s.account);
    s.send({ t: 'leaderboard', rid, gameId: g.id as GameId, rows: rows.slice(0, n).map(row), total: rows.length,
      me: meIx >= 0 ? { rank: meIx + 1, row: row(rows[meIx]) } : null });
  }

  /* ── الغرف: تتابع حضور وبثّ — نفس دلالة غرفة الأرتيفاكت (الكلّ يسمع الكلّ، والمرسل يسمع نفسه) ── */
  presence(s: Session, patch: unknown): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return;
    const next = { ...s.presence };
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      if (v === null || v === undefined) delete next[k]; else next[k] = v;
    }
    if (bytes(next) > MAX_PRESENCE_BYTES) return s.send({ t: 'error', code: 'presence_too_big' });
    const before = this.key(s);
    s.presence = next;
    const after = this.key(s);
    if (before !== after) { this.gLeave(s, before); this.gJoin(s, after); this.bcast(before); }
    if (after === IDLE) this.sendSelf(s); else this.bcast(after);
  }
  emit(s: Session, topic: unknown, data: unknown): void {
    if (typeof topic !== 'string' || !TOPIC_RE.test(topic)) return s.send({ t: 'error', code: 'bad_topic' });
    if (bytes(data) > MAX_EMIT_BYTES) return s.send({ t: 'error', code: 'msg_too_big' });
    const m: ServerMsg = { t: 'msg', topic, data, from: { peer: s.peer, by: s.account.id } };
    // البثّ لا يغادر الغرفة، وكلفته بحجم الغرفة لا بعدد المتصلين.
    // الخامل لا يبثّ لأحد: لا معنى لأن يسمع كلُّ من ليس في غرفة كلَّ من ليس في غرفة.
    const k = this.key(s);
    if (k === IDLE) return s.send(m);
    const set = this.groups.get(k); if (!set) return s.send(m);
    for (const x of set) x.send(m);
  }
  /** أقران جلسة واحدة: أهل مجموعتها وحدهم */
  peersOf(s: Session): PeerView[] {
    const set = this.groups.get(this.key(s));
    if (!set) return [this.pv(s)];
    const out: PeerView[] = [];
    for (const x of set) { if (out.length >= MAX_PEER_LIST) break; out.push(this.pv(x)); }
    return out;
  }
  private toAccount(id: string, m: ServerMsg): void {
    const set = this.byAcc.get(id); if (!set) return;
    for (const x of set) x.send(m);
  }

  /** دلو رموز لكل جلسة ونوع: الرشقة مسموحة، والإغراق ممنوع */
  private allow(s: Session, t: string): boolean {
    const [burst, per] = RATE[t] ?? RATE_ANY;
    const now = Date.now();
    const b = (s.rl ??= {});
    const e = b[t] ?? (b[t] = { n: burst, t: now });
    e.n = Math.min(burst, e.n + ((now - e.t) / 1000) * per);
    e.t = now;
    if (e.n < 1) return false;
    e.n -= 1;
    return true;
  }

  /* ── توجيه الرسائل ── */
  handle(s: Session, msg: ClientMsg): void {
    if (!this.allow(s, msg.t)) return s.send({ t: 'error', rid: (msg as any).rid, code: 'rate_limited' });
    switch (msg.t) {
      case 'setName': return this.setName(s, msg.name, msg.rid);
      case 'setEmail': return this.setEmail(s, msg.email, msg.rid);
      case 'saveCloud': return this.saveCloud(s, msg.save, msg.rid);
      case 'loadCloud': return this.loadCloud(s, msg.rid);
      case 'submitResult': return this.submitResult(s, msg.report, msg.rid);
      case 'leaderboard': return this.leaderboard(s, msg.gameId, msg.limit, msg.rid);
      case 'profile': return this.profile(s, msg.id, msg.rid);
      case 'purchase': { void this.purchase(s, msg.claim, msg.rid); return; }
      case 'purchases': return this.purchaseList(s, msg.rid);
      case 'friends': return this.friends(s, msg.rid);
      case 'friendAdd': return this.friendAdd(s, msg.id, msg.rid);
      case 'friendAccept': return this.friendAccept(s, msg.id, msg.rid);
      case 'friendRemove': return this.friendRemove(s, msg.id, msg.rid);
      case 'presence': return this.presence(s, msg.patch);
      case 'emit': return this.emit(s, msg.topic, msg.data);
      default: return s.send({ t: 'error', rid: (msg as any).rid, code: 'unknown' });
    }
  }
  stats() { return { accounts: this.byId.size, online: this.sessions.size, pending: this.pending.size, purchases: this.purchases.size, iap: iapStatus() }; }

  /* ── الشراء: الإيصال يُتحقّق منه عند المتجر، والمنحة من الكتالوج، والإيصال يُستهلك مرّة واحدة ── */
  async purchase(s: Session, claim: unknown, rid?: string): Promise<void> {
    const c = claim as PurchaseClaim;
    if (!c || typeof c !== 'object' || !PLATFORMS.has(c.platform) || typeof c.productId !== 'string' || typeof c.receipt !== 'string'
        || !c.receipt || c.receipt.length > MAX_RECEIPT_BYTES || (c.transactionId != null && typeof c.transactionId !== 'string'))
      return s.send({ t: 'error', rid, code: 'bad_claim' });
    const product = CATALOG.get(c.productId);
    if (!product) return s.send({ t: 'error', rid, code: 'unknown_product' });
    const v = await verifyReceipt(c.platform, c.productId, c.receipt, c.transactionId);
    if (!v.ok) return s.send({ t: 'error', rid, code: v.code, message: v.detail });
    const prev = this.purchases.get(v.txId);
    if (prev) {
      if (prev.accountId !== s.account.id) return s.send({ t: 'error', rid, code: 'already_used' });
      return s.send({ t: 'purchased', rid, productId: prev.productId, txId: prev.txId, grant: prev.grant, duplicate: true });
    }
    const grant = CATALOG.grantOf(product)!;
    const rec: PurchaseRec = { txId: v.txId, platform: c.platform, productId: c.productId, accountId: s.account.id, at: Date.now(), grant };
    this.purchases.set(v.txId, rec); this.persistBuy(rec);
    s.send({ t: 'purchased', rid, productId: rec.productId, txId: rec.txId, grant, duplicate: false });
  }
  purchaseList(s: Session, rid?: string): void {
    const list = [...this.purchases.values()].filter(r => r.accountId === s.account.id);
    s.send({ t: 'purchaseList', rid, list });
  }
}
