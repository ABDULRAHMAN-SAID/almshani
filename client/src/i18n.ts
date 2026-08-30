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
  style_spear_wall: 'التحام — جدار رماح مضاد للفرسان (ضرر مضاعف عليهم)',
  style_shield_guard: 'التحام — سلحفاة تمتص السهام (−40% من الرمي)',
  style_axe_warriors: 'التحام هجومي — يذيب فرق الصدام الأخرى',
  style_archers: 'رمي بعيد — يسقط سريعاً إن وصله التحام',
  style_light_slingers: 'رمي قوسي — يقذف فوق الصدام على الخلف',
  style_flame_archers: 'رمي بضرر منطقة — يحرق الحشود المتكدسة',
  style_raid_cavalry: 'خيّالة سريعة — تطارد الرماة والحصار أولاً، تذوب على الرماح',
  style_north_wolves: 'أسرع وحدة — حشد رخيص بلا دروع إطلاقاً',
  style_field_medic: 'إسناد — يلاحق أقرب حليف جريح ويضمده 25/ث',
  style_frost_witch: 'إسناد — تبطئ كل من حول هدفها 35%',
  style_iron_ram: 'حصار — يتجاهل الفرق كلياً ويقصد المقر لمساً',
  style_catapult: 'حصار — يقصف الأبنية من بعيد، أعمى تحت 4م فيتراجع'
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
