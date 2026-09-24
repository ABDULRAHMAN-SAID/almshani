#!/bin/sh
# ينزّل صور الجيس من OpenArt ويقصّها دوائر 256×256 (PNG شفّاف) في art-src/strikers/out/
# يحتاج أن يكون cdn.openart.ai مسموحًا في شبكة البيئة.
set -e
cd "$(dirname "$0")"; mkdir -p raw out
python3 -c "import json;d=json.load(open('openart.json'));[print(k,v['url']) for k,v in d['items'].items()]" | while read k u; do
 [ -s "raw/$k.png" ] || curl -sSfL -o "raw/$k.png" "$u"
 python3 cut.py "raw/$k.png" "out/$k.png" 256
done
ls -l out
