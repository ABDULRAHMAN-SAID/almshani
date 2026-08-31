// تدقيق بنك الأسئلة: التصنيف الموضوعي مقابل الشبكة، وتوزيع الصعوبة، وعينات الشذوذ
import fs from 'fs';

const src = fs.readFileSync('tahaddi/index.html', 'utf8');
const a = src.indexOf('const Q=[');
const b = src.indexOf('];', a);
const Q = JSON.parse('[' + src.slice(a + 9, b).trim().replace(/,\s*$/, '') + ']');

const netOf = n => n.startsWith('gen') ? 'general' : n.startsWith('ar') ? 'arab'
  : n.startsWith('fb') ? 'football' : n.startsWith('rel') ? 'religion'
  : n.startsWith('an') ? 'animals' : n.startsWith('sci') ? 'science'
  : n.startsWith('geo') ? 'geography' : n.startsWith('pz') ? 'puzzles' : '??';

// مصنّف موضوعي بالكلمات المفتاحية — ترتيب الفحص مهم (الأكثر تحديدًا أولًا)
const topicOf = q => {
  const t = q.t + ' ' + (q.o || []).join(' ');
  if (/سورة|سور |آية|الآيات|جزء عمّ|النبي|ﷺ|الصحاب|الخلفاء|غزوة|القرآن|الوضوء|الصلاة|الزكاة|رمضان|الحج|مسجد|هجري|الأنبياء|المصحف|التشهد|السجود|قريش|مكة|المدينة المنورة/.test(t)) return 'religion';
  if (/عنصر|الجدول الدوري|العدد الذري|الكتلة الذرية|نظير|إلكترون|الغلاف الخارجي|يرمز له بالرمز/.test(t)) return 'science.element';
  if (/كوكب|مجرة|الشمس|القمر(?!ين)|فضاء|ضوء|جاذبية|خلية|حمض|غاز|فيزيا|كيميا|جسم الإنسان|القلب|الدماغ|العظام|الكبد|الرئت/.test(t)) return 'science';
  if (/كأس العالم|الدوري|نادي|منتخب|لاعب|هدف|مباراة|كرة القدم|ميسي|رونالدو|مدرب|البطولة|حارس مرمى|ضربة جزاء/.test(t)) return 'football';
  if (/حيوان|طائر|أسد|فهد|جمل|صقر|سمك|زواحف|ثديي|حشر|فصيلة|يعيش|صغير ال|أنثى ال|موطن/.test(t)) return 'animals';
  if (/عاصمة|دولة|قارة|نهر|جبل|صحراء|محيط|بحر |خريطة|مضيق|جزيرة|مفتاح الاتصال|رمز الدولة|نطاق الإنترنت|إقليم|حدود|يحدها/.test(t)) return 'geography';
  if (/معركة|خلافة|دولة العباس|الأموي|العثماني|قائد|فتح|حضارة|مؤرخ|عام الفيل|هجرة|سقوط|إمبراطور|ملك |سلطان/.test(t)) return 'history';
  if (/كم يساوي|ناتج|متتالية|نمط|لغز|أحجية|إذا كان|بقيت معك|أعطيت|زايد|ناقص|ضرب|قسمة|\d+\s*[+×÷-]/.test(t)) return 'puzzles';
  return 'general';
};

// خريطة توافق الموضوع مع الشبكة
const fits = (net, topic) => {
  if (topic === 'science.element') return net === 'science';
  if (topic === 'history') return net === 'arab' || net === 'general';
  if (topic === 'general') return true; // العام يقبل في أي مكان
  return net === topic || (net === 'general' && false);
};

// كيانات نادرة تجعل السؤال صعبًا حكمًا
const OBSCURE = /البراسيوديميوم|الغادولينيوم|الثوليوم|الإيتريوم|الروبيديوم|السترونشيوم|البزموت|الأمريسيوم|البلوتونيوم|اللوتيشيوم|الهافنيوم|التنتالوم|الفاناديوم|الزركونيوم|المنغنيز|الكوبالت|سانت فنسنت|غرينادين|توفالو|ناورو|كيريباتي|بالاو|ليختنشتاين|سان مارينو|جزر القمر|جزر مارشال|سورينام|بوتسوانا|إسواتيني|ليسوتو|بوركينا|طاجيك|قيرغيز/;
const HARD_ASK = /العدد الذري|الكتلة الذرية|نظير|الغلاف الخارجي|مفتاح الاتصال|رمز الدولة|نطاق الإنترنت|ISO|في أي دورة/;

const byNet = {}, misfit = {}, dHist = {}, easyHard = [];
for (const q of Q) {
  const net = netOf(q.n), topic = topicOf(q);
  byNet[net] = (byNet[net] || 0) + 1;
  dHist[net] = dHist[net] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dHist[net][q.d] = (dHist[net][q.d] || 0) + 1;
  if (!fits(net, topic)) {
    const k = net + '←' + topic;
    misfit[k] = misfit[k] || [];
    misfit[k].push(q.t.slice(0, 60));
  }
  if (q.d <= 2 && (OBSCURE.test(q.t + (q.o || []).join(' ')) || HARD_ASK.test(q.t)))
    easyHard.push(`[${net} d${q.d}] ${q.t.slice(0, 70)}`);
}

console.log('إجمالي:', Q.length);
console.log('\nحسب الشبكة:', byNet);
console.log('\nتوزيع الصعوبة حسب الشبكة:');
for (const [n, h] of Object.entries(dHist)) console.log(' ', n, JSON.stringify(h));
console.log('\nخلط موضوعي (شبكة←موضوع): العدد وعينتان');
for (const [k, arr] of Object.entries(misfit).sort((x, y) => y[1].length - x[1].length))
  console.log(` ${k}: ${arr.length}\n    · ${arr[0]}\n    · ${arr[1] || ''}`);
console.log('\nأسئلة "سهلة" وهي صعبة حكمًا:', easyHard.length);
easyHard.slice(0, 12).forEach(x => console.log('  ', x));
