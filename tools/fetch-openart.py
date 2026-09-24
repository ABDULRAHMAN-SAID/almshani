# -*- coding: utf-8 -*-
"""٦٫٩٦ — جلب لوحات OpenArt الأصليّة (بدقّتها الكاملة) إلى مجلّدات art/ حسب art/openart-manifest.json
  python3 tools/fetch-openart.py            ← يجلب ما ليس موجودًا (ما أرسله المالك في الدردشة يبقى كما هو)
  python3 tools/fetch-openart.py --force    ← يعيد جلب كلّ شيء
يحتاج أن يسمح إعداد الشبكة بالمضيف cdn.openart.ai. بعدها:
  python3 tools/build-road-art.py · python3 tools/build-keyart.py · python3 tools/build-avatars.py
  python3 tools/build-emotes-v3.py · python3 tools/slice-uikit.py · node tools/splash-total.cjs"""
import json, os, sys, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT=('.png','.webp','.jpg','.jpeg')
force='--force' in sys.argv
items=json.load(open(os.path.join(ROOT,'art','openart-manifest.json'),encoding='utf-8'))
ok=skip=bad=0
for it in items:
    base=os.path.join(ROOT,it['path'])
    have=[base+e for e in EXT if os.path.exists(base+e)]
    if have and not force:
        skip+=1;print('=',it['path'],'(موجود)');continue
    ext=os.path.splitext(it['url'].split('?')[0])[1].lower() or '.png'
    os.makedirs(os.path.dirname(base),exist_ok=True)
    try:
        with urllib.request.urlopen(it['url'],timeout=60) as r:data=r.read()
        if len(data)<10000:raise ValueError('ملفّ صغير جدًّا (%d بايت)'%len(data))
        for h in have:os.remove(h)
        open(base+ext,'wb').write(data);ok+=1;print('+',it['path']+ext,len(data)//1024,'KB')
    except Exception as e:
        bad+=1;print('✗',it['path'],e)
print('جُلب %d · موجود %d · فشل %d'%(ok,skip,bad))
sys.exit(1 if bad else 0)
