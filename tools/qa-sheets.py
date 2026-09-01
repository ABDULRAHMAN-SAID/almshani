# -*- coding: utf-8 -*-
"""يجمع لقطات الفحص في لوحات مراجعة (٨ لقطات في كل لوحة) مع تسمية كل لقطة ومقياسها الأهمّ.
   python3 tools/qa-sheets.py .qa"""
import json, os, sys
from PIL import Image, ImageDraw
d = sys.argv[1] if len(sys.argv) > 1 else '.qa'
rep = json.load(open(os.path.join(d, 'report.json'), encoding='utf-8'))
rows = rep['rows']
W, H = 215, 450
COLS, ROWS = 4, 2
per = COLS * ROWS
sheets = []
for s in range(0, len(rows), per):
    chunk = rows[s:s + per]
    im = Image.new('RGB', (COLS * W, ROWS * (H + 22)), (18, 20, 28))
    dr = ImageDraw.Draw(im)
    for i, r in enumerate(chunk):
        x = (i % COLS) * W; y = (i // COLS) * (H + 22)
        p = os.path.join(d, r['file'])
        if os.path.exists(p):
            t = Image.open(p).convert('RGB').resize((W, H))
            im.paste(t, (x, y + 22))
        flag = ''
        if r.get('fail'): flag += ' FAIL'
        if r.get('errs'): flag += ' ERR'
        if r.get('overflowX'): flag += ' OVX'
        if r.get('clipped'): flag += ' CLIP'
        if r.get('tiny'): flag += ' TINY'
        if r.get('latin'): flag += ' LATIN'
        if r.get('textLen', 99) < 40: flag += ' BLANK'
        col = (255, 120, 120) if flag else (200, 200, 210)
        dr.text((x + 4, y + 4), f"{r['n']} {r['name']}{flag}", fill=col)
    out = os.path.join(d, f'sheet-{s // per + 1:02d}.png')
    im.save(out); sheets.append(out)
print('\n'.join(sheets))
