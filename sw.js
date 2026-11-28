/* غيّر رقم الإصدار عند كل تحديث تنشره: أي تغيير في هذا الملف يُظهر للمستخدمين رسالة «يتوفر تحديث» */
var VERSION = "1.9.5";
var CACHE = "murajaati-" + VERSION;
/* خطوط صفحات المصحف تُحفظ في مخزن دائم لا يُمسح عند تغيير الإصدار، حتى لا تُنزَّل (نحو ١٠٠ ميجا) من جديد */
var FONTS = "mfonts-v1";
function store(url) { return /\/fonts\/p\d+\.woff$/.test(url) ? FONTS : CACHE; }
/* مواقع خارجية يحتاجها التطبيق ونخزّنها ليعمل دون إنترنت بعد أول فتح */
var EXT = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "www.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(["./", "manifest.json", "robot.js?v=4", "musammi.js?v=26", "ikhtibar.js?v=11", "mushafi.js?v=5", "data/quran-text.json"].map(function (u) { return c.add(u).catch(function () {}); }));
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
  if (r.headers.get("range")) return;   /* الصوت (تلاوة الاختبار وعبارة «أكمل») يُترك للشبكة: طلبات الصوت الجزئية لا تُخزَّن */
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

/* ===== تذكير سورة الكهف يوم الجمعة =====
   إشعار النظام يُعرض عند فتح التطبيق يوم الجمعة (من الصفحة)، وكذلك من المزامنة الدورية في المتصفحات التي تدعمها
   (Chrome على أندرويد للتطبيق المثبّت). مرة واحدة في اليوم. */
var KAHF_BODY = "قال ﷺ: «مَنْ قَرَأَ سُورَةَ الْكَهْفِ يَوْمَ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ»\nرواه الحاكم والبيهقي وصححه الألباني";
self.addEventListener("periodicsync", function (e) {
  if (e.tag !== "kahf-friday") return;
  e.waitUntil((function () {
    var d = new Date(), day = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    if (d.getDay() !== 5) return Promise.resolve();
    return caches.open("mkahf-v1").then(function (c) {
      return c.match("last").then(function (m) { return m ? m.text() : ""; }).then(function (last) {
        if (last === day) return;
        return self.registration.showNotification("جمعة مباركة", { body: KAHF_BODY, tag: "kahf-friday", icon: "img/icon-192.png", data: { url: "./#kahf" } })
          .then(function () { return c.put("last", new Response(day)); })
          /* يبقى الإشعار خمس ثوانٍ ثم يُغلق */
          .then(function () { return new Promise(function (r) { setTimeout(r, 5000); }); })
          .then(function () { return self.registration.getNotifications({ tag: "kahf-friday" }); })
          .then(function (l) { l.forEach(function (n) { n.close(); }); });
      });
    });
  })());
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "./#kahf";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) { cs[i].postMessage({ type: "OPEN_KAHF" }); return cs[i].focus(); } }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
