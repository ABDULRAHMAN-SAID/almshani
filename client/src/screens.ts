// شاشات اللعبة: محتوى التبويبات (القاعدة/الجنود/التحدي/المتجر/المزيد)
// + تدفق المعركة (طابور، مواجهة، نتيجة). كل الأفعال تُرسل للخادم — لا حقيقة محلية.
import { UNIT_DEFS, UNIT_IDS, ECONOMY } from '../../shared/definitions/index';
import type { MatchInfo } from '../../shared/protocol/src/messages';
import type { MatchResult } from '../../shared/simulation/src/index';
import { t, unitName, unitMark } from './i18n';

export interface Profile { name: string; deck: string[]; wins: number; losses: number; }

export interface Actions {
  queue: () => void;
  cancelQueue: () => void;
  saveDeck: (deck: string[]) => void;
  rename: (n: string) => void;
  upgradeBuilding: (id: string) => void;
  trainUnit: (id: string) => void;
  claimMission: (id: string) => void;
  freeChest: () => void;
  collectBuilding: (id: string) => void;
  openBuilding: (id: string) => void;
}

const root = () => document.getElementById('screens')!;
export function clearScreens(): void { root().innerHTML = ''; }

function screen(html: string, cls = 'screen'): HTMLElement {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  root().innerHTML = '';
  root().appendChild(el);
  return el;
}

export function showConnecting(): void {
  screen(`<h1>${t('title')}<small>${t('slice')}</small></h1><div class="sub">${t('connecting')}</div>`);
}

// ═══ تبويب القاعدة: المشهد خلفه؛ هنا لافتات فقط ═══
export function showBaseOverlay(base: any, on: Actions): void {
  const missions = base?.missions ?? [];
  const doneCount = missions.filter((m: any) => m.claimed).length;
  const el = screen(`
    <div class="banner">
      <div class="chip" id="c-missions">${t('missions')} <b>${doneCount}/${missions.length}</b></div>
      ${base?.upgrading ? `<div class="chip">🔨 ${t('base_busy_banner')}</div>` : ''}
    </div>`, 'baseoverlay');
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.querySelectorAll('.chip').forEach(c => ((c as HTMLElement).style.pointerEvents = 'auto'));
  el.querySelector('#c-missions')?.addEventListener('click', () => showMissionsSheet(base, on));
}

// لوحة مبنى (تنبثق من الأسفل)
export function showBuildingSheet(base: any, id: string, on: Actions): void {
  closeSheet();
  const b = base.buildings[id];
  if (!b) return;
  const lvl = b.level;
  const locked = lvl <= 0;
  const upgrading = base.upgrading?.id === id;
  const hallOk = base.hall >= b.unlockHall;
  const lines: string[] = [];
  if (b.role === 'prod' && lvl > 0) {
    lines.push(`${t('producing')}: <b>${b.prodPerHour}</b>${t('perHour')}`);
    lines.push(`${t('pending')}: <b>${b.pending}</b> / ${b.bufferCap}`);
  }
  if (b.role === 'cap') lines.push(`${t('capacity')}: <b>${base.caps.gold}</b>`);
  if (b.role === 'gate') lines.push(`${t('battle_reward')}: +${lvl * 10}%`);
  if (!hallOk) lines.push(`${t('needHall')} <b>${b.unlockHall}</b>`);
  const next = b.next;
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.id = 'bsheet';
  sheet.innerHTML = `
    <button class="x">✕</button>
    <h3>${t('b.' + id)}</h3>
    <div class="lvl">${locked ? t('locked') : `${t('level')} ${lvl} / ${b.maxLevel}`}</div>
    <div class="info">${lines.join('<br>') || '&nbsp;'}</div>
    ${next ? `<div class="costrow">
        <div class="pill"><span class="ic gold"></span>${next.gold}</div>
        <div class="pill"><span class="ic supplies"></span>${next.supplies}</div>
        <div class="pill">⏱ ${next.sec}s</div>
      </div>` : ''}
    ${b.role === 'prod' && lvl > 0 ? `<button class="btn" id="b-collect" ${b.pending < 1 ? 'disabled' : ''} style="margin-inline-end:8px">${t('collect')} ${b.pending}</button>` : ''}
    <button class="btn" id="b-up" ${(!next || upgrading || !hallOk) ? 'disabled' : ''}>
      ${upgrading ? t('upgrading') : !next ? t('maxed') : locked ? t('build') : t('upgrade')}
    </button>`;
  document.getElementById('app')!.appendChild(sheet);
  sheet.querySelector('.x')!.addEventListener('click', closeSheet);
  sheet.querySelector('#b-up')?.addEventListener('click', () => { on.upgradeBuilding(id); closeSheet(); });
  sheet.querySelector('#b-collect')?.addEventListener('click', () => { on.collectBuilding(id); closeSheet(); });
}

export function showMissionsSheet(base: any, on: Actions): void {
  closeSheet();
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.id = 'bsheet';
  sheet.innerHTML = `
    <button class="x">✕</button>
    <h3>${t('missions')}</h3>
    <div style="max-height:46vh;overflow-y:auto;margin-top:10px">${missionRows(base)}</div>`;
  document.getElementById('app')!.appendChild(sheet);
  sheet.querySelector('.x')!.addEventListener('click', closeSheet);
  wireMissionRows(sheet, base, on);
}

export function closeSheet(): void {
  document.getElementById('bsheet')?.remove();
}

function missionRows(base: any): string {
  return (base?.missions ?? []).map((m: any) => {
    const rew = Object.entries(m.reward).map(([k, v]) => `${v} ${t('res.' + k)}`).join(' · ');
    const claimable = !m.claimed && m.needsMet && (!m.auto || m.progress >= m.goal);
    return `<div class="mrow" data-m="${m.id}">
      <div class="mi">
        <div class="mn">${t(m.nameKey)}</div>
        <div class="mr">${rew}</div>
        ${m.auto ? `<div class="mp">${Math.min(m.progress, m.goal)}/${m.goal}</div>` : ''}
        ${m.needs && !m.needsMet ? `<div class="mr">${t('needHall')}؟ — ${t('b.' + m.needs)}</div>` : ''}
      </div>
      ${m.openUrl && m.needsMet && !m.claimed ? `<button class="btn ghost mopen" data-url="${m.openUrl}">${t('open_it')}</button>` : ''}
      <button class="btn ghost mclaim" ${claimable ? '' : 'disabled'}>${m.claimed ? t('claimed') : t('claim')}</button>
    </div>`;
  }).join('');
}

function wireMissionRows(el: HTMLElement, _base: any, on: Actions): void {
  el.querySelectorAll('.mopen').forEach(b => b.addEventListener('click', () =>
    window.open((b as HTMLElement).dataset.url!, '_blank')));
  el.querySelectorAll('.mclaim').forEach(b => b.addEventListener('click', () => {
    const id = (b.closest('.mrow') as HTMLElement).dataset.m!;
    on.claimMission(id);
    closeSheet();
  }));
}

// ═══ تبويب الجنود ═══
let deckEditing = false;
let deckDraft: string[] = [];

export function showUnits(profile: Profile, base: any, on: Actions): void {
  const unlocked: string[] = base?.unlocked ?? UNIT_IDS;
  const levels: Record<string, number> = base?.unitLevels ?? {};
  const barracks = base?.buildings?.barracks?.level ?? 1;
  if (!deckEditing) deckDraft = profile.deck.slice();

  const cards = UNIT_IDS.map(id => {
    const u = UNIT_DEFS[id];
    const isUnlocked = unlocked.includes(id);
    const lvl = levels[id] ?? 1;
    const maxLvl = (ECONOMY as any).levels.maxLevel;
    const nextCost = lvl < maxLvl ? (ECONOMY as any).upgrade[String(lvl + 1)] : null;
    const gated = lvl + 1 > barracks;
    const inDeck = deckDraft.includes(id);
    return `<div class="ucard ${isUnlocked ? '' : 'locked'} ${deckEditing && inDeck ? 'sel' : ''}" data-id="${id}">
      <div class="cost">${u.costCP}</div>
      <div class="lvlb">م${lvl}</div>
      <div class="med">${unitMark(id)}</div>
      <div class="nm">${unitName(id)}</div>
      <div class="meta">${t('role_' + u.role)} · ${u.squadSize} ${t('members')}</div>
      <div class="meta">${t('range')} ${u.member.range <= 1.5 ? t('melee') : u.member.range + 'م'} · ${t('dps')} ${Math.round(u.member.dps * u.squadSize)} · ${t('speed')} ${u.member.moveSpeed}</div>
      <div class="style">${t('style_' + id)}</div>
      ${!isUnlocked ? `<div class="req">${t('locked')}</div>` : deckEditing ? '' : nextCost
        ? `<button class="tr" data-train="${id}" ${gated ? 'disabled' : ''}>
             ${gated ? `${t('needBarracks')} ${lvl + 1}` : `${t('train')} — ${nextCost.gold}ذ ${nextCost.tokens + nextCost.roleTokens}ر`}
           </button>`
        : `<div class="req">${t('maxed')}</div>`}
    </div>`;
  }).join('');

  const el = screen(`
    <div class="tabwrap">
      <h2>${t('tab_units')}</h2>
      <div class="sub" style="text-align:start;margin-bottom:8px">${t('deck_current')} ${deckEditing ? `— ${deckDraft.length}/8` : ''}</div>
      <div class="deckstrip">${(deckEditing ? deckDraft : profile.deck).map(id => `<div class="mini" title="${unitName(id)}">${unitMark(id)}</div>`).join('')}</div>
      <div class="row" style="margin-bottom:14px">
        <button class="btn ghost" id="b-deck">${deckEditing ? t('deck_save') : t('deck_edit')}</button>
        ${deckEditing ? `<button class="btn ghost" id="b-deck-cancel">${t('cancel')}</button>` : ''}
      </div>
      <div class="army-grid" style="max-height:none">${cards}</div>
    </div>`, 'tabscreen');

  el.querySelector('#b-deck')!.addEventListener('click', () => {
    if (!deckEditing) { deckEditing = true; deckDraft = profile.deck.slice(); showUnits(profile, base, on); }
    else if (deckDraft.length === 8) { deckEditing = false; on.saveDeck(deckDraft.slice()); }
  });
  el.querySelector('#b-deck-cancel')?.addEventListener('click', () => {
    deckEditing = false;
    showUnits(profile, base, on);
  });
  el.querySelectorAll('.ucard').forEach(c => c.addEventListener('click', ev => {
    if (!deckEditing) return;
    if ((ev.target as HTMLElement).closest('.tr')) return;
    const id = (c as HTMLElement).dataset.id!;
    if (!unlocked.includes(id)) return;
    const ix = deckDraft.indexOf(id);
    if (ix >= 0) deckDraft.splice(ix, 1);
    else if (deckDraft.length < 8) deckDraft.push(id);
    showUnits(profile, base, on);
  }));
  el.querySelectorAll('[data-train]').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    on.trainUnit((b as HTMLElement).dataset.train!);
  }));
}

export function unitsResetEditing(): void { deckEditing = false; }

// ═══ تبويب التحدي ═══
export function showBattleTab(profile: Profile, queued: boolean, on: Actions): void {
  const el = screen(`
    <div class="tabwrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <h1 style="font-family:var(--font-head);font-size:30px">${t('tab_battle')}</h1>
      <div class="stats" style="margin:14px 0"><span>${t('wins')}: <b>${profile.wins}</b></span><span>${t('losses')}: <b>${profile.losses}</b></span></div>
      ${queued
        ? `<div class="sub">${t('queueing')}</div><div class="sub">${t('queueHint')}</div>
           <button class="btn ghost" id="b-cancel" style="margin-top:14px">${t('cancel')}</button>`
        : `<button class="btn primary" id="b-battle">${t('battle')}</button>
           <div class="sub" style="margin-top:12px">${t('queueHint')}</div>`}
    </div>`, 'tabscreen');
  el.querySelector('#b-battle')?.addEventListener('click', on.queue);
  el.querySelector('#b-cancel')?.addEventListener('click', on.cancelQueue);
}

// ═══ تبويب المتجر ═══
export function showShop(base: any, on: Actions): void {
  const ready = base && Date.now() >= base.freeChestReadyAt;
  const leftS = base ? Math.max(0, Math.ceil((base.freeChestReadyAt - Date.now()) / 1000)) : 0;
  const el = screen(`
    <div class="tabwrap">
      <h2>${t('tab_shop')}</h2>
      <div class="shopcard">
        <div class="t">${t('freeChest')}</div>
        <div class="d">${ready ? t('chest_ready') : `${t('chest_in')} ${Math.floor(leftS / 3600)}:${String(Math.floor((leftS % 3600) / 60)).padStart(2, '0')}:${String(leftS % 60).padStart(2, '0')}`}</div>
        <button class="btn" id="b-chest" ${ready ? '' : 'disabled'}>${t('open_it')}</button>
      </div>
      <div class="shopcard"><div class="t">${t('soon')}</div><div class="d">${t('shop_note')}</div></div>
    </div>`, 'tabscreen');
  el.querySelector('#b-chest')?.addEventListener('click', on.freeChest);
}

// ═══ تبويب المزيد ═══
export function showMore(profile: Profile, base: any, on: Actions): void {
  const el = screen(`
    <div class="tabwrap">
      <h2>${t('profile')}</h2>
      <input class="name" id="pname" maxlength="20" value="${profile.name}" style="margin-bottom:10px">
      <div class="stats" style="margin-bottom:20px"><span>${t('wins')}: <b>${profile.wins}</b></span><span>${t('losses')}: <b>${profile.losses}</b></span></div>
      <h2>${t('missions')}</h2>
      <div id="mlist">${missionRows(base)}</div>
      <div class="shopcard" style="margin-top:14px">
        <div class="t">${t('valley')}</div>
        <div class="d">${t('valley_note')}</div>
        <button class="btn ghost" id="b-valley">${t('valley_open')}</button>
      </div>
    </div>`, 'tabscreen');
  const nameEl = el.querySelector('#pname') as HTMLInputElement;
  nameEl.addEventListener('change', () => on.rename(nameEl.value));
  wireMissionRows(el, base, on);
  el.querySelector('#b-valley')!.addEventListener('click', () => window.open('/legacy/', '_blank'));
}

// ═══ تدفق المعركة (كما في الشريحة، فوق كل شيء) ═══
export function showMatchup(info: MatchInfo): void {
  const side = (i: number, cls: string) => {
    const pl = info.players[i];
    return `<div class="side ${cls}">
      <div class="who">${pl.name}${pl.isBot ? ` <span class="botmark">${t('bot')}</span>` : ''}</div>
      <div class="deckline">${info.decks[i].map(unitName).join(' · ')}</div>
    </div>`;
  };
  screen(`
    <h1>${t('vsIntro')}</h1>
    <div class="vs">${side(info.youAre, '')}<div class="x">×</div>${side(1 - info.youAre, 'foe')}</div>
    <div class="sub">${t('deployHere')}</div>`);
}

export function showResult(
  youAre: 0 | 1, result: MatchResult, scoreMilli: [number, number], hqHpCenti: [number, number],
  wins: number, losses: number, reward: { gold: number; tokens: number } | undefined,
  on: { again: () => void; camp: () => void }
): void {
  const mineWon = result.winner === youAre;
  const cls = result.winner === -1 ? 'draw' : mineWon ? 'win' : 'lose';
  const verdict = result.winner === -1 ? t('draw') : mineWon ? t('win') : t('lose');
  const why = (!mineWon && result.reason === 'surrender') ? t('myReason_surrender') : t('reason_' + result.reason);
  const el = screen(`
    <div class="plate">
      <div class="verdict ${cls}">${verdict}</div>
      <div class="why">${why}</div>
      <div class="nums">
        <div>${t('score')}<b>${(scoreMilli[youAre] / 1000).toFixed(1)} : ${(scoreMilli[1 - youAre] / 1000).toFixed(1)}</b></div>
        <div>${t('hqLeft')}<b>${Math.max(0, Math.ceil(hqHpCenti[youAre] / 100))}</b></div>
        ${reward ? `<div>${t('battle_reward')}<b>${reward.gold}ذ +${reward.tokens}ر</b></div>` : ''}
      </div>
      <div class="row">
        <button class="btn" id="b-again">${t('again')}</button>
        <button class="btn ghost" id="b-camp">${t('camp')}</button>
      </div>
    </div>`);
  el.querySelector('#b-again')!.addEventListener('click', on.again);
  el.querySelector('#b-camp')!.addEventListener('click', on.camp);
}
