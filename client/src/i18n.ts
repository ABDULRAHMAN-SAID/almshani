// نصوص الواجهة — عربية أولاً (RTL) مع بنية جاهزة للإنجليزية.
// أسماء الوحدات/الساحة من shared/definitions/locales (مفاتيح مشتركة مع الخادم).
import { LOCALES } from '../../shared/definitions/index';

const UI_AR: Record<string, string> = {
  title: 'قائد الحشود',
  slice: 'الشريحة العمودية — نسخة تطوير',
  battle: 'قــتــال',
  army: 'جيشي',
  namePrompt: 'اسمك في الميدان',
  enter: 'ادخل المعسكر',
  record: 'السجل',
  wins: 'انتصارات',
  losses: 'هزائم',
  queueing: 'بحث عن خصم…',
  queueHint: 'إن طال الانتظار ستُواجه بوت تدريب — البوت يُعلن دائماً.',
  cancel: 'إلغاء',
  saveDeck: 'اعتماد التشكيلة',
  pickSeven: 'اختر 7 فرق لجيشك',
  back: 'رجوع',
  bot: 'بوت',
  vsIntro: 'مواجهة',
  win: 'نــصــر',
  lose: 'هزيمة',
  draw: 'تعادل',
  again: 'جولة أخرى',
  camp: 'المعسكر',
  score: 'النقاط',
  hqLeft: 'صحة مقرّك',
  reason_hq: 'سقط المقر',
  reason_score: 'حسم النقاط',
  reason_overtime_margin: 'حسم الوقت الإضافي',
  reason_hq_damage: 'الأكثر ضرراً للمقر',
  reason_draw: 'تعادل تام',
  reason_surrender: 'انسحاب الخصم',
  reason_timeout_forfeit: 'انقطاع الخصم',
  myReason_surrender: 'انسحبت',
  overtime: 'وقت إضافي!',
  decisive: 'مرحلة الحسم — السقف 12',
  forwardOpen: 'فُتح النشر المتقدم',
  skill: 'وابل\nالمملكة',
  surrender: 'انسحاب',
  connecting: 'اتصال بالخادم…',
  connLost: 'انقطع الاتصال — إعادة محاولة…',
  oppLost: 'انقطع خصمك — ننتظر عودته',
  oppBack: 'عاد خصمك',
  deployHere: 'اسحب فرقة إلى الميدان',
  role_frontline: 'صدام', role_ranged: 'رمي', role_cavalry: 'فرسان',
  role_support: 'إسناد', role_siege: 'حصار', role_special: 'خاصة',
  members: 'أفراد', cost: 'كلفة'
};

let lang: 'ar' | 'en' = 'ar';

export function t(key: string): string {
  return UI_AR[key] ?? LOCALES[lang][key] ?? key;
}

export function unitName(id: string): string {
  return LOCALES[lang][`unit.${id}.name`] ?? id;
}

// حرفان مميزان لشارة الوحدة (Medallion) — نص لا إيموجي.
// نأخذ الكلمة الأخيرة (الأكثر تمييزاً في الأسماء العربية) بلا «ال» التعريف.
export function unitMark(id: string): string {
  const words = unitName(id).trim().split(/\s+/);
  const w = (words[words.length - 1] ?? '').replace(/^ال/, '');
  return w.slice(0, 2) || unitName(id).slice(0, 2);
}
