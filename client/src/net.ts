// عميل الشبكة — WebSocket بإعادة اتصال تلقائية؛ الرمز يُحفظ محلياً.
// (استثناء شريحة تطوير: الإنتاج يستبدل هذا بحسابات سحابية — ONLINE_ARCHITECTURE §4)
import type { ClientMsg, ServerMsg } from '../../shared/protocol/src/messages';

export type NetHandler = (msg: ServerMsg) => void;

export class Net {
  private ws: WebSocket | null = null;
  private handlers = new Set<NetHandler>();
  private retryMs = 500;
  connected = false;
  onConnChange: ((up: boolean) => void) | null = null;
  pendingName: string | null = null;

  connect(): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => {
      this.connected = true;
      this.retryMs = 500;
      this.onConnChange?.(true);
      let token: string | undefined;
      try { token = localStorage.getItem('qh2_token') ?? undefined; } catch { /* خاص */ }
      this.send({ t: 'hello', token, name: this.pendingName ?? undefined });
    };
    this.ws.onmessage = ev => {
      let msg: ServerMsg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'welcome') {
        try { localStorage.setItem('qh2_token', msg.token); } catch { /* خاص */ }
      }
      for (const h of this.handlers) h(msg);
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.onConnChange?.(false);
      setTimeout(() => this.connect(), this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, 5000);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  on(h: NetHandler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
}
