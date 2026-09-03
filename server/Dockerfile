# خادم تحدّي — صورة واحدة تقدّم اللعبة (tahaddi/) والخادم (/ws) من منفذ واحد.
# البناء من جذر المستودع:  docker build -f server/Dockerfile -t tahaddi .
# التشغيل:                 docker run -p 8090:8090 -v tahaddi_data:/data tahaddi

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
# البناء يحتاج esbuild فقط؛ لا نثبّت بقية الاعتماديات الثقيلة (three, sharp, typescript)
RUN npm install --no-save --no-package-lock --ignore-scripts esbuild@^0.28 ws@^8
COPY server ./server
RUN node_modules/.bin/esbuild server/src/tahaddi/index.ts --bundle --platform=node --format=esm --external:ws --outfile=server/dist/tahaddi.js --log-level=warning
# الصفحات القانونية تُولَّد من نصّ اللعبة نفسه: المتجران يطلبان رابط سياسة خصوصية يعمل،
# وهذا الخادم يقدّمه من نفس الأصل فلا يحتاج المالك مضيفًا ثانيًا.
COPY tools/build-www.cjs ./tools/build-www.cjs
COPY tahaddi ./tahaddi
RUN node tools/build-www.cjs /app/wwwgen

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8090 \
    HOST=0.0.0.0 \
    TAHADDI_DIR=/app/tahaddi \
    TAHADDI_DATA_FILE=/data/tahaddi.json
RUN mkdir -p /data && npm install --no-save --no-package-lock --ignore-scripts ws@^8 && echo '{"type":"module"}' > server/package.json 2>/dev/null || true
COPY --from=build /app/server/dist/tahaddi.js ./server/dist/tahaddi.js
COPY tahaddi/index.html tahaddi/sw.js tahaddi/manifest.webmanifest ./tahaddi/
COPY tahaddi/icons ./tahaddi/icons
COPY --from=build /app/wwwgen/privacy.html /app/wwwgen/terms.html /app/wwwgen/licenses.html ./tahaddi/
VOLUME ["/data"]
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8090/health || exit 1
CMD ["node", "server/dist/tahaddi.js"]
