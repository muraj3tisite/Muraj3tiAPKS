/* غيّر رقم الإصدار عند كل تحديث تنشره: أي تغيير في هذا الملف يُظهر للمستخدمين رسالة «يتوفر تحديث» */
var VERSION = "1.4.9";
var CACHE = "murajaati-" + VERSION;
/* خطوط صفحات المصحف تُحفظ في مخزن دائم لا يُمسح عند تغيير الإصدار، حتى لا تُنزَّل (نحو ١٠٠ ميجا) من جديد */
var FONTS = "mfonts-v1";
function store(url) { return /\/fonts\/p\d+\.woff$/.test(url) ? FONTS : CACHE; }
/* مواقع خارجية يحتاجها التطبيق ونخزّنها ليعمل دون إنترنت بعد أول فتح */
var EXT = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "www.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(["./", "manifest.json", "robot.js?v=4", "musammi.js?v=28", "apkupdate.js?v=1", "backup.js?v=1", "data/quran-text.json"].map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      /* يُحذف أيضًا ما خلّفه محرك التلاوة القديم (النموذج ومكتبة التشغيل) لتحرير المساحة */
      return Promise.all(ks.filter(function (k) { return (k.indexOf("murajaati-") === 0 && k !== CACHE) || k === "mquran-v1" || k === "mext-v1"; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

function put(r, res, ext) {
  if (res && (res.status === 200 || (ext && res.status === 0))) {
    var cp = res.clone();
    caches.open(store(r.url)).then(function (c) { c.put(r, cp); }).catch(function () {});
  }
}

self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  var ext = u.origin !== location.origin;
  if (ext && EXT.indexOf(u.hostname) < 0) return;
  if (!ext && r.mode === "navigate") {
    /* الصفحة: الشبكة أولًا لتصل التحديثات، والنسخة المخزّنة عند انقطاع الإنترنت */
    e.respondWith(
      fetch(r, { cache: "no-cache" }).then(function (res) { put(r, res, false); return res; })
        .catch(function () { return caches.match(r).then(function (m) { return m || caches.match("./"); }); })
    );
    return;
  }
  /* بقية الملفات: من الذاكرة فورًا، وتُحدَّث في الخلفية */
  e.respondWith(
    caches.match(r).then(function (m) {
      var f = fetch(r).then(function (res) { put(r, res, ext); return res; }).catch(function () { return m; });
      return m || f;
    })
  );
});
