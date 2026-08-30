// مدخل العميل — قشرة الإمبراطورية: تبويبات فوق مشهد القاعدة، وتدفق المعركة فوق الكل.
import type { ServerMsg } from '../../shared/protocol/src/messages';
import { Net } from './net';
import { MatchClient } from './battle/game';
import { BattleRender } from './battle/render';
import { BattleHud } from './battle/hud';
import { BattleInput } from './battle/input';
import { PaintedBase } from './base/painted';
import { Shell, type TabId } from './shell';
import * as scr from './screens';
import { t } from './i18n';

const glBattle = document.getElementById('gl') as HTMLCanvasElement;
const glBase = document.getElementById('glbase') as HTMLCanvasElement;
const net = new Net();
const shell = new Shell();

let profile: scr.Profile = { name: '', deck: [], wins: 0, losses: 0 };
let base: any = null;
let queued = false;
let mc: MatchClient | null = null;
let render: BattleRender | null = null;
let hud: BattleHud | null = null;
let input: BattleInput | null = null;
let baseScene: PaintedBase | null = null;
let mode: 'boot' | 'tabs' | 'matchup' | 'battle' | 'result' = 'boot';
let lastEnd: Extract<ServerMsg, { t: 'matchEnd' }> | null = null;
let upgradeTimer = 0;

const actions: scr.Actions = {
  queue: () => net.send({ t: 'queue' }),
  cancelQueue: () => net.send({ t: 'cancelQueue' }),
  saveDeck: deck => net.send({ t: 'setDeck', deck }),
  rename: n => {
    let token: string | undefined;
    try { token = localStorage.getItem('qh2_token') ?? undefined; } catch { /* خاص */ }
    net.send({ t: 'hello', token, name: n });
  },
  upgradeBuilding: id => net.send({ t: 'upgradeBuilding', id }),
  trainUnit: id => net.send({ t: 'trainUnit', id }),
  claimMission: id => net.send({ t: 'claimMission', id }),
  freeChest: () => net.send({ t: 'freeChest' }),
  collectBuilding: id => net.send({ t: 'collectBuilding', id }),
  openBuilding: id => scr.showBuildingSheet(base, id, actions)
};

function goTabs(tab?: TabId): void {
  teardownBattle();
  mode = 'tabs';
  if (tab) shell.setActive(tab);
  shell.show(true);
  renderTab();
}

function renderTab(): void {
  if (mode !== 'tabs') return;
  scr.closeSheet();
  const tab = shell.active;
  const baseVisible = tab === 'base';
  glBase.hidden = true; // القاعدة الآن لوحة المالك التفاعلية لا مشهداً ثلاثي الأبعاد
  document.getElementById('baselabels')!.style.display = 'none';
  if (baseVisible) {
    if (!baseScene) baseScene = new PaintedBase(document.getElementById('app')!, id => scr.showBuildingSheet(base, id, actions));
    baseScene.show(true);
    baseScene.setState(base);
    baseScene.resize();
    scr.showBaseOverlay(base, actions);
  } else {
    baseScene?.show(false);
    if (tab === 'units') scr.showUnits(profile, base, actions);
    else if (tab === 'battle') scr.showBattleTab(profile, queued, actions);
    else if (tab === 'shop') scr.showShop(base, actions);
    else if (tab === 'more') scr.showMore(profile, base, actions);
  }
}

shell.onTab = id => { shell.setActive(id); renderTab(); };

function scheduleUpgradeRefresh(): void {
  clearTimeout(upgradeTimer);
  if (base?.upgrading) {
    const delay = Math.max(300, base.upgrading.doneAt - Date.now() + 400);
    upgradeTimer = setTimeout(() => net.send({ t: 'base' }), delay) as unknown as number;
  }
}

function startBattle(info: Extract<ServerMsg, { t: 'matchStart' }>['info'], log?: { tick: number; commands: any[] }[], tickNow?: number): void {
  teardownBattle();
  destroyBaseScene();
  shell.show(false);
  scr.closeSheet();
  mc = new MatchClient(info, net);
  if (log && tickNow !== undefined) mc.fastForward(log, tickNow);
  mode = 'matchup';
  scr.showMatchup(info);
  setTimeout(() => {
    if (mode !== 'matchup' || !mc) return;
    mode = 'battle';
    scr.clearScreens();
    glBattle.style.display = 'block';
    render = new BattleRender(glBattle, mc);
    hud = new BattleHud(mc, render);
    input = new BattleInput(mc, render, net, glBattle);
    hud.onSlotDrag = (slot, ev) => input!.startSlotDrag(slot, ev);
    hud.onSkill = () => { input!.armSkill(); hud!.toast(t('deployHere')); };
    hud.onFlag = () => { input!.armFlag(); hud!.toast(t('flag_hint')); };
    hud.onSurrender = () => net.send({ t: 'intent', cmd: { type: 'surrender', player: mc!.you } });
    mc.onEvents = evs => hud?.handleEvents(evs);
  }, log ? 300 : 2500);
}

function teardownBattle(): void {
  hud?.dispose(); hud = null;
  render?.dispose(); render = null;
  input = null;
  mc = null;
  glBattle.style.display = 'none';
}

function destroyBaseScene(): void {
  baseScene?.dispose();
  baseScene = null;
  glBase.hidden = true;
  document.getElementById('baselabels')!.style.display = 'none';
}

net.on((msg: ServerMsg) => {
  switch (msg.t) {
    case 'welcome':
      profile = { name: msg.name, deck: msg.deck, wins: msg.wins, losses: msg.losses };
      if (mode === 'boot' || mode === 'tabs') goTabs(mode === 'boot' ? 'base' : undefined);
      break;
    case 'baseState':
      base = msg.base;
      shell.updateResources(base);
      baseScene?.setState(base);
      scheduleUpgradeRefresh();
      if (mode === 'tabs' && shell.active !== 'base') renderTab();
      else if (mode === 'tabs') scr.showBaseOverlay(base, actions);
      break;
    case 'baseError':
      shell.flashError(msg.code);
      break;
    case 'deckSaved':
      profile.deck = msg.deck;
      scr.unitsResetEditing();
      if (mode === 'tabs' && shell.active === 'units') renderTab();
      break;
    case 'queued':
      queued = true;
      if (mode === 'tabs') { shell.setActive('battle'); renderTab(); }
      break;
    case 'queueCancelled':
      queued = false;
      if (mode === 'tabs') renderTab();
      break;
    case 'matchStart':
      queued = false;
      startBattle(msg.info);
      break;
    case 'rejoinState':
      queued = false;
      startBattle(msg.info, msg.log, msg.tickNow);
      break;
    case 'ticks':
      mc?.pushTicks(msg.inputs);
      break;
    case 'matchEnd': {
      lastEnd = msg;
      profile.wins = msg.wins; profile.losses = msg.losses;
      const you = mc?.you ?? 0;
      setTimeout(() => {
        teardownBattle();
        mode = 'result';
        scr.showResult(you, msg.result, msg.scoreMilli, msg.hqHpCenti, msg.wins, msg.losses, msg.reward, {
          again: () => { net.send({ t: 'leaveResult' }); net.send({ t: 'queue' }); goTabs('battle'); },
          camp: () => { net.send({ t: 'leaveResult' }); net.send({ t: 'base' }); goTabs('base'); }
        });
        net.send({ t: 'base' }); // الغنيمة تظهر في الموارد فوراً
      }, 900);
      break;
    }
    case 'opponentConnection':
      hud?.toast(msg.connected ? t('oppBack') : t('oppLost'));
      break;
    case 'desync':
      console.warn('DESYNC at tick', msg.tick);
      break;
    case 'error':
      shell.flashError(msg.code);
      break;
  }
});

net.onConnChange = up => {
  if (!up && mode === 'tabs') { /* الومضة تكفي؛ إعادة الاتصال تلقائية */ }
};

function frame(): void {
  const now = performance.now();
  if (mc && mode === 'battle') {
    mc.update(now);
    render?.sync(now);
    hud?.update();
  } else if (mode === 'tabs' && shell.active === 'base' && baseScene) {
    baseScene.sync(now);
  }
  requestAnimationFrame(frame);
}

scr.showConnecting();
glBattle.style.display = 'none';
net.connect();
requestAnimationFrame(frame);
// التحصيل كسول على الخادم — تحديث دوري يُبقي شريط الموارد حياً خارج المعارك
setInterval(() => {
  if (mode === 'tabs' && net.connected) net.send({ t: 'base' });
}, 5000);

// ── خطاف اختبارات E2E (تطوير فقط) ──
(window as any).__VS = {
  get mode() { return mode === 'tabs' ? `tab:${shell.active}` : mode; },
  get profile() { return profile; },
  get base() { return base; },
  get st() { return mc?.st ?? null; },
  get you() { return mc?.you ?? null; },
  get lastEnd() { return lastEnd; },
  tab: (id: TabId) => { shell.setActive(id); renderTab(); },
  queue: () => net.send({ t: 'queue' }),
  deploy: (slot: number, x: number, z: number) =>
    net.send({ t: 'intent', cmd: { type: 'deploy', player: mc!.you, slot, x, z } }),
  surrender: () => net.send({ t: 'intent', cmd: { type: 'surrender', player: mc!.you } }),
  upgrade: (id: string) => net.send({ t: 'upgradeBuilding', id }),
  train: (id: string) => net.send({ t: 'trainUnit', id }),
  claim: (id: string) => net.send({ t: 'claimMission', id }),
  chest: () => net.send({ t: 'freeChest' }),
  collect: (id: string) => net.send({ t: 'collectBuilding', id }),
  fetchBase: () => net.send({ t: 'base' })
};
