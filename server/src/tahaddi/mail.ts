/**
 * إرسال رمز التحقّق بالبريد — طبقة رقيقة فوق أيّ مزوّد يقبل POST بـ JSON.
 *
 * لا مفتاح في الكود ولا في المستودع. الإعداد من متغيّرات البيئة وحدها:
 *   TAHADDI_MAIL_URL    عنوان المزوّد (Resend: https://api.resend.com/emails)
 *   TAHADDI_MAIL_KEY    المفتاح — يُرسل في ترويسة Authorization: Bearer
 *   TAHADDI_MAIL_FROM   المرسِل (مثال: تحدّي <no-reply@نطاقك>)
 *   TAHADDI_MAIL_DEV=1  للتطوير وحده: يطبع الرمز في سجلّ الخادم بدل إرساله
 *
 * بلا إعداد لا يُرسل شيء ولا يُعاد الرمز إلى العميل أبدًا — الرمز في الردّ
 * يعني أنّ أيّ أحد يستولي على أيّ حساب بمعرفة بريده وحده.
 */
const URL_ = process.env.TAHADDI_MAIL_URL ?? '';
const KEY = process.env.TAHADDI_MAIL_KEY ?? '';
const FROM = process.env.TAHADDI_MAIL_FROM ?? '';
const DEV = process.env.TAHADDI_MAIL_DEV === '1';

export function mailReady(): boolean { return !!(URL_ && KEY && FROM) || DEV; }
export function mailMode(): 'live' | 'dev' | 'off' {
  if (URL_ && KEY && FROM) return 'live';
  return DEV ? 'dev' : 'off';
}

const body = (code: string) =>
  `رمز الدخول إلى تحدّي: ${code}\n\nصالح عشر دقائق، ولمرّة واحدة.\nإن لم تطلبه فتجاهل هذه الرسالة — لم يتغيّر شيء في حسابك.`;

/** يعيد true إن سُلّم الرمز لطريق إرسال حقيقي (أو طُبع في وضع التطوير) */
export async function sendCode(to: string, code: string): Promise<boolean> {
  if (mailMode() === 'dev') {
    console.log(`tahaddi/mail[dev]: رمز ${to} هو ${code}`);
    return true;
  }
  if (mailMode() === 'off') return false;
  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ from: FROM, to: [to], subject: 'رمز الدخول إلى تحدّي', text: body(code) }),
      signal: AbortSignal.timeout(9000)
    });
    if (!r.ok) { console.error('tahaddi/mail: رفض المزوّد', r.status); return false; }
    return true;
  } catch (e) {
    console.error('tahaddi/mail: تعذّر الإرسال', (e as Error)?.message);
    return false;
  }
}
