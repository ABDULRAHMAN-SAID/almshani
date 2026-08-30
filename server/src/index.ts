// مدخل الخادم: HTTP (ملفات العميل) + WebSocket (الردهة والمباريات) على منفذ واحد.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { UNIT_DEFS, ARENAS, COMMANDERS } from '../../shared/definitions/index';
import { buildUnits, buildArena } from '../../shared/simulation/src/index';
import type { ClientMsg } from '../../shared/protocol/src/messages';
import { Lobby, type Session } from './lobby';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const CLIENT_DIR = process.env.CLIENT_DIR ?? join(process.cwd(), 'client', 'dist');

const ctx = {
  units: buildUnits(UNIT_DEFS),
  arena: buildArena(ARENAS.border_fort, COMMANDERS.sera)
};
const lobby = new Lobby(ctx);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const LEGACY_DIR = process.env.LEGACY_DIR ?? join(process.cwd(), 'legacy-prototype');

const http = createServer((req, res) => {
  let path = (req.url ?? '/').split('?')[0];
  // النموذج الأولي (مهمة وادي الحشود اليومية) يُقدَّم من /legacy/
  let root = CLIENT_DIR;
  if (path === '/legacy' || path.startsWith('/legacy/')) {
    root = LEGACY_DIR;
    path = path.replace(/^\/legacy\/?/, '/');
  }
  if (path === '/') path = '/index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

const wss = new WebSocketServer({ server: http, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  let session: Session | null = null;
  const send = (msg: unknown) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  ws.on('message', raw => {
    let msg: ClientMsg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'hello') { session = lobby.hello(send, msg.token, msg.name); return; }
    if (!session) return send({ t: 'error', code: 'no_hello' });
    switch (msg.t) {
      case 'setDeck': lobby.setDeck(session, msg.deck); break;
      case 'queue': lobby.enqueue(session); break;
      case 'cancelQueue': lobby.cancelQueue(session); break;
      case 'intent': if (msg.cmd && typeof msg.cmd.type === 'string') lobby.intent(session, msg.cmd); break;
      case 'hashReport': lobby.hashReport(session, msg.tick | 0, msg.hash >>> 0); break;
      case 'leaveResult': lobby.leaveResult(session); break;
      case 'base': lobby.sendBase(session); break;
      case 'upgradeBuilding': lobby.upgradeBuilding(session, msg.id); break;
      case 'trainUnit': lobby.trainUnit(session, msg.id); break;
      case 'claimMission': lobby.claimMission(session, msg.id); break;
      case 'freeChest': lobby.freeChest(session); break;
      case 'collectBuilding': lobby.collect(session, msg.id); break;
    }
  });
  ws.on('close', () => { if (session) lobby.drop(session); });
  ws.on('error', () => { /* الإغلاق يتكفّل */ });
});

http.listen(PORT, () => {
  console.log(`قائد الحشود — خادم الشريحة العمودية على http://localhost:${PORT} (ws: /ws)`);
  console.log(`عميل من: ${CLIENT_DIR}`);
});

process.on('SIGINT', () => { lobby.shutdown(); process.exit(0); });
