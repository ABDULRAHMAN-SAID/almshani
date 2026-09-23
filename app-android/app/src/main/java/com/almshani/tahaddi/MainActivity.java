package com.almshani.tahaddi;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.Display;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;

/**
 * غلاف رقيق حول WebView يشغّل «تحدّي» من أصول التطبيق نفسه.
 *
 * لماذا WebViewAssetLoader ولماذا appassets.androidplatform.net:
 * تحميل الصفحة من file:// يجعلها «سياقًا غير آمن»، فلا يوجد crypto.subtle،
 * وختم الغرف (ECDH + AES-GCM) يرفض العمل فتتعطّل الغرف الأونلاين كلّها.
 * التحميل عبر https://appassets.androidplatform.net/assets/ يجعلها سياقًا آمنًا
 * دون أن تخرج بايت واحد إلى الشبكة: كلّ طلب يُعترض ويُقرأ من assets داخل الحزمة.
 */
public class MainActivity extends AppCompatActivity {

 /** النطاق المحجوز من أندرويد لأصول التطبيق: لا يُحلّ على الإنترنت أبدًا. */
 private static final String ORIGIN = "https://appassets.androidplatform.net";
 private static final String HOME = ORIGIN + "/assets/index.html?src=app";

 /**
  * اللعبة البعيدة — تُكتب عند البناء في `tahaddi_home`، وفارغةٌ تعني «من الحزمة وحدها».
  *
  * ولماذا بعيدةٌ وفي الحزمة نسخة؟ لأن المالك يعدّل كل يوم، وتنزيلُ حزمةٍ جديدة
  * وتثبيتُها عند كل تعديل يقتل حلقة العمل. فإن وُجد الإنترنت حُمِّلت أحدثُ لعبةٍ
  * من الشبكة، وإن انقطع رجع إلى نسخة الحزمة فلعب بلا إنترنت — لا صفحةَ خطأٍ بيضاء.
  *
  * ونسخة الحزمة تبقى كاملةً لا طُعمًا: من ثبّت ولم يفتح الإنترنت قطّ يلعب كما
  * يلعب غيره، وهذا ما يجعل التطبيق تطبيقًا لا غلافَ موقع.
  */
 private String remote = "";
 private String remoteOrigin = "";
 private boolean fellBack = false;

 private WebView web;

 /** البعيدة إن ضُبطت، وإلّا نسخة الحزمة. */
 private String startUrl() { return remote.isEmpty() ? HOME : remote; }

 @SuppressLint("SetJavaScriptEnabled")
 @Override
 protected void onCreate(Bundle saved) {
  super.onCreate(saved);

  /* https وحدها تُقبل: تحميلٌ غير مشفّر يجعل الصفحة سياقًا غير آمن فيسقط
     crypto.subtle ويتعطّل ختم الغرف — ولا يُقبل في أندرويد الحديث أصلًا. */
  remote = getString(R.string.tahaddi_home).trim();
  if (!remote.isEmpty()) {
   Uri r = Uri.parse(remote);
   if ("https".equals(r.getScheme()) && r.getAuthority() != null) {
    remoteOrigin = "https://" + r.getAuthority();
   } else {
    remote = "";
   }
  }

  final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
   .setDomain("appassets.androidplatform.net")
   .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
   .build();

  web = new WebView(this);
  web.setBackgroundColor(Color.parseColor("#080B14"));
  web.setOverScrollMode(View.OVER_SCROLL_NEVER);
  web.setLayoutParams(new ViewGroup.LayoutParams(
   ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

  WebSettings s = web.getSettings();
  s.setJavaScriptEnabled(true);
  s.setDomStorageEnabled(true);
  s.setDatabaseEnabled(true);
  /* الموسيقى تبدأ مع فتح التطبيق بلا لمسة أولى */
  s.setMediaPlaybackRequiresUserGesture(false);
  /* الصفحة تتولّى مقاسها بنفسها؛ تكبير النظام يكسر التخطيط */
  s.setTextZoom(100);
  s.setUseWideViewPort(true);
  s.setLoadWithOverviewMode(false);
  s.setSupportZoom(false);
  s.setBuiltInZoomControls(false);
  s.setDisplayZoomControls(false);
  s.setAllowFileAccess(false);
  s.setAllowContentAccess(false);
  s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setCacheMode(WebSettings.LOAD_DEFAULT);

  CookieManager.getInstance().setAcceptCookie(true);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

  web.setWebViewClient(new WebViewClient() {
   @Override
   public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
    return loader.shouldInterceptRequest(r.getUrl());
   }

   @Override
   public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
    Uri u = r.getUrl();
    if (u == null) return false;
    final String o = u.getScheme() + "://" + u.getAuthority();
    if (ORIGIN.equals(o)) return false;
    /* اللعبة البعيدة أصلُ التطبيق أيضًا — لولا هذا لخرجت كل نقرةٍ فيها إلى المتصفّح */
    if (!remoteOrigin.isEmpty() && remoteOrigin.equals(o)) return false;
    /* روابط خارجية (الخصوصية على الويب، الدعم، تسجيل جوجل) تُفتح في المتصفّح */
    return openOutside(u);
   }

   @Override
   public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
    /* البعيدة لم تصل — نرجع إلى نسخة الحزمة مرّةً واحدة. والحارس `fellBack`
       يمنع دورةً لا تنتهي لو سقطت نسخة الحزمة هي الأخرى. */
    if (remote.isEmpty() || fellBack || !r.isForMainFrame()) return;
    fellBack = true;
    v.loadUrl(HOME);
   }
  });

  /* عامل الخدمة يطلب الأصول بنفسه؛ بلا هذا التوجيه تفشل طلباته ويتعطّل التحميل */
  if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)
   && WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST)) {
   ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(new ServiceWorkerClientCompat() {
    @Override
    public WebResourceResponse shouldInterceptRequest(WebResourceRequest r) {
     return loader.shouldInterceptRequest(r.getUrl());
    }
   });
  }

  /* «تصدير بياناتي» يبني الملفّ في الصفحة كـ blob: — وWebView لا ينزّله ولا يشتكي،
     فكان الزرّ يقول «نُزّل» ولا شيء يُنزَّل. هنا نقرأ الـblob في الصفحة ونسلّمه إلى أندرويد. */
  web.addJavascriptInterface(new Bridge(), "TahaddiSave");

  /* الصيحات: WebView لا يملك speechSynthesis، فكانت اللعبة تقولها بصوتٍ مركّبٍ «غريب».
     هنا محرّك النطق في النظام (صوت Google العربيّ) — وإن لم يوجد عربيّ بقي ready() كاذبًا
     فتظهر الصيحة مكتوبةً بلا صوت. */
  ttsStart();
  web.addJavascriptInterface(new Speech(), "TahaddiTTS");

  web.setDownloadListener((url, ua, disp, mime, len) -> {
   if (url == null) return;
   if (url.startsWith("blob:")) { web.evaluateJavascript(blobReader(url, mime), null); return; }
   openOutside(Uri.parse(url));
  });

  if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);

  android.widget.FrameLayout root = new android.widget.FrameLayout(this);
  root.setBackgroundColor(Color.parseColor("#080B14"));
  root.addView(web);
  setContentView(root);
  preferHighRefresh();

  /* من أندرويد ١٥ النافذة ممتدّة من حافة إلى حافة؛ نُبعد الصفحة عن الشريطين واللوحة بأنفسنا
     بدل الاعتماد على env(safe-area-inset-*) التي لا يملؤها WebView على كلّ الأجهزة */
  ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
   Insets bars = insets.getInsets(
    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
   Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
   v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
   return insets;
  });

  getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
   @Override
   public void handleOnBackPressed() {
    /* موجّه اللعبة يضع مدخلًا حارسًا في السجل، فـ goBack يصل إليه كـ popstate ويرجع شاشة واحدة */
    if (web.canGoBack()) web.goBack();
    else finish();
   }
  });

  if (saved != null) web.restoreState(saved);
  else web.loadUrl(startUrl());
 }

 /**
  * ٦٫٦٥ — «ارفع الفريمات بحيث تكون ١٢٠ في الثانية»: كثيرٌ من الهواتف تُبقي التطبيقات على ٦٠ هرتز ما لم تطلب
  * غيره. نطلب أعلى معدّل تحديثٍ تدعمه الشاشة بالدقّة نفسها (١٢٠ أو ٩٠ أو ١٤٤)، وWebView يرسم بمعدّلها.
  */
 private void preferHighRefresh() {
  try {
   Display d = getWindowManager().getDefaultDisplay();
   Display.Mode cur = d.getMode(), best = cur;
   for (Display.Mode m : d.getSupportedModes()) {
    if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight()
     && m.getRefreshRate() > best.getRefreshRate()) best = m;
   }
   android.view.WindowManager.LayoutParams lp = getWindow().getAttributes();
   lp.preferredDisplayModeId = best.getModeId();
   if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) lp.preferredRefreshRate = best.getRefreshRate();
   getWindow().setAttributes(lp);
  } catch (Exception e) {
   /* جهازٌ لا يكشف أنماط شاشته: يبقى على ما يختاره النظام */
  }
 }

 /** الجسر الوحيد بين الصفحة وأندرويد. صنف داخليّ معلن عامًّا لأنّ WebView يستدعيه بالانعكاس. */
 public class Bridge {
  @JavascriptInterface
  public void take(final String b64, final String mime) {
   runOnUiThread(() -> handOver(b64, mime));
  }
 }

 private TextToSpeech tts;
 private volatile boolean ttsReady = false;
 private volatile boolean ttsBound = false;
 private volatile boolean ttsFailed = false;

 private void ttsStart() {
  if (tts != null) { tts.shutdown(); tts = null; }
  ttsBound = false; ttsReady = false; ttsFailed = false;
  tts = new TextToSpeech(getApplicationContext(), status -> {
   if (status != TextToSpeech.SUCCESS || tts == null) { ttsFailed = true; return; }
   ttsBound = true;
   ttsCheck();
  });
 }

 /** العربيّة قد تُثبَّت بعد فتح التطبيق (كما تنصح الإعدادات): يُعاد الفحص عند كلّ عودة — المراجعة */
 private void ttsCheck() {
  if (tts == null || !ttsBound) return;
  Locale ar = new Locale("ar");
  if (tts.isLanguageAvailable(ar) < TextToSpeech.LANG_AVAILABLE) { ttsReady = false; return; }
  int r = tts.setLanguage(ar);
  ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
 }

 /** جسر النطق: ready() هل في الجهاز عربيّ، speak() تقول الجملة بطبقة اللاعب وسرعته */
 public class Speech {
  @JavascriptInterface
  public boolean ready() { return ttsReady; }

  @JavascriptInterface
  public boolean speak(final String text, final float pitch, final float rate) {
   if (!ttsReady || tts == null || text == null) return false;
   final String t = text.length() > 120 ? text.substring(0, 120) : text;
   runOnUiThread(() -> {
    if (tts == null) return;
    tts.setPitch(Math.max(0.5f, Math.min(2f, pitch)));
    tts.setSpeechRate(Math.max(0.5f, Math.min(2f, rate)));
    tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "shout");
   });
   return true;
  }

  @JavascriptInterface
  public void stop() { runOnUiThread(() -> { if (tts != null) tts.stop(); }); }
 }

 /** سكربت يقرأ الـblob داخل الصفحة ويعيده مرمّزًا — الـblob لا يُقرأ من جانب أندرويد */
 private static String blobReader(String url, String mime) {
  String u = url.replace("\\", "\\\\").replace("'", "\\'");
  String m = (mime == null ? "" : mime).replace("'", "");
  return "(function(){try{fetch('" + u + "').then(function(r){return r.blob()}).then(function(b){"
   + "var f=new FileReader();f.onloadend=function(){var s=String(f.result||'');"
   + "var i=s.indexOf(',');if(i<0)return;"
   + "TahaddiSave.take(s.slice(i+1),'" + m + "')};"
   + "f.readAsDataURL(b)}).catch(function(){})}catch(e){}})()";
 }

 /** يكتب الملفّ في مخبأ التطبيق ثم يفتح ورقة المشاركة ليحفظه اللاعب حيث يشاء */
 private void handOver(String b64, String mime) {
  try {
   String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
   if (ext == null || ext.isEmpty()) ext = "json";
   String name = "tahaddi-" + String.format(Locale.US, "%tF", System.currentTimeMillis()) + "." + ext;
   File dir = new File(getCacheDir(), "share");
   if (!dir.exists() && !dir.mkdirs()) return;
   File out = new File(dir, name);
   byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
   try (FileOutputStream fo = new FileOutputStream(out)) { fo.write(bytes); }
   Uri uri = FileProvider.getUriForFile(this, "com.almshani.tahaddi.files", out);
   Intent send = new Intent(Intent.ACTION_SEND)
    .setType(mime == null || mime.isEmpty() ? "application/json" : mime)
    .putExtra(Intent.EXTRA_STREAM, uri)
    .putExtra(Intent.EXTRA_TITLE, name)
    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
   startActivity(Intent.createChooser(send, getString(R.string.export_pick)));
  } catch (Exception e) {
   /* تعذّر الحفظ: نصّ البيانات معروض في الصفحة نفسها مع زرّ نسخ، فلا يضيع شيء */
  }
 }

 private boolean openOutside(Uri u) {
  if (u == null) return true;
  String sch = u.getScheme();
  if (sch == null) return true;
  if (!sch.equals("https") && !sch.equals("http")
   && !sch.equals("mailto") && !sch.equals("tel")) return true;
  try {
   startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  } catch (ActivityNotFoundException | SecurityException e) {
   /* لا تطبيق يفتحه: نتجاهل بصمت بدل إسقاط اللعبة */
  }
  return true;
 }

 @Override
 protected void onSaveInstanceState(Bundle out) {
  super.onSaveInstanceState(out);
  if (web != null) web.saveState(out);
 }

 @Override
 protected void onPause() {
  super.onPause();
  if (tts != null) tts.stop();
  if (web != null) { web.onPause(); web.pauseTimers(); }
 }

 @Override
 protected void onResume() {
  super.onResume();
  if (web != null) { web.resumeTimers(); web.onResume(); }
  /* ما زال يربط: ينتظر. فشل، أو ربط ولا عربيّ (قد يكون المحرّك انقطع أو ثُبّتت العربيّة للتوّ): يُعاد الربط (المراجعة) */
  if (tts == null || ttsFailed || (ttsBound && !ttsReady)) ttsStart(); else ttsCheck();
 }

 @Override
 protected void onDestroy() {
  if (tts != null) { tts.shutdown(); tts = null; ttsReady = false; ttsBound = false; }
  if (web != null) {
   ViewGroup parent = (web.getParent() instanceof ViewGroup) ? (ViewGroup) web.getParent() : null;
   if (parent != null) parent.removeView(web);
   web.destroy();
   web = null;
  }
  super.onDestroy();
 }
}
