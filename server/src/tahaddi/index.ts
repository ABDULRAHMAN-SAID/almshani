// مدخل خادم تحدّي: HTTP يقدّم اللعبة نفسها (tahaddi/) + WebSocket على /ws للحسابات والغرف والنتائج.
//   PORT (افتراضي 8090) · TAHADDI_DIR (افتراضي ./tahaddi) · TAHADDI_DATA_FILE (افتراضي .data/tahaddi.json)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { TahaddiService, type Session } from './service';
import type { ClientMsg, ServerMsg } from './protocol';

const PORT = parseInt(process.env.PORT ?? '8090', 10);
const DIR = process.env.TAHADDI_DIR ?? join(process.cwd(), 'tahaddi');
const svc = new TahaddiService();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

const http = createServer((req, res) => {
  let path = (req.url ?? '/').split('?')[0];
  if (path === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, ...svc.stats() })); return; }
  if (path === '/') path = '/index.html';
  const file = normalize(join(DIR, path));
  if (!file.startsWith(DIR) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
});

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 512 * 1024 });
wss.on('connection', (ws: WebSocket) => {
  let session: Session | null = null;
  const send = (m: ServerMsg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
  ws.on('message', raw => {
    let msg: ClientMsg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'hello') {
      if (session) svc.drop(session);
      session = svc.hello(send, msg.token, msg.name, msg.rid); return;
    }
    if (!session) return send({ t: 'error', rid: (msg as any).rid, code: 'no_hello' });
    svc.handle(session, msg);
  });
  ws.on('close', () => { if (session) svc.drop(session); });
  ws.on('error', () => { /* الإغلاق يتكفّل */ });
});

http.listen(PORT, () => console.log(`تحدّي على http://localhost:${PORT} — الملفّات من ${DIR}`));
const bye = () => { svc.close(); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
