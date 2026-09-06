// التحقّق من إيصالات الشراء — الخادم يسأل المتجر نفسه، ولا يصدّق الهاتف.
//   APPLE_SHARED_SECRET          سرّ App Store المشترك (App Store Connect → App Information → App-Specific Shared Secret)
//   GOOGLE_SERVICE_ACCOUNT_JSON  مسار ملفّ حساب الخدمة أو محتواه JSON (Play Console → API access)
//   ANDROID_PACKAGE              معرّف الحزمة (افتراضي com.almshani.tahaddi)
//   TAHADDI_IAP_TEST_SECRET      محقّق اختبار: الإيصال = HMAC-SHA256(productId.transactionId) — للاختبارات فقط، لا تضبطه في الإنتاج
// بلا متغيّر لمنصّة ما، يُرفض شراؤها بـ iap_unavailable — لا منح على الثقة أبدًا.
import { createHmac, createSign, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export type Platform = 'ios' | 'android' | 'test';
export type Verified = { ok: true; txId: string } | { ok: false; code: string; detail?: string };

// حارس صريح: التعليق نيّة، والشرط ضمانة. لا محقّق اختباريّ في الإنتاج مهما ضُبطت البيئة.
const TEST_SECRET = (() => {
  const v = process.env.TAHADDI_IAP_TEST_SECRET ?? '';
  if (v && process.env.NODE_ENV === 'production') {
    console.error('tahaddi/iap: TAHADDI_IAP_TEST_SECRET مضبوط في الإنتاج — تجاهُله. احذفه من بيئة الخادم.');
    return '';
  }
  return v;
})();
const APPLE_SECRET = process.env.APPLE_SHARED_SECRET ?? '';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.almshani.tahaddi';
const IOS_BUNDLE = process.env.IOS_BUNDLE_ID ?? 'com.almshani.tahaddi';
const FETCH_MS = 15000;   // المتجر لا يجيب؟ لا نعلّق الطلب إلى الأبد
const GOOGLE_SA = loadServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }
function loadServiceAccount(v: string | undefined): ServiceAccount | null {
  if (!v) return null;
  try {
    const raw = v.trim().startsWith('{') ? v : (existsSync(v) ? readFileSync(v, 'utf8') : '');
    if (!raw) return null;
    const j = JSON.parse(raw);
    return (j && typeof j.client_email === 'string' && typeof j.private_key === 'string') ? j : null;
  } catch { return null; }
}

export function iapStatus() { return { test: !!TEST_SECRET, ios: !!APPLE_SECRET, android: !!GOOGLE_SA, androidPackage: ANDROID_PACKAGE, iosBundle: IOS_BUNDLE }; }

/** إيصال الاختبار كما يبنيه محقّق الاختبار — تستعمله الاختبارات لتوليد إيصالات صالحة */
export function testReceipt(productId: string, txId: string, secret = TEST_SECRET): string {
  return createHmac('sha256', secret).update(productId + '.' + txId).digest('hex');
}

export async function verify(platform: Platform, productId: string, receipt: string, txHint?: string): Promise<Verified> {
  try {
    if (platform === 'test') return verifyTest(productId, receipt, txHint);
    if (platform === 'ios') return await verifyApple(productId, receipt, txHint);
    if (platform === 'android') return await verifyGoogle(productId, receipt);
    return { ok: false, code: 'bad_claim', detail: 'platform' };
  } catch (e) {
    return { ok: false, code: 'verify_failed', detail: (e as Error).message };
  }
}

function verifyTest(productId: string, receipt: string, txHint?: string): Verified {
  if (!TEST_SECRET) return { ok: false, code: 'iap_unavailable' };
  if (!txHint) return { ok: false, code: 'bad_claim', detail: 'transactionId' };
  const want = Buffer.from(testReceipt(productId, txHint), 'utf8');
  const got = Buffer.from(String(receipt), 'utf8');
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, code: 'verify_failed', detail: 'hmac' };
  return { ok: true, txId: 'test:' + txHint };
}

/* ── App Store: verifyReceipt (الإنتاج ثم الساندبوكس عند 21007) ── */
async function verifyApple(productId: string, receipt: string, txHint?: string): Promise<Verified> {
  if (!APPLE_SECRET) return { ok: false, code: 'iap_unavailable' };
  const body = JSON.stringify({ 'receipt-data': receipt, password: APPLE_SECRET, 'exclude-old-transactions': false });
  let j = await postJSON('https://buy.itunes.apple.com/verifyReceipt', body);
  if (j?.status === 21007) j = await postJSON('https://sandbox.itunes.apple.com/verifyReceipt', body);
  if (!j || j.status !== 0) return { ok: false, code: 'verify_failed', detail: 'apple status ' + (j?.status ?? '?') };
  const bundle = j.receipt?.bundle_id;
  if (typeof bundle === 'string' && bundle && bundle !== IOS_BUNDLE) return { ok: false, code: 'verify_failed', detail: 'bundle ' + bundle };
  const items: any[] = ([] as any[]).concat(j.latest_receipt_info ?? [], j.receipt?.in_app ?? []);
  const mine = items.filter(x => x && x.product_id === productId && typeof x.transaction_id === 'string');
  if (!mine.length) return { ok: false, code: 'verify_failed', detail: 'product not in receipt' };
  const pick = (txHint && mine.find(x => x.transaction_id === txHint))
    ?? mine.sort((a, b) => (+b.purchase_date_ms || 0) - (+a.purchase_date_ms || 0))[0];
  if (pick.cancellation_date_ms) return { ok: false, code: 'verify_failed', detail: 'refunded' };
  return { ok: true, txId: 'ios:' + pick.transaction_id };
}

/* ── Google Play: purchases.products.get ثم acknowledge ── */
let googleToken: { value: string; exp: number } | null = null;
async function googleAccessToken(): Promise<string> {
  const sa = GOOGLE_SA!;
  const now = Math.floor(Date.now() / 1000);
  if (googleToken && googleToken.exp - 60 > now) return googleToken.value;
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  });
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const res = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(FETCH_MS),
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + sig
  });
  const j: any = await res.json();
  if (!j?.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 120));
  googleToken = { value: j.access_token, exp: now + (+j.expires_in || 3600) };
  return googleToken.value;
}
async function verifyGoogle(productId: string, purchaseToken: string): Promise<Verified> {
  if (!GOOGLE_SA) return { ok: false, code: 'iap_unavailable' };
  const token = await googleAccessToken();
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(ANDROID_PACKAGE)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(base, { headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) return { ok: false, code: 'verify_failed', detail: 'google ' + res.status };
  const j: any = await res.json();
  if (j.purchaseState !== 0) return { ok: false, code: 'verify_failed', detail: 'purchaseState ' + j.purchaseState };
  if (j.acknowledgementState === 0) {
    await fetch(base + ':acknowledge', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(FETCH_MS) }).catch(() => {});
  }
  const id = typeof j.orderId === 'string' && j.orderId ? j.orderId : createHmac('sha256', 'tahaddi').update(purchaseToken).digest('hex').slice(0, 32);
  return { ok: true, txId: 'android:' + id };
}

async function postJSON(url: string, body: string): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(FETCH_MS) });
  return res.json();
}
