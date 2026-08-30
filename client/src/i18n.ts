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
  pickSeven: 'اختر 8 فرق لجيشك',
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
  members: 'أفراد', cost: 'كلفة',
  // ── قلب الإمبراطورية ──
  tab_base: 'القاعدة', tab_units: 'الجنود', tab_battle: 'التحدي',
  tab_shop: 'المتجر', tab_more: 'المزيد',
  level: 'مستوى', upgrade: 'ترقية', build: 'بناء', maxed: 'الحد الأقصى',
  perHour: '/ساعة', capacity: 'السعة', producing: 'الإنتاج',
  upgrading: 'ترقية جارية…', done_in: 'يكتمل خلال',
  needHall: 'يتطلب قاعة القيادة مستوى', needBarracks: 'يتطلب الثكنة مستوى',
  err_busy: 'ترقية أخرى جارية', err_poor: 'موارد غير كافية',
  err_hall_gate: 'ارفع قاعة القيادة أولاً', err_max_level: 'بلغ الحد الأقصى',
  err_barracks_gate: 'ارفع الثكنة أولاً', err_unit_locked: 'الفيلق مقفول',
  err_unit_max: 'الفيلق في أقصى مستواه', err_chest_wait: 'الصندوق ليس جاهزاً بعد',
  err_mission_incomplete: 'المهمة لم تكتمل', err_mission_claimed: 'استُلمت من قبل',
  missions: 'المهام اليومية', claim: 'استلام', claimed: 'استُلمت', open_it: 'افتح',
  freeChest: 'صندوق المؤن المجاني', chest_ready: 'جاهز للفتح!', chest_in: 'يجهز خلال',
  soon: 'قريباً', shop_note: 'العروض الحقيقية تأتي مع المتجر الكامل — لا صناديق حظ مدفوعة أبداً.',
  train: 'ترقية الفيلق', locked: 'مقفول',
  deck_edit: 'تعديل التشكيلة', deck_save: 'اعتماد التشكيلة', deck_current: 'تشكيلتك الحالية',
  profile: 'الملف الشخصي', valley: 'وادي الحشود', valley_open: 'ادخل الوادي',
  valley_note: 'أنهِ جولة في الوادي ثم استلم مكافأتك',
  battle_reward: 'الغنيمة', tap_building: 'انقر مبنى لإدارته',
  base_busy_banner: 'البنّاؤون يعملون…',
  // ── مواصفات القتال (المدى والأسلوب) ──
  range: 'المدى', dps: 'ضرر/ث', speed: 'سرعة', melee: 'التحام',
  style_steel_guard: 'Tank — درع ثقيل يمتص السهام (−40%)، بطيء، يكسره الحصار والاغتيال',
  style_vale_archers: 'رمي بعيد 9م — يفترس الطيران والمشاة الخفيفة، يذوب أمام الفرسان',
  style_spear_bearers: 'مضاد فرسان — ضرر مضاعف عليهم، يضعف أمام الرمي',
  style_hollow_knights: 'فرسان سريعون بضربة Charge أولى ×1.8 — يطاردون الخلف، تفنيهم الرماح',
  style_flame_casters: 'ضرر منطقة 6.5م — يحرق الحشود، ضعيف أمام مدى أطول وفرسان',
  style_bat_riders: 'طيران — يتجاوز الهوة والبوابة، لا يطاله الالتحام الأرضي، الرماة عدوه الأول',
  style_siege_engineers: 'حصار — يتجاهل الفرق ويكسر البوابات والمباني، احمِه أو مات',
  style_banner_guards: 'إسناد — هالة +15% ضرراً وسرعة لمن حولهم، هدف ثمين للاغتيال',
  style_running_shadows: 'اغتيال — سريعون نحو الرماة والدعم، يذوبون أمام الصدام',
  style_stone_golem: 'ثقيل — HP هائل يصنع الضغط، بطيء ويُستنزف بالحشود',
  flag_btn: 'راية\nالقيادة', flag_hint: 'انقر موضع الراية في الساحة',
  collect: 'استلام', pending: 'متكدس', err_nothing: 'لا إنتاج للاستلام بعد', err_flag_cd: 'الراية ليست جاهزة',
  gate: 'البوابة', heart: 'قلب القلعة', gate_down_you: 'كُسرت بوابتك!',
  gate_down_foe: 'كسرت بوابة الخصم! اقتحم الفناء'
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
