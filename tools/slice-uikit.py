# -*- coding: utf-8 -*-
"""٦٫٩٦ — تقطيع عُدّة الأزرار المولَّدة في OpenArt (art/keyart/uikit.png على خلفيّة أرجوانيّة #FF00FF) إلى عناصر شفّافة في art/uikit/NN.png
مع لوحة معاينة art/uikit/_sheet.png.   python3 tools/slice-uikit.py [--tol 60]"""
import os, sys
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import _keyslice as K
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SRC=None
for e in ('.png','.jpg','.jpeg','.webp'):
    p=os.path.join(ROOT,'art','keyart','uikit'+e)
    if os.path.exists(p):SRC=p;break
if not SRC:sys.exit('لا يوجد art/keyart/uikit.png')
OUT=os.path.join(ROOT,'art','uikit');os.makedirs(OUT,exist_ok=True)
tol=int(sys.argv[sys.argv.index('--tol')+1]) if '--tol' in sys.argv else 60
rgba=K.keyout(Image.open(SRC),tol);boxes=K.grid_order(K.components(rgba[...,3],min_px=400))
tiles=[]
for k,b in enumerate(boxes,1):
    t=K.crop(rgba,b,6);t.save(os.path.join(OUT,'%02d.png'%k));tiles.append(t);print('%02d  %dx%d'%(k,t.width,t.height))
K.preview(tiles,os.path.join(OUT,'_sheet.png'));print('→ art/uikit/_sheet.png',len(tiles),'عناصر')
