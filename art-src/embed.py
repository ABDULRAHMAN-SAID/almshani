#!/usr/bin/env python3
"""يضمّن صور art-src/out/*.webp في tahaddi/index.html داخل الكائن ART (بين علامتي ART-BEGIN وART-END).
الاسم هو اسم الملف بلا امتداد: sk_blue، coin_w، board، rail، chest_legend، ui_app_bg …
  python3 art-src/embed.py            ← يضمّن كلّ ما في out/
  python3 art-src/embed.py --list     ← يعرض ما سيُضمَّن وأحجامه"""
import os, sys, base64, glob, re
ROOT=os.path.dirname(os.path.abspath(__file__)); GAME=os.path.join(ROOT,'..','tahaddi','index.html')
files=sorted(glob.glob(os.path.join(ROOT,'out','*.webp')))
items=[(os.path.basename(f)[:-5],f) for f in files]
tot=sum(os.path.getsize(f) for _,f in items)
for n,f in items: print(f'{n:22s} {os.path.getsize(f)//1024:5d} KB')
print(f'المجموع {tot//1024} KB في {len(items)} صورة')
if '--list' in sys.argv: sys.exit(0)
body=','.join(f"\n {n}:'data:image/webp;base64,{base64.b64encode(open(f,'rb').read()).decode()}'" for n,f in items)
s=open(GAME,encoding='utf-8').read()
new,k=re.subn(r'/\*ART-BEGIN\*/.*?/\*ART-END\*/',lambda m:'/*ART-BEGIN*/'+body+'\n /*ART-END*/',s,flags=re.S)
assert k==1,'علامتا ART غير موجودتين'
open(GAME,'w',encoding='utf-8').write(new); print('✓ ضُمِّنت')
