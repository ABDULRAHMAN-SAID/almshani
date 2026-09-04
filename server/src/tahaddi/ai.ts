// الذكاء الاصطناعي لآليي «ضدّ الكمبيوتر»: العميل يرسل موجّهًا نصّيًا واحدًا (حالة اللعبة والسجلّ والمطلوب)
// ويستلم JSON. المفتاح لا يغادر الخادم أبدًا: ANTHROPIC_API_KEY يُضبط بـ `fly secrets set` (لا في الشيفرة).
//   ANTHROPIC_API_KEY   مفتاح واجهة Anthropic (بدونه يعود /ai/chat بالحالة 503 فيعمل العقل المحلي في العميل)
//   TAHADDI_AI_MODEL    النموذج (افتراضي claude-opus-5) · TAHADDI_AI_RPM حدّ الطلبات لكل عنوان في الدقيقة (افتراضي 40)
//   TAHADDI_AI_EFFORT   عمق التفكير low/medium/high/xhigh/max (افتراضي high — الآليون يفكّرون قبل كل جواب)
import Anthropic from '@anthropic-ai/sdk';

const KEY = process.env.ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.TAHADDI_AI_MODEL ?? 'claude-opus-5';
const RPM = parseInt(process.env.TAHADDI_AI_RPM ?? '40', 10);
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = typeof EFFORTS[number];
const EFFORT: Effort = (EFFORTS as readonly string[]).includes(process.env.TAHADDI_AI_EFFORT ?? '') ? process.env.TAHADDI_AI_EFFORT as Effort : 'high';
const client = KEY ? new Anthropic({ apiKey: KEY, maxRetries: 1, timeout: 120_000 }) : null;

/** تعليمات ثابتة (تُخزَّن مؤقّتًا): مدير لعبة عربي يحرّك شخصيات آلية ويعيد JSON فقط */
const SYSTEM = [
  'أنت مدير لعبة محترف ولاعب خبير في ألعاب الخداع الاجتماعي العربية (مافيا، برا السالفة)، تحرّك عدّة شخصيات آلية في وقت واحد.',
  'اقرأ حالة اللعبة والوقائع والسجلّ كاملًا، وفكّر كلاعب محترف قبل كل جملة: ما الذي يعرفه هذا الآليّ فعلًا؟ من ينتفع ممّا حدث؟ ما الذي يخدم فريقه الآن؟',
  'افهم ما كتبه اللاعب البشري بدقّة بلهجته ومزاحه وأخطائه (اتهام، دفاع، سؤال، اعتراف، سخرية، ادّعاء دور)، وردّ على كلماته نفسها لا بكلام عام.',
  'اجعل كل شخصية متّسقة مع دورها السرّي وشخصيتها وذاكرتها، بلهجة خليجية طبيعية وجمل متفاوتة الطول، دون تكرار جمل سابقة ودون عبارات جاهزة.',
  'لا تكشف ما لا تعرفه الشخصية. التزم بدليل اللعبة المرفق في الطلب. أعد JSON صالحًا فقط بالشكل المطلوب، بلا أي نصّ خارجه.'
].join(' ');

export function aiStatus() { return { on: !!client, model: client ? MODEL : null, effort: client ? EFFORT : null }; }

const buckets = new Map<string, { n: number; t: number }>();
/** حدّ بسيط لكل عنوان: RPM طلبًا في الدقيقة */
export function aiAllow(ip: string): boolean {
  const now = Date.now(); const b = buckets.get(ip);
  if (!b || now - b.t > 60_000) { buckets.set(ip, { n: 1, t: now }); return true; }
  if (b.n >= RPM) return false;
  b.n++; return true;
}

/** يقرأ JSON بتسامح: النصّ كلّه، أو ما بين أوّل { أو [ وآخر } أو ] */
export function parseJson(text: string): unknown {
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* نحاول القصّ */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* يلي */ } }
  const a = Math.min(...[t.indexOf('{'), t.indexOf('[')].filter(i => i >= 0));
  const b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (Number.isFinite(a) && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* فشل */ } }
  return null;
}

export async function aiChat(prompt: string): Promise<{ json: unknown; text: string }> {
  if (!client) throw new Error('ai_off');
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },       // يفكّر قبل الجواب بقدر ما يحتاج (Claude Opus 5)
    output_config: { effort: EFFORT },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }]
  });
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
  return { json: parseJson(text), text };
}
