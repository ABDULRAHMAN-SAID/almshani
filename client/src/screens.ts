// شاشات ما حول المعركة: المعسكر، الجيش، الطابور، المواجهة، النتيجة.
import { UNIT_DEFS, UNIT_IDS } from '../../shared/definitions/index';
import type { MatchInfo } from '../../shared/protocol/src/messages';
import type { MatchResult } from '../../shared/simulation/src/index';
import { t, unitName, unitMark } from './i18n';

export interface Profile { name: string; deck: string[]; wins: number; losses: number; }

const root = () => document.getElementById('screens')!;

export function clearScreens(): void { root().innerHTML = ''; }

function screen(html: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = html;
  root().innerHTML = '';
  root().appendChild(el);
  return el;
}

export function showConnecting(): void {
  screen(`<h1>${t('title')}<small>${t('slice')}</small></h1><div class="sub">${t('connecting')}</div>`);
}

export function showWarcamp(
  p: Profile, connected: boolean,
  on: { battle: () => void; army: () => void; rename: (n: string) => void }
): void {
  const el = screen(`
    <h1>${t('title')}<small>${t('slice')}</small></h1>
    <input class="name" id="pname" maxlength="20" value="${p.name}" aria-label="${t('namePrompt')}">
    <div class="stats"><span>${t('wins')}: <b>${p.wins}</b></span><span>${t('losses')}: <b>${p.losses}</b></span></div>
    <button class="btn primary" id="b-battle">${t('battle')}</button>
    <button class="btn" id="b-army">${t('army')}</button>
    <div class="notice ${connected ? '' : 'conn-bad'}" id="connst">${connected ? '' : t('connLost')}</div>`);
  el.querySelector('#b-battle')!.addEventListener('click', on.battle);
  el.querySelector('#b-army')!.addEventListener('click', on.army);
  const nameEl = el.querySelector('#pname') as HTMLInputElement;
  nameEl.addEventListener('change', () => on.rename(nameEl.value));
}

export function showArmy(
  p: Profile, on: { save: (deck: string[]) => void; back: () => void }
): void {
  const sel = new Set(p.deck);
  const cards = UNIT_IDS.map(id => {
    const u = UNIT_DEFS[id];
    return `<div class="ucard" data-id="${id}">
      <div class="cost">${u.costCP}</div>
      <div class="med">${unitMark(id)}</div>
      <div class="nm">${unitName(id)}</div>
      <div class="meta">${t('role_' + u.role)} · ${u.squadSize} ${t('members')}</div>
    </div>`;
  }).join('');
  const el = screen(`
    <h1>${t('army')}<small id="pick">${t('pickSeven')}</small></h1>
    <div class="army-grid">${cards}</div>
    <div class="row">
      <button class="btn" id="b-save">${t('saveDeck')}</button>
      <button class="btn ghost" id="b-back">${t('back')}</button>
    </div>`);
  const paint = () => {
    el.querySelectorAll('.ucard').forEach(c => {
      c.classList.toggle('sel', sel.has((c as HTMLElement).dataset.id!));
    });
    (el.querySelector('#pick') as HTMLElement).textContent = `${t('pickSeven')} — ${sel.size}/7`;
    (el.querySelector('#b-save') as HTMLButtonElement).disabled = sel.size !== 7;
  };
  el.querySelectorAll('.ucard').forEach(c => c.addEventListener('click', () => {
    const id = (c as HTMLElement).dataset.id!;
    if (sel.has(id)) sel.delete(id);
    else if (sel.size < 7) sel.add(id);
    paint();
  }));
  el.querySelector('#b-save')!.addEventListener('click', () => on.save([...sel]));
  el.querySelector('#b-back')!.addEventListener('click', on.back);
  paint();
}

export function showQueue(on: { cancel: () => void }): void {
  const el = screen(`
    <h1>${t('queueing')}</h1>
    <div class="sub">${t('queueHint')}</div>
    <button class="btn ghost" id="b-cancel">${t('cancel')}</button>`);
  el.querySelector('#b-cancel')!.addEventListener('click', on.cancel);
}

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
    <div class="sub">${unitName('arena.border_fort.name') === 'arena.border_fort.name' ? '' : ''}${t('deployHere')}</div>`);
}

export function showResult(
  youAre: 0 | 1, result: MatchResult, scoreMilli: [number, number], hqHpCenti: [number, number],
  wins: number, losses: number,
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
        <div>${t('record')}<b>${wins} / ${losses}</b></div>
      </div>
      <div class="row">
        <button class="btn" id="b-again">${t('again')}</button>
        <button class="btn ghost" id="b-camp">${t('camp')}</button>
      </div>
    </div>`);
  el.querySelector('#b-again')!.addEventListener('click', on.again);
  el.querySelector('#b-camp')!.addEventListener('click', on.camp);
}
