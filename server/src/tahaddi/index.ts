// مدخل خادم تحدّي: HTTP يقدّم اللعبة نفسها (tahaddi/) + WebSocket على /ws للحسابات والغرف والنتائج.
//   PORT (افتراضي 8090) · HOST (افتراضي 0.0.0.0) · TAHADDI_DIR (افتراضي ./tahaddi) · TAHADDI_DATA_FILE (افتراضي .data/tahaddi.json)
//   TAHADDI_ORIGINS: أصول مسموح لها بفتح WebSocket مفصولة بفواصل (فارغ = الكل). تطبيقات المتجر ترسل
//   capacitor://localhost (iOS) و https://localhost (Android)؛ أضفها إن قيّدت الأصول.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { TahaddiService, type Session } from './service';
import type { ClientMsg, ServerMsg } from './protocol';
import { aiChat, aiStatus, aiAllow } from './ai';

const PORT = parseInt(process.env.PORT ?? '8090', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const DIR = process.env.TAHADDI_DIR ?? join(process.cwd(), 'tahaddi');
const ORIGINS = (process.env.TAHADDI_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
/** الأصل مسموح؟ قائمة فارغة = الكل؛ الطلبات بلا Origin (أدوات، تطبيقات أصلية) تمرّ. */
function originOk(origin: string | undefined): boolean {
  if (!ORIGINS.length || !origin) return true;
  return ORIGINS.includes('*') || ORIGINS.includes(origin.replace(/\/+$/, ''));
}
const svc = new TahaddiService();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

const http = createServer((req, res) => {
  let path = (req.url ?? '/').split('?')[0];
  if (path === '/health') {
    // العميل قد يكون على مضيف آخر (GitHub Pages، تطبيق متجر) — فيسأل عبر CORS
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, ...svc.stats() })); return;
  }
  // الذكاء الاصطناعي لآليي «ضدّ الكمبيوتر»: موجّه نصّي → JSON. المفتاح على الخادم فقط.
  if (path === '/ai/status') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    res.end(JSON.stringify(aiStatus())); return;
  }
  if (path === '/ai/chat') {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    if (req.method !== 'POST') { res.writeHead(405, cors); res.end(); return; }
    if (!aiStatus().on) { res.writeHead(503, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify({ off: true })); return; }
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    if (!aiAllow(ip)) { res.writeHead(429, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'rate_limited' })); return; }
    let body = '';
    req.on('data', (c: Buffer) => { body += c; if (body.length > 96_000) req.destroy(); });
    req.on('end', async () => {
      let prompt: unknown;
      try { prompt = (JSON.parse(body) as { prompt?: unknown }).prompt; } catch { prompt = null; }
      if (typeof prompt !== 'string' || !prompt.trim()) { res.writeHead(400, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'bad_prompt' })); return; }
      try {
        const out = await aiChat(prompt.slice(0, 60_000));
        res.writeHead(200, { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(502, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'ai_failed' }));
      }
    });
    return;
  }
  if (path === '/') path = '/index.html';
  const file = normalize(join(DIR, path));
  if (!file.startsWith(DIR) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
});

const wss = new WebSocketServer({
  server: http, path: '/ws', maxPayload: 512 * 1024,
  verifyClient: (info, cb) => { const ok = originOk(info.origin); cb(ok, ok ? 200 : 403, ok ? undefined : 'origin not allowed'); }
});
// نبض حياة: هاتف نام أو شبكة سقطت بصمت — نطرد الاتصال الميت فلا يبقى «متصلًا» في غرفته
const alive = new WeakMap<WebSocket, boolean>();
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) { try { ws.terminate(); } catch { /* أُغلق */ } continue; }
    alive.set(ws, false);
    try { ws.ping(); } catch { /* أُغلق */ }
  }
}, 25000);
(heartbeat as any).unref?.();
wss.on('connection', (ws: WebSocket) => {
  let session: Session | null = null;
  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));
  const send = (m: ServerMsg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
  ws.on('message', raw => {
    let msg: ClientMsg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'hello') {
      if (session) svc.drop(session);
      session = svc.hello(send, msg.token, msg.name, msg.rid, (msg as any).peer); return;
    }
    if (!session) return send({ t: 'error', rid: (msg as any).rid, code: 'no_hello' });
    svc.handle(session, msg);
  });
  ws.on('close', () => { if (session) svc.drop(session); });
  ws.on('error', () => { /* الإغلاق يتكفّل */ });
});

http.listen(PORT, HOST, () => console.log(`تحدّي على http://${HOST}:${PORT} — الملفّات من ${DIR}${ORIGINS.length ? ` — الأصول: ${ORIGINS.join(' ')}` : ''}`));
const bye = () => { svc.close(); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
