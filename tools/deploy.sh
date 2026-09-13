#!/usr/bin/env bash
# نشر تحدّي حيًّا على Fly.io — أمر واحد من جذر المستودع:
#
#   bash tools/deploy.sh              # ينشر ويطبع الرابط
#   bash tools/deploy.sh --check      # يفحص ما ينقص ولا ينشر شيئًا
#
# ما يحتاجه منك مرّة واحدة: حساب على fly.io، وأداة flyctl على جهازك.
# لا يُكتب أيّ سرّ في هذا الملفّ ولا في المستودع — الأسرار تُضبط بـ fly secrets.
set -euo pipefail
cd "$(dirname "$0")/.."

DRY=0; [ "${1:-}" = "--check" ] && DRY=1
say(){ printf '\n\033[1m%s\033[0m\n' "$*"; }
die(){ printf '\n✗ %s\n' "$*" >&2; exit 1; }

command -v flyctl >/dev/null 2>&1 || command -v fly >/dev/null 2>&1 \
  || die "flyctl غير مثبّت. ثبّته: curl -L https://fly.io/install.sh | sh  ثم أعد المحاولة."
FLY=$(command -v flyctl || command -v fly)

APP=${FLY_APP:-$(grep '^app = ' fly.toml | sed 's/app = "\(.*\)"/\1/')}
REGION=$(grep '^primary_region = ' fly.toml | sed 's/.*"\(.*\)"/\1/')
say "التطبيق: $APP · المنطقة: $REGION"

"$FLY" auth whoami >/dev/null 2>&1 || { [ $DRY = 1 ] && die "لم تسجّل الدخول: fly auth login" ; say "سجّل دخولك على Fly:"; "$FLY" auth login; }

say "فحص الصورة قبل النشر (لا نشر لصورة لا تُقلع)"
if command -v node >/dev/null 2>&1; then
  npm run --silent build:tahaddi
  node tools/test-deploy.cjs || die "فحص الصورة فشل — لا يُنشر."
else
  echo "· node غير موجود هنا، يُتخطّى الفحص المحلّي (سيفحصه العمل على GitHub)"
fi

if [ $DRY = 1 ]; then
  say "فحص فقط — لم يُنشر شيء."
  "$FLY" status -a "$APP" >/dev/null 2>&1 && echo "· التطبيق موجود" || echo "· التطبيق غير موجود، وسيُنشأ عند النشر"
  "$FLY" volumes list -a "$APP" 2>/dev/null | grep -q tahaddi_data && echo "· القرص موجود" || echo "· القرص غير موجود، وسيُنشأ عند النشر"
  exit 0
fi

"$FLY" status -a "$APP" >/dev/null 2>&1 || { say "إنشاء التطبيق"; "$FLY" apps create "$APP" --org personal; }
"$FLY" volumes list -a "$APP" 2>/dev/null | grep -q tahaddi_data \
  || { say "إنشاء القرص الدائم (١ ج.ب) للحسابات والنتائج"; "$FLY" volumes create tahaddi_data -a "$APP" -r "$REGION" -s 1 -y; }

say "النشر"
"$FLY" deploy --remote-only -a "$APP"

say "فحص الصحّة"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "https://$APP.fly.dev/health" >/dev/null 2>&1; then
    curl -fsS "https://$APP.fly.dev/health"; echo
    say "اللعبة حيّة: https://$APP.fly.dev"
    echo "· الدخول يعمل الآن ببريد وضغطة، بلا أي إعداد إضافيّ."
    echo "· اختياريّ — زرّ Google:  $FLY secrets set TAHADDI_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com -a $APP"
    echo "· اختياريّ — بريد للحالة التي تحتاج رمزًا:  $FLY secrets set TAHADDI_MAIL_URL=… TAHADDI_MAIL_KEY=… TAHADDI_MAIL_FROM=… -a $APP"
    exit 0
  fi
  sleep 4
done
die "نُشر لكن /health لم يجب بعد. راجع: $FLY logs -a $APP"
