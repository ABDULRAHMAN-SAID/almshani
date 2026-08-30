// مدخل العميل — توجيه الشاشات وربط الشبكة بالمعركة.
import type { ServerMsg } from '../../shared/protocol/src/messages';
import { Net } from './net';
import { MatchClient } from './battle/game';
import { BattleRender } from './battle/render';
import { BattleHud } from './battle/hud';
import { BattleInput } from './battle/input';
import * as scr from './screens';
import { t } from './i18n';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const net = new Net();

let profile: scr.Profile = { name: '', deck: [], wins: 0, losses: 0 };
let mc: MatchClient | null = null;
let render: BattleRender | null = null;
let hud: BattleHud | null = null;
let input: BattleInput | null = null;
let mode: 'boot' | 'camp' | 'army' | 'queue' | 'matchup' | 'battle' | 'result' = 'boot';
let lastEnd: Extract<ServerMsg, { t: 'matchEnd' }> | null = null;

function goCamp(): void {
  teardownBattle();
  mode = 'camp';
  canvas.style.display = 'none';
  scr.showWarcamp(profile, net.connected, {
    battle: () => { net.send({ t: 'queue' }); },
    army: goArmy,
    rename: n => {
      let token: string | undefined;
      try { token = localStorage.getItem('qh2_token') ?? undefined; } catch { /* خاص */ }
      net.send({ t: 'hello', token, name: n });
    }
  });
}

function goArmy(): void {
  mode = 'army';
  scr.showArmy(profile, {
    save: deck => net.send({ t: 'setDeck', deck }),
    back: goCamp
  });
}

function startBattle(info: Extract<ServerMsg, { t: 'matchStart' }>['info'], log?: { tick: number; commands: any[] }[], tickNow?: number): void {
  teardownBattle();
  mc = new MatchClient(info, net);
  if (log && tickNow !== undefined) mc.fastForward(log, tickNow);
  mode = 'matchup';
  scr.showMatchup(info);
  setTimeout(() => {
    if (mode !== 'matchup' || !mc) return;
    mode = 'battle';
    scr.clearScreens();
    canvas.style.display = 'block';
    render = new BattleRender(canvas, mc);
    hud = new BattleHud(mc, render);
    input = new BattleInput(mc, render, net, canvas);
    hud.onSlotDrag = (slot, ev) => input!.startSlotDrag(slot, ev);
    hud.onSkill = () => { input!.armSkill(); hud!.toast(t('deployHere')); };
    hud.onSurrender = () => net.send({ t: 'intent', cmd: { type: 'surrender', player: mc!.you } });
    mc.onEvents = evs => hud?.handleEvents(evs);
  }, log ? 300 : 2500);
}

function teardownBattle(): void {
  hud?.dispose(); hud = null;
  render?.dispose(); render = null;
  input = null;
  mc = null;
  canvas.style.display = 'none';
}

net.on((msg: ServerMsg) => {
  switch (msg.t) {
    case 'welcome':
      profile = { name: msg.name, deck: msg.deck, wins: msg.wins, losses: msg.losses };
      if (mode === 'boot' || mode === 'camp') goCamp();
      break;
    case 'deckSaved':
      profile.deck = msg.deck;
      goCamp();
      break;
    case 'queued':
      mode = 'queue';
      scr.showQueue({ cancel: () => net.send({ t: 'cancelQueue' }) });
      break;
    case 'queueCancelled':
      if (mode === 'queue') goCamp();
      break;
    case 'matchStart':
      startBattle(msg.info);
      break;
    case 'rejoinState':
      startBattle(msg.info, msg.log, msg.tickNow);
      break;
    case 'ticks':
      mc?.pushTicks(msg.inputs);
      break;
    case 'matchEnd': {
      lastEnd = msg;
      profile.wins = msg.wins; profile.losses = msg.losses;
      const you = mc?.you ?? 0;
      // أمهل آخر التكّات أن تُعرض ثم أظهر النتيجة
      setTimeout(() => {
        teardownBattle();
        mode = 'result';
        scr.showResult(you, msg.result, msg.scoreMilli, msg.hqHpCenti, msg.wins, msg.losses, {
          again: () => { net.send({ t: 'leaveResult' }); net.send({ t: 'queue' }); },
          camp: () => { net.send({ t: 'leaveResult' }); goCamp(); }
        });
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
      console.warn('server error:', msg.code);
      break;
  }
});

net.onConnChange = up => {
  const el = document.getElementById('connst');
  if (el) { el.textContent = up ? '' : t('connLost'); el.className = `notice ${up ? '' : 'conn-bad'}`; }
};

function frame(): void {
  const now = performance.now();
  if (mc && mode === 'battle') {
    mc.update(now);
    render?.sync(now);
    hud?.update();
  }
  requestAnimationFrame(frame);
}

scr.showConnecting();
canvas.style.display = 'none';
net.connect();
requestAnimationFrame(frame);

// ── خطاف اختبارات E2E (بيئة تطوير فقط — لا يمس الخادم الحاكم) ──
(window as any).__VS = {
  get mode() { return mode; },
  get profile() { return profile; },
  get st() { return mc?.st ?? null; },
  get you() { return mc?.you ?? null; },
  get lastEnd() { return lastEnd; },
  queue: () => net.send({ t: 'queue' }),
  deploy: (slot: number, x: number, z: number) =>
    net.send({ t: 'intent', cmd: { type: 'deploy', player: mc!.you, slot, x, z } }),
  skill: (x: number, z: number) =>
    net.send({ t: 'intent', cmd: { type: 'skill', player: mc!.you, x, z } }),
  surrender: () => net.send({ t: 'intent', cmd: { type: 'surrender', player: mc!.you } })
};
