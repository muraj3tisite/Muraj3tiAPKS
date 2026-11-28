/* اختباري — اختبار المحفوظ.
   تُتلى آية بصوت الشيخ محمد صديق المنشاوي (مرتّل)، ثم تبدأ فرصة القارئ ليكمل ما بعدها.
   يُكمل القارئ الآيات التالية كلها دفعة واحدة (عددًا محدّدًا من ١ إلى ٥، أو إلى آخر الصفحة)، ثم تأتي آية جديدة، وهكذا.
   الآيات تُختار عشوائيًا من الصفحات المحفوظة (أجزاء كاملة أو صفحات متفرقة، من خطة المستخدم)،
   أو من نطاق يحدّده المستخدم: سور، أجزاء، أحزاب، صفحات (من … إلى …)، ويمكن جمع أكثر من نطاق.
   تظهر الآيات المطلوبة بشكل صفحة المصحف نفسها (خط الصفحة QPC وأسطرها وألوان التجويد وعلامة رقم الآية) وتنكشف كلمةً كلمة.
   الإصغاء بالمحرّك نفسه الذي يستعمله المسمّع الآلي في «مصحفي» (G.MushafiCore)، فتتساوى الدقة والسرعة.
   يحتاج الإنترنت: الصوت من everyayah.com والتعرّف الصوتي من المتصفح. */
(function (G) {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var AUDIO = "https://everyayah.com/data/Minshawy_Murattal_128kbps/";   /* الشيخ محمد صديق المنشاوي (مرتّل)، ملفات SSSAAA.mp3 */
  var BSMN = "بسم لله لرحمن لرحيم";
  function C() { return G.MushafiCore || null; }   /* محرّك المسمّع الآلي (يُحمَّل مع mushafi.js) */
  function nz(s) { var c = C(); return c ? c.norm(s) : ""; }

  var CFG = { n: 5, c: 3, m: "count" };   /* عدد الاختبارات (٥–١٠)، وعدد الآيات المطلوب إكمالها في كل اختبار (١–٥)، ونطاق الإكمال: count = عدد آيات، page = إلى آخر الصفحة */
  try { var sv = JSON.parse(localStorage.getItem("ikCfg") || "null"); if (sv && sv.n >= 5 && sv.n <= 10 && sv.c >= 1 && sv.c <= 5) CFG = { n: sv.n, c: sv.c, m: sv.m === "page" ? "page" : "count" }; loadScope(sv); } catch (e) {}
  /* نطاق الاختبار: sc = mine (كل المحفوظ) أو s سور / j أجزاء / h أحزاب / p صفحات. rg: آخر «من–إلى» لكل نوع، ex: نطاقات مضافة [النوع، من، إلى] */
  function maxOf(t) { return { s: 114, j: 30, h: 60, p: 604 }[t] || 0; }
  function okRg(t, a, b) { return a === (a | 0) && b === (b | 0) && a >= 1 && a <= b && b <= maxOf(t); }
  function loadScope(sv) {
    CFG.sc = "mine"; CFG.rg = { s: [1, 1], j: [30, 30], h: [60, 60], p: [1, 1] }; CFG.ex = [];
    if (!sv) return;
    if (maxOf(sv.sc)) CFG.sc = sv.sc;
    ["s", "j", "h", "p"].forEach(function (t) { var r = sv.rg && sv.rg[t]; if (r && okRg(t, r[0], r[1])) CFG.rg[t] = [r[0], r[1]]; });
    if (Array.isArray(sv.ex)) CFG.ex = sv.ex.filter(function (x) { return x && okRg(x[0], x[1], x[2]); });
  }
  if (!CFG.rg) loadScope(null);
  function saveCfg() { try { localStorage.setItem("ikCfg", JSON.stringify(CFG)); } catch (e) {} }

  var AR = function (n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function fem() { try { return G.MRobot && G.MRobot.who().g === "f"; } catch (e) { return false; } }
  function gn(m, f) { return fem() ? f : m; }

  /* ===== خريطة الآيات من بيانات المصحف المضمّنة (QV4) ===== */
  var D = null;
  function buildMap() {
    var V = G.QV4; if (!V || !V.AY || !V.L || !V.SU) return null;
    var pst = [0], c = 0, as = [], ae = [], sN = [], aN = [], i;
    for (i = 0; i < V.L.length; i++) pst.push(pst[i] + V.L[i].reduce(function (s, x) { return s + (x > 0 ? x : 0); }, 0));
    V.AY.forEach(function (n) { as.push(c); c += n; ae.push(c); });
    V.SU.forEach(function (n, s) { for (var a = 1; a <= n; a++) { sN.push(s + 1); aN.push(a); } });
    var pw = [], p, w; for (p = 0; p < V.L.length; p++) for (w = pst[p]; w < pst[p + 1]; w++) pw[w] = p + 1;
    return { V: V, pst: pst, as: as, ae: ae, s: sN, a: aN, pw: pw };
  }
  /* الآيات الواقعة كاملةً داخل صفحات المحفوظ (أجزاء كاملة أو صفحات متفرقة) */
  function memRange() {
    var S = G.S; if (!S || !D) return null;
    var pages = [], inSet = {}, k, p, ok, p1, p2, list = [], okA = [], a0, b0, i;
    if (G.MPlan && G.MPlan.pages) pages = G.MPlan.pages();
    else { a0 = Math.max(1, S.a | 0); b0 = Math.min(604, S.b | 0); for (i = a0; i <= b0; i++) pages.push(i); }
    if (!pages.length) return null;
    pages.forEach(function (x) { inSet[x] = 1; });
    for (k = 0; k < D.as.length; k++) {
      p1 = D.pw[D.as[k]]; p2 = D.pw[D.ae[k] - 1]; ok = !!p1 && !!p2;
      for (p = p1; ok && p <= p2; p++) if (!inSet[p]) ok = false;
      okA[k] = ok; if (ok) list.push(k);
    }
    return list.length ? { ok: okA, list: list, pages: pages.length } : null;
  }
  /* بداية كل حزب [السورة، الآية] برواية حفص (مصحف المدينة). الجزء حزبان */
  var HIZB = [[1,1],[2,75],[2,142],[2,203],[2,253],[3,15],[3,93],[3,171],[4,24],[4,88],[4,148],[5,27],[5,82],[6,36],[6,111],[7,1],[7,88],[7,171],[8,41],[9,34],
    [9,93],[10,26],[11,6],[11,84],[12,53],[13,19],[15,1],[16,51],[17,1],[17,99],[18,75],[20,1],[21,1],[22,1],[23,1],[24,21],[25,21],[26,111],[27,56],[28,51],
    [29,46],[31,22],[33,31],[34,24],[36,28],[37,145],[39,32],[40,41],[41,47],[43,24],[46,1],[48,18],[51,31],[55,1],[58,1],[62,1],[67,1],[72,1],[78,1],[87,1]];
  function ayIx(s, a) { var i = 0, k = 0; for (; i < s - 1; i++) k += D.V.SU[i]; return k + a - 1; }
  function hizbIx(h) { return h > 60 ? D.as.length : ayIx(HIZB[h - 1][0], HIZB[h - 1][1]); }
  /* آيات نطاق واحد [من، إلى) */
  function span(t, a, b) {
    if (t === "s") return [ayIx(a, 1), ayIx(b, D.V.SU[b - 1]) + 1];
    if (t === "j") return [hizbIx(2 * a - 1), hizbIx(2 * b + 1)];
    if (t === "h") return [hizbIx(a), hizbIx(b + 1)];
    var k, lo = -1, hi = -1;
    for (k = 0; k < D.as.length; k++) if (D.pw[D.as[k]] >= a && D.pw[D.ae[k] - 1] <= b) { if (lo < 0) lo = k; hi = k; }
    return [Math.max(0, lo), hi + 1];
  }
  /* النطاقات المختارة: المضافة ثم المحدّد حاليًا (بلا تكرار) */
  function chosen() {
    var cur = [CFG.sc].concat(CFG.rg[CFG.sc]), id = cur.join();
    return CFG.ex.filter(function (x) { return x.join() !== id; }).concat([cur]);
  }
  /* آيات الاختبار: كل المحفوظ، أو اتحاد النطاقات المختارة */
  function scopeRange() {
    if (!D) return null;
    if (CFG.sc === "mine") return memRange();
    var okA = [], list = [], k;
    chosen().forEach(function (x) { var r = span(x[0], x[1], x[2]); for (var i = r[0]; i < r[1]; i++) okA[i] = true; });
    for (k = 0; k < D.as.length; k++) if (okA[k]) list.push(k); else okA[k] = false;
    return list.length ? { ok: okA, list: list } : null;
  }
  function surahName(s) { return (G.SN && G.SN[s - 1]) || sName(s); }
  function unitName(t, v) {
    if (t === "s") return surahName(v);
    if (t === "p") return AR(v);
    var h = HIZB[(t === "j" ? 2 * v - 1 : v) - 1];
    return AR(v) + " — " + surahName(h[0]) + " " + AR(h[1]);
  }
  function rangeLabel(x) {
    var t = x[0], a = x[1], b = x[2], one = { s: "سورة", j: "الجزء", h: "الحزب", p: "صفحة" }[t], many = { s: "من سورة", j: "الأجزاء", h: "الأحزاب", p: "الصفحات" }[t];
    var nm = t === "s" ? surahName : AR;
    return a === b ? one + " " + nm(a) : many + " " + nm(a) + (t === "s" ? " إلى " : " – ") + nm(b);
  }
  function pageOf(k) { return D.pw[D.as[k]] || 0; }
  function keyOf(k) { return D.s[k] + ":" + D.a[k]; }
  function sName(s) { return String(D.V.NM[s - 1] || "").replace(/^سُورَةُ\s*/, "") || ("سورة " + AR(s)); }
  var pad3 = function (n) { return ("00" + n).slice(-3); };

  /* اختيار آيات الأسئلة: كل سؤال آية تتبعها آيات من السورة نفسها داخل المحفوظ:
     عددًا محدّدًا (c)، أو (mode = page) كل الآيات التي تبدأ في صفحة الآية حتى آخر الصفحة */
  function pick(n, c, R, mode) {
    var out = [], used = {}, asked = {}, tries = 0, k, len, j, clash, page = mode === "page", lim = page ? 60 : c;
    while (out.length < n && tries < 1200) {
      tries++;
      k = R.list[Math.floor(Math.random() * R.list.length)];
      if (asked[k]) continue;                                                     /* لا يتكرر السؤال نفسه ولو ضاق النطاق */
      len = 0;
      while (len < lim && k + len + 1 < D.as.length && R.ok[k + len + 1] && D.s[k + len + 1] === D.s[k] && (!page || pageOf(k + len + 1) === pageOf(k))) len++;
      if (len < 1 || (tries < 600 && (page ? len < 2 : len < c))) continue;   /* نفضّل السلسلة الكاملة أولًا */
      clash = false; for (j = k; j <= k + len; j++) if (used[j]) clash = true;
      if (clash && tries < 900) continue;                                        /* ثم نسمح بالتداخل إن ضاق المحفوظ */
      for (j = k; j <= k + len; j++) used[j] = 1;
      asked[k] = 1; out.push({ k: k, len: len });
    }
    return out;
  }

  /* ===== نص القرآن ===== */
  var Q = null;
  function loadText(cb) {
    if (Q) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      Q = {}; Object.keys(j).forEach(function (k) {
        var t = j[k];
        if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") { var w = t.trim().split(/\s+/); if (w.length > 4 && nz(w.slice(0, 4).join(" ")) === BSMN) t = w.slice(4).join(" "); }
        Q[k] = t;
      });
      cb(true);
    }).catch(function () { cb(false); });
  }
  /* الآية: كلمات العرض + الكلمات المتوقعة (مطبَّعة) */
  function prep(key) {
    var raw = String(Q[key] || "").trim().split(/\s+/), disp = [], E = [];
    raw.forEach(function (w) {
      var n = nz(w);
      if (!n) { if (disp.length) disp[disp.length - 1].raw += " " + w; return; }   /* علامات الوقف تلتصق بما قبلها */
      var tk = n.split(" ").filter(Boolean), it = { raw: w, a: E.length };
      tk.forEach(function (t) { E.push(t); }); it.b = E.length; disp.push(it);
    });
    return { disp: disp, E: E };
  }
  /* عدة آيات متتالية كمقطع واحد: بين كل آيتين علامة رقم الآية، ويُحسب لكل آية نهاية (ends) لمعرفة كم آية أكمل القارئ.
     EO: كلمات المقطع بالصيغة التي يفهمها محرّك المسمّع الآلي (n = الكلمة، af = أول كلمة في الآية، mq = حروف مقطّعة) */
  function prepMulti(keys) {
    var P = { disp: [], E: [], EO: [], ends: [] }, i, Pn, off, sa;
    keys.forEach(function (key, ix) {
      Pn = prep(key); off = P.E.length; sa = key.split(":");
      if (ix > 0) P.disp.push({ raw: "﴿" + AR(+keys[ix - 1].split(":")[1]) + "﴾", a: off, b: off, mark: true });
      Pn.disp.forEach(function (w) { P.disp.push({ raw: w.raw, a: w.a + off, b: w.b + off }); });
      Pn.E.forEach(function (t, j) { P.E.push(t); P.EO.push({ n: t, s: +sa[0], a: +sa[1], key: key, af: j === 0, fz: false, mq: j === 0 && +sa[0] === 42 && +sa[1] === 2 }); });
      P.ends.push(P.E.length);
    });
    return P;
  }

  /* ===== المطابقة والتعرّف الصوتي =====
     التسامح مع أخطاء التعرّف: لا خطأ في المقطع القصير، وكلما طال سُمح بخطأ أو أكثر. */
  function allowed(n) { return n < 15 ? 0 : (n < 30 ? 1 : (n < 60 ? 2 : (n < 100 ? 3 : 4))); }
  /* التعرّف الصوتي بنفس إعدادات المسمّع الآلي: نتائج مؤقتة ونهائية، وكل نتيجة تُعالَج من حيث وصلنا (cons) فلا تتأخر الكلمات.
     onRes(tokens, from, isFinal) تعيد {used} */
  function listen(onRes, onErr) {
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition, c = C(); if (!SR || !c) return null;
    var r, active = true, cons = {};
    try { r = new SR(); } catch (e) { return null; }
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = function (e) {
      if (!active) return;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], fin = !!res.isFinal, T0 = c.tokenize((res[0] && res[0].transcript) || ""), from = cons[i] || 0, out = onRes(T0, from, fin);
        cons[i] = fin ? T0.length : from + (out ? out.used : 0);
        if (!active) return;
      }
    };
    r.onerror = function (e) { if (e && (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "network" || e.error === "language-not-supported")) { active = false; onErr(e.error); } };
    r.onend = function () { if (active) { cons = {}; setTimeout(function () { if (active) { try { r.start(); } catch (e) {} } }, 150); } };
    try { r.start(); } catch (e) { return null; }
    return { stop: function () { active = false; try { r.onend = null; r.onresult = null; r.onerror = null; r.abort ? r.abort() : r.stop(); } catch (e) {} } };
  }

  /* ===== الصوت: عبارة الطلب (تسجيل أو نطق المتصفح) وتلاوة الشيخ المنشاوي ===== */
  var AU = null, ACX = null;
  function playSrc(src, maxMs) {
    return new Promise(function (res) {
      var d = false, f = function (v) { if (!d) { d = true; res(v); } };
      AU.onended = function () { f(true); }; AU.onerror = function () { f(false); };
      AU.src = src;
      var p = AU.play(); if (p && p.catch) p.catch(function () { f(false); });
      setTimeout(function () { f(false); }, maxMs || 120000);
    });
  }
  function play(k) { return playSrc(AUDIO + pad3(D.s[k]) + pad3(D.a[k]) + ".mp3"); }
  function silence() { try { if (AU) { AU.onended = null; AU.onerror = null; AU.pause(); } } catch (e) {} }
  /* صافرة الخطأ: نفسها صافرة المسمّع الآلي */
  function ac() {
    try { var a = (G.MusammiAC && G.MusammiAC()) || ACX || (ACX = new (G.AudioContext || G.webkitAudioContext)()); ACX = a; if (a.state === "suspended") a.resume(); return a; } catch (e) { return null; }
  }
  var BEEPT = 0;
  function beep() {
    var n = Date.now(); if (n - BEEPT < 600) return; BEEPT = n;
    try {
      var a = ac(); if (!a) return;
      var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(140, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .34);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .36);
    } catch (e) {}
  }

  /* ===== الجلسة ===== */
  var SID = 0, T = null, CUR = null;
  var dead = function (sid) { return sid !== SID || !T; };

  var GAPEM = .36;   /* المسافة الثابتة بين الكلمات في كل الأسطر (بالـ em) */
  var CSS = "#t-test .ik-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}" +
    "#t-test .ik-st{font-weight:700;margin:12px 0 4px;min-height:1.8em}" +
    "#t-test .ik-ay{font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:clamp(28px,7.5vw,40px);line-height:2.4;text-align:center;min-height:3em;padding:6px 4px}" +
    "#t-test .ikw{display:inline-block;margin:.1em .3em;padding:0 .45em;line-height:1.75;border-radius:.4em;transition:background .35s,color .35s,box-shadow .35s}" +
    "#t-test .ikw:not(.on){color:transparent;background:var(--acc2);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--acc) 38%,transparent);text-shadow:none;user-select:none}" +
    "#t-test .ikw:not(.on).nx{animation:ikNx 1.4s ease-in-out infinite}" +
    "@keyframes ikNx{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}50%{box-shadow:0 0 0 2px rgba(212,160,23,.7)}}" +
    "#t-test .ikw.on{animation:ikIn .6s cubic-bezier(.22,1.25,.36,1) both}" +
    "@keyframes ikIn{0%{opacity:0;transform:translateY(7px) scale(.82);filter:blur(3px) drop-shadow(0 0 0 rgba(212,160,23,0))}55%{opacity:1;filter:blur(0) drop-shadow(0 0 7px rgba(212,160,23,.75))}100%{opacity:1;transform:none;filter:none}}" +
    "#t-test .ik-ay.ok .ikw.on{color:var(--ok)}" +
    "#t-test .ikw.mk{padding:0 2px;font-size:.8em;opacity:.8}" +
    "#t-test .ikw.on.x{color:#d93025;background:rgba(217,48,37,.14);box-shadow:0 0 0 1.5px rgba(217,48,37,.6)}" +
    "@media(prefers-reduced-motion:reduce){#t-test .ikw.on,#t-test .ikw:not(.on).nx{animation:none}#t-test .ikq .ikg.on i,#t-test .ikq .ikg:not(.on).nx{animation:none}}" +
    "#t-test .ik-ay.mq{font-size:inherit;line-height:normal;text-align:initial;max-height:none;overflow:visible;min-height:0;padding:0}" +
    "#t-test .ik-ay.mq.ok .mushaf-frame{border-color:var(--ok)}#t-test .ik-ay.mq.bad .mushaf-frame{border-color:#d93025}" +
    "#t-test .ikq .qline{justify-content:center!important;column-gap:" + GAPEM + "em!important}" +
    "#t-test .ikq .ikg{display:block;line-height:1.6;padding:.05em .12em;border-radius:.22em;transition:background .35s,box-shadow .35s}" +
    "#t-test .ikq .ikg.off{display:none}" +
    "#t-test .ikq.rf{display:flex;flex-wrap:wrap;justify-content:center;align-content:flex-start;direction:rtl;column-gap:" + GAPEM + "em;row-gap:.35em}" +
    "#t-test .ikq.rf .qline{display:contents!important}" +
    "#t-test .ikq .ikg i{display:block;font-style:normal}" +
    "#t-test .ikq .ikg:not(.on):not(.off){background:var(--acc2);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--acc) 38%,transparent)}#t-test .ikq .ikg:not(.on) i{opacity:0}" +
    "#t-test .ikq .ikg:not(.on).nx{animation:ikNx 1.4s ease-in-out infinite}" +
    "#t-test .ikq .ikg.on i{animation:ikIn .6s cubic-bezier(.22,1.25,.36,1) both}" +
    "#t-test .ikq .ikg.on.x{background:rgba(217,48,37,.16);box-shadow:0 0 0 1.5px rgba(217,48,37,.65)}" +
    "#t-test .ik-tm{margin-top:10px;height:8px}" +
    "#t-test .ik-row{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}" +
    "#t-test .ik-row:last-child{border-bottom:0}" +
    "#t-test .ik-no{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;background:var(--ok)}" +
    "#t-test .ik-row.bad .ik-no{background:#d93025}" +
    "#t-test .ik-ft{display:flex;flex-wrap:wrap;column-gap:10px}#t-test .ik-ft>div{flex:1 1 190px;min-width:0}#t-test .ik-ft select,#t-test .ik-ft input{width:100%}" +
    "#t-test #ikScope{flex-wrap:nowrap}#t-test #ikScope button{flex:1 1 auto;min-width:0;padding:6px 2px;white-space:nowrap;font-size:14px}" +
    "#t-test .ik-ex{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#t-test .ik-ex button{font-size:14px}" +
    "#t-test .ik-big{font-size:44px;font-weight:800;text-align:center;line-height:1.3;margin:6px 0}";
  function css() { if ($("ikCss")) return; var s = document.createElement("style"); s.id = "ikCss"; s.textContent = CSS; document.head.appendChild(s); }

  var root = function () { return $("t-test"); };
  function setSt(t) { var e = $("ikSt"); if (e) e.textContent = t; }
  function setBar(id, pct) { var e = $(id); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + "%"; }

  function field(id, label, t, v) {
    var h = "", i;
    if (t === "p") h = '<input type="number" inputmode="numeric" min="1" max="604" id="' + id + '" value="' + v + '">';
    else { for (i = 1; i <= maxOf(t); i++) h += '<option value="' + i + '"' + (i === v ? " selected" : "") + ">" + esc((t === "s" ? AR(i) + ". " : "") + unitName(t, i)) + "</option>"; h = '<select id="' + id + '">' + h + "</select>"; }
    return '<div><label for="' + id + '">' + label + "</label>" + h + "</div>";
  }
  function scopeHTML() {
    var t = CFG.sc, h = '<label>على ماذا تريد الاختبار؟</label><div class="seg" id="ikScope">', r, w;
    [["mine", "كل محفوظي"], ["s", "سور"], ["j", "أجزاء"], ["h", "أحزاب"], ["p", "صفحات"]].forEach(function (x) { h += '<button data-sc="' + x[0] + '" aria-pressed="' + (t === x[0]) + '">' + x[1] + "</button>"; });
    h += "</div>";
    if (t === "mine") return h;
    r = CFG.rg[t]; w = { s: "سورة", j: "جزء", h: "حزب", p: "صفحة" }[t];
    h += '<div class="ik-ft">' + field("ikA", "من " + w, t, r[0]) + field("ikB", "إلى " + w, t, r[1]) + "</div>" +
      '<p class="sub">لاختيار ' + { s: "سورة واحدة", j: "جزء واحد", h: "حزب واحد", p: "صفحة واحدة" }[t] + " اجعل «من» و«إلى» متماثلين.</p>";
    if (CFG.ex.length) h += '<div class="ik-ex">' + CFG.ex.map(function (x, i) { return '<button data-ex="' + i + '" aria-label="حذف ' + esc(rangeLabel(x)) + '">' + esc(rangeLabel(x)) + " ✕</button>"; }).join("") + "</div>";
    return h + '<div class="row"><button id="ikAdd">＋ أضف هذا النطاق واختر غيره</button></div>';
  }
  /* ملخّص النطاق تحت الاختيار، وتفعيل زر البدء */
  function paintScope() {
    var R = scopeRange(), e = $("ikSum"), go = $("ikGo"); if (go) go.disabled = !R; if (!e) return;
    e.className = R ? "sub" : "warn";
    if (CFG.sc === "mine") e.textContent = R ? "من محفوظك: " + (G.MPlan && G.MPlan.summary ? G.MPlan.summary() : AR(R.pages) + " صفحة") + "." : "حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي»، أو اختر سورًا أو أجزاءً أو أحزابًا أو صفحات.";
    else e.textContent = R ? "ستُختبر في: " + chosen().map(rangeLabel).join("، ") + " (عدد الآيات: " + AR(R.list.length) + ")." : "لا توجد آيات كاملة في هذا النطاق.";
  }
  function renderScope() { var e = $("ikScBox"); if (e) { e.innerHTML = scopeHTML(); paintScope(); } }
  /* تغيير «من» أو «إلى»: يبقى النطاق صحيحًا، واختيار «من» وحده لنطاق مفرد ينقل «إلى» معه */
  function setRange(which, v) {
    var t = CFG.sc, r = CFG.rg[t]; if (!r) return;
    v = Math.round(+v); v = v >= 1 ? Math.min(maxOf(t), v) : r[which];
    if (which === 0) { if (r[1] === r[0] || r[1] < v) r[1] = v; r[0] = v; }
    else { r[1] = v; if (r[0] > v) r[0] = v; }
    $("ikA").value = r[0]; $("ikB").value = r[1]; saveCfg(); paintScope();
  }

  function renderSetup(msg) {
    css(); var el = root(); if (!el) return;
    var seg1 = "", seg2 = "", i, cl = ["آية", "آيتان", "٣ آيات", "٤ آيات", "٥ آيات"], pm = CFG.m === "page";
    for (i = 5; i <= 10; i++) seg1 += '<button data-n="' + i + '" aria-pressed="' + (CFG.n === i) + '">' + AR(i) + "</button>";
    for (i = 1; i <= 5; i++) seg2 += '<button data-c="' + i + '" aria-pressed="' + (CFG.c === i) + '">' + cl[i - 1] + "</button>";
    el.innerHTML = '<div class="card"><h2>اختباري</h2>' +
      '<p class="sub">تُتلى عليك آية بصوت الشيخ محمد صديق المنشاوي، ثم ' + gn("أكمل", "أكملي") + ' ما بعدها من حفظك، الآيات التالية كلها دفعة واحدة، فإن أصبتَ ظهرت كلها، ثم تأتي آية جديدة.</p>' +
      (msg ? '<p class="warn" role="alert">' + esc(msg) + "</p>" : "") +
      (D ? '<div id="ikScBox">' + scopeHTML() + '</div><p id="ikSum" role="status"></p>' : "") +
      '<label>عدد الاختبارات</label><div class="seg" id="ikN">' + seg1 + "</div>" +
      '<label>نطاق الإكمال بعد الآية</label><div class="seg" id="ikM"><button data-m="count" aria-pressed="' + !pm + '">عدد من الآيات</button><button data-m="page" aria-pressed="' + pm + '">إلى آخر الصفحة</button></div>' +
      '<div id="ikCBox"' + (pm ? ' class="hide"' : "") + '><label>عدد الآيات المطلوب إكمالها دفعة واحدة</label><div class="seg" id="ikC">' + seg2 + "</div></div>" +
      '<div class="row"><button class="p" id="ikGo" disabled>ابدأ الاختبار</button></div>' +
      '<p class="sub" style="margin-top:10px">يحتاج اتصالًا بالإنترنت وإذن الميكروفون.</p></div>';
    if (D) paintScope();
  }

  function renderRun() {
    css();
    root().innerHTML = '<div class="card"><div class="ik-top"><b id="ikNo"></b><span class="sub" id="ikSc"></span></div>' +
      '<div class="bar"><i id="ikPg" style="width:0"></i></div>' +
      '<p class="ik-st" id="ikSt" role="status" aria-live="polite"></p>' +
      '<div class="ik-ay" id="ikAy" dir="rtl"></div>' +
      '<div class="bar ik-tm"><i id="ikTm" style="width:0"></i></div>' +
      '<div class="row"><button id="ikSk">لا أعرف</button><button id="ikQt">إنهاء الاختبار</button></div></div>';
  }

  /* ===== عرض الآيات بشكل المصحف: خط الصفحة (QPC) وأسطرها وألوان التجويد وعلامة رقم الآية ===== */
  var PALI = { lazim: [3], wajib: [9], jawaz: [4], madd2: [5], ghunna: [6], gray: [1, 2, 15], tafkhim: [7], qalqala: [8] }, FFC = {};
  function fontOf(pg, cb) {
    if (typeof G.tjFont === "function") { try { return G.tjFont(pg, cb); } catch (e) {} }
    var st = FFC[pg]; if (st === 1) return cb(true); if (st && st.push) { st.push(cb); return; }
    FFC[pg] = [cb];
    function fin(ok) { var q = FFC[pg]; FFC[pg] = ok ? 1 : null; q.forEach(function (f) { f(ok); }); }
    fetch(new URL("fonts/p" + pad3(pg) + ".woff", location.href).href).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (b) { var ff = new FontFace("QPC" + pg, b); return ff.load().then(function () { document.fonts.add(ff); fin(true); }); })
      .catch(function () { fin(false); });
  }
  function fonts(pgs) {
    return Promise.all(pgs.map(function (p) { return new Promise(function (r) { fontOf(p, r); }); })).then(function (a) {
      return a.every(Boolean);
    });
  }
  function pagesFor(k1, cnt) {
    var out = [], p; if (!D) return out;
    for (p = D.pw[D.as[k1]]; p <= D.pw[D.ae[k1 + cnt - 1] - 1]; p++) out.push(p);
    return out;
  }
  function wordAy() {   /* رقم الآية لكل كلمة في المصحف */
    if (D.wa) return D.wa;
    var wa = new Uint16Array(D.V.W.length), k, w;
    for (k = 0; k < D.as.length; k++) for (w = D.as[k]; w < D.ae[k]; w++) wa[w] = k;
    return (D.wa = wa);
  }
  function palette(pgs, ref) {
    var rs = getComputedStyle(ref), ink = rs.getPropertyValue("--ink").trim() || "#111", map = { 0: ink }, oc = [], css = "", r, i, col, st = $("ikPal"),
      plain = !!(G.tjState && G.tjState.hideColors);
    for (r in PALI) { col = plain ? ink : (rs.getPropertyValue("--tj-" + r).trim() || ink); PALI[r].forEach(function (ix) { map[ix] = col; }); }
    for (i in map) oc.push(i + " " + map[i]);
    pgs.forEach(function (p) { css += "@font-palette-values --ikq" + p + "{font-family:QPC" + p + ";base-palette:0;override-colors:" + oc.join(",") + "}"; });
    if (!st) { st = document.createElement("style"); st.id = "ikPal"; document.head.appendChild(st); }
    st.textContent = css;
  }
  /* ملاءمة عرض أطول سطر لعرض الصفحة (كما في المصحف) ثم إخفاء الأسطر التي لا تخص الأسئلة */
  function fit(tx) {
    if (!tx || !tx.isConnected) return;
    var cs = getComputedStyle(tx), W = tx.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), mx = 0, lines = tx.querySelectorAll(".qline");
    if (W <= 0) return;
    tx.classList.remove("rf");
    [].forEach.call(lines, function (l) { l.style.display = ""; });
    tx.style.fontSize = "40px";
    [].forEach.call(lines, function (l) {
      var w = 0, n = 0; [].forEach.call(l.querySelectorAll(".qw:not(.off)"), function (x) { w += x.getBoundingClientRect().width; n++; });
      if (n) { w += (n - 1) * GAPEM * 40; if (w > mx) mx = w; }
    });
    var fs = mx ? Math.min(40 * W / mx, 84) : 40;
    tx.style.fontSize = fs.toFixed(2) + "px";
    /* حارس: إن بقي سطر أعرض من الصفحة (قياس بخط غير فعّال بعد) صغّر الخط حتى يتسع */
    var t = 0, over;
    while (t++ < 4) {
      over = 0; [].forEach.call(lines, function (l) { var r = l.scrollWidth / Math.max(1, l.clientWidth); if (r > over) over = r; });
      if (over <= 1.005) break;
      fs = fs / over * .99; tx.style.fontSize = fs.toFixed(2) + "px";
    }
    /* المقطع الطويل (أسطر كثيرة) يصغّر خط الأسطر المصحفية: نكتفي بحجم مقروء ونُسيل الكلمات على أسطر جديدة بدل التصغير */
    var target = Math.max(30, Math.min(44, W / 9.5));
    if (fs < target) { tx.classList.add("rf"); tx.style.fontSize = target.toFixed(2) + "px"; }
    [].forEach.call(lines, function (l) { if (l.getAttribute("data-r") !== "1") l.style.display = "none"; });
  }
  /* لا يُقاس الخط إلا بعد أن يصبح خط الصفحة فعّالًا، وإلا يُقاس بخط بديل أضيق فيخرج النص كبيرًا ومتداخلًا */
  function fitSoon(tx, pgs) {
    fit(tx);
    try {
      Promise.all(pgs.map(function (p) { return document.fonts.load("40px QPC" + p, "\uFB50"); })).then(function () { fit(tx); }, function () {});
      document.fonts.ready.then(function () { fit(tx); });
      if (window.ResizeObserver) { var w = tx.clientWidth; new ResizeObserver(function () { if (Math.abs(tx.clientWidth - w) > 1) { w = tx.clientWidth; fit(tx); } }).observe(tx); }
    } catch (e) {}
    setTimeout(function () { fit(tx); }, 150); setTimeout(function () { fit(tx); }, 700); setTimeout(function () { fit(tx); }, 1800);
  }
  /* العرض المصحفي: كل كلمة تقابلها كلمة من خط الصفحة، وتنكشف بحسب تقدّم القارئ */
  function mushView(P, k1, cnt, box, pgs) {
    var V = D.V, wa = wordAy(), items = [], h = "", dsp = [], tx;
    P.ends.forEach(function (e, ix) {
      var off = ix ? P.ends[ix - 1] : 0;
      dsp.push(P.disp.filter(function (x) { return !x.mark && x.a >= off && x.b <= e; }));
    });
    pgs.forEach(function (pg) {
      var L = V.L[pg - 1], id = D.pst[pg - 1], mxw = Math.max.apply(null, L);
      L.forEach(function (v) {
        if (v <= 0) return;
        var end = id + v, last = end - 1, kl = wa[last], inr = false, row = "", w, k, g, j, ix, d, m, isM, on, center;
        for (w = id; w < end; w++) {
          k = wa[w]; isM = w === D.ae[k] - 1; on = k >= k1 && k < k1 + cnt;
          if (!on) { row += '<span class="qw ikg off"><i>' + V.W[w] + "</i></span>"; continue; }
          inr = true; ix = k - k1; d = dsp[ix];
          if (isM) items.push({ thr: P.ends[ix], a: 0, b: 0, mark: true });
          else {
            if (!d.length) throw new Error("no words");
            g = D.ae[k] - D.as[k] - 1; j = w - D.as[k];
            m = d.length === g ? j : Math.min(d.length - 1, Math.floor((j + .5) * d.length / g));
            items.push({ thr: d[m].b, a: d[m].a, b: d[m].b, mark: false });
          }
          row += '<span class="qw ikg' + (isM ? " aya-num" : "") + '" data-q="' + (items.length - 1) + '"><i>' + V.W[w] + "</i></span>";
        }
        center = pg < 3 || (D.ae[kl] - 1 === last && D.a[kl] === V.SU[D.s[kl] - 1] && v <= mxw * .6);
        h += '<div class="qline' + (center ? " c" : "") + '" data-r="' + (inr ? 1 : 0) + '" style="font-family:QPC' + pg + ",'Amiri Quran',serif;font-palette:--ikq" + pg + '">' + row + "</div>";
        id = end;
      });
    });
    box.className = "ik-ay mq";
    box.innerHTML = '<div class="mushaf-sheet"><div class="mushaf-frame"><div class="mushaf-text ikq">' + h + "</div></div></div>";
    tx = box.querySelector(".ikq");
    [].forEach.call(tx.querySelectorAll("[data-q]"), function (e) { items[+e.getAttribute("data-q")].el = e; });
    palette(pgs, tx); fitSoon(tx, pgs);
    return items;
  }
  /* الاحتياط إن تعذّر خط الصفحة: النص العادي */
  function build(P) {
    return P.disp.map(function (w, i) { return '<span class="ikw' + (w.mark ? " mk" : "") + '" data-i="' + i + '">' + esc(w.raw) + "</span>"; }).join(" ");
  }
  function textView(P, box) {
    box.className = "ik-ay"; box.innerHTML = build(P);
    var els = box.querySelectorAll(".ikw");
    return P.disp.map(function (w, i) { return { el: els[i], thr: w.b, a: w.a, b: w.b, mark: !!w.mark }; });
  }
  /* يُعرض المطلوب فورًا: بشكل المصحف إن كانت خطوط الصفحات جاهزة، وإلا نصًا عاديًا يتحوّل إلى شكل المصحف حين تُحمَّل الخطوط (دون فقد ما كُشف) */
  function showView(P, k1, cnt) {
    var box = $("ikAy"); if (!box) return Promise.resolve([]);
    var pgs = pagesFor(k1, cnt), items = [], ready = fonts(pgs);
    function put(arr) { items.length = 0; Array.prototype.push.apply(items, arr); }
    return Promise.race([ready, wait(1200).then(function () { return "late"; })]).then(function (r) {
      box = $("ikAy"); if (!box) return items;
      if (r === true && D) { try { put(mushView(P, k1, cnt, box, pgs)); return items; } catch (e) {} }
      put(textView(P, box));
      if (r === "late" && D) ready.then(function (ok) {
        var b = $("ikAy"); if (!ok || !b || b.classList.contains("ok") || b.classList.contains("bad")) return;
        try { put(mushView(P, k1, cnt, b, pgs)); if (items.onSwap) items.onSwap(); } catch (e) {}
      });
      return items;
    });
  }
  function paint(items, eng, mark, box) {
    var i, j, it, first = -1, bad;
    for (i = 0; i < items.length; i++) {
      it = items[i]; if (!it.el) continue;
      if (it.thr <= eng.p && !it.el.classList.contains("on")) it.el.classList.add("on");
      if (first < 0 && it.thr > eng.p && !it.mark) first = i;
      if (!it.mark && it.el.classList.contains("on") && !it.el.classList.contains("x")) { bad = false; for (j = it.a; j < it.b; j++) if (mark[j] === 2) bad = true; if (bad) it.el.classList.add("x"); }
    }
    [].forEach.call(box.querySelectorAll(".nx"), function (e) { e.classList.remove("nx"); });
    if (first >= 0) { items[first].el.classList.add("nx"); try { var rc = items[first].el.getBoundingClientRect(); if (rc.top < 110 || rc.bottom > (window.innerHeight || 700) - 150) items[first].el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} }
  }
  /* عند الانتهاء: تُكشف الكلمات الباقية تباعًا (بالأحمر إن أخطأ) */
  function revealRest(items, box, ok) {
    var d = 0;
    [].forEach.call(box.querySelectorAll(".nx"), function (e) { e.classList.remove("nx"); });
    items.forEach(function (it) {
      if (!it.el || it.el.classList.contains("on")) return;
      (it.el.firstElementChild && it.el.classList.contains("ikg") ? it.el.firstElementChild : it.el).style.animationDelay = Math.min(d * 70, 1400) + "ms"; d++;
      it.el.classList.add("on"); if (!ok && !it.mark) it.el.classList.add("x");
    });
  }

  /* فرصة القارئ لإكمال آية: تُرجع true إن أكملها صحيحة. الإصغاء والمطابقة كلمةً كلمة بمحرّك المسمّع الآلي نفسه */
  function chance(sid, keys, label, k1) {
    var P0 = prepMulti(keys);
    setSt("🎤 " + label);
    return showView(P0, k1, keys.length).then(function (items) {
      if (dead(sid)) return { ok: false, done: 0 };
      return chanceRun(sid, keys, label, P0, items);
    });
  }
  function chanceRun(sid, keys, label, P, items) {
    return new Promise(function (resolve) {
      var n = P.E.length, allow = allowed(n), start = Date.now(), lim = Math.min(300000, 15000 + 1500 * n),
        lastT = Date.now(), seen = false, done = false, rec = null, iv = null, mark = [], core = C(), eng = new core.Engine(P.EO, { start: 0 });
      var box = $("ikAy"); paint(items, eng, mark, box);
      items.onSwap = function () { if (!done) paint(items, eng, mark, $("ikAy")); };
      function good() { return eng.p >= n && eng.err <= allow; }
      function finish(ok) {
        if (done) return; done = true; clearInterval(iv); if (rec) rec.stop(); CUR = null;
        if (!dead(sid)) { box.classList.remove("ok", "bad"); box.classList.add(ok ? "ok" : "bad"); revealRest(items, box, ok); }
        resolve({ ok: ok, done: ok ? keys.length : P.ends.filter(function (e) { return e <= eng.p; }).length });
      }
      CUR = { finish: finish };
      rec = listen(function (T0, from, fin) {
        if (done) return { used: 0 };
        var out = eng.feed(T0, from, fin);
        if (T0.length > from) { seen = true; lastT = Date.now(); }
        out.ev.forEach(function (v) { mark[v.i] = v.ok ? 1 : 2; if (!v.ok) beep(); });
        paint(items, eng, mark, box);
        if (eng.done) finish(good());
        return out;
      }, function (err) {
        T && (T.fatal = err === "not-allowed" || err === "service-not-allowed" ? "اسمح للموقع باستخدام الميكروفون ثم أعد المحاولة."
          : "تعذّر التعرّف الصوتي. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.");
        finish(false);
      });
      if (!rec) { T && (T.fatal = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome أو Edge أو Safari."); return finish(false); }
      iv = setInterval(function () {
        var el = Date.now() - start; setBar("ikTm", 100 - el / lim * 100);
        if (el > lim || (seen && Date.now() - lastT > (n > 40 ? 7000 : 5500))) finish(good());
      }, 250);
    });
  }

  async function runTest(sid, i) {
    var pr = T.prompts[i], keys = [], d, res, done, pass, failK;
    $("ikNo").textContent = "الاختبار " + AR(i + 1) + " من " + AR(T.prompts.length);
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i);
    setBar("ikPg", i / T.prompts.length * 100); setBar("ikTm", 0);
    $("ikAy").className = "ik-ay"; $("ikAy").innerHTML = "";
    setSt("🎧 " + gn("استمع", "استمعي") + " إلى الآية…");
    fonts(pagesFor(pr.k + 1, pr.len)).catch(function () {});   /* تجهيز خطوط الصفحات أثناء تلاوة الآية */
    var heard = await play(pr.k); if (dead(sid)) return;
    if (!heard) {   /* تعذّر الصوت: نعرض نص الآية ليستمر الاختبار */
      setSt("تعذّر تشغيل الصوت، هذه هي الآية:");
      var pi = await showView(prepMulti([keyOf(pr.k)]), pr.k, 1); if (dead(sid)) return;
      pi.forEach(function (it) { if (it.el) it.el.classList.add("on"); }); $("ikAy").classList.add("ok");
      await wait(4500); if (dead(sid)) return;
    }
    for (d = 1; d <= pr.len; d++) keys.push(keyOf(pr.k + d));
    /* الآيات التالية كلها دفعة واحدة، لا آية آية */
    res = await chance(sid, keys, pr.len > 1 ? gn("أكمل", "أكملي") + " الآيات التي بعدها كلها (" + (pr.len === 2 ? "آيتان" : AR(pr.len) + (pr.len > 10 ? " آية" : " آيات")) + ") دفعة واحدة" : gn("أكمل", "أكملي") + " الآية التي بعدها", pr.k + 1);
    if (dead(sid) || T.fatal) return;
    done = res.done; pass = res.ok;
    T.res.push({ k: pr.k, len: pr.len, done: done, ok: pass });
    if (pass) { T.score++; setSt("✓ " + gn("أحسنتَ", "أحسنتِ") + "! " + gn("أتممتَ", "أتممتِ") + " الاختبار"); }
    else {
      setSt("✗ هذه هي الآية الصحيحة، " + gn("استمع", "استمعي") + " إليها");
      failK = pr.k + 1 + Math.min(done, pr.len - 1);
      await play(failK); if (dead(sid)) return;
    }
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i + 1);
    await wait(1200);
  }

  async function runSession() {
    var sid = ++SID;
    for (var i = 0; i < T.prompts.length; i++) {
      await runTest(sid, i);
      if (dead(sid)) return;
      if (T.fatal) { var m = T.fatal; endSession(); return renderSetup(m); }
    }
    renderSummary();
    silence(); T = null;
  }

  function endSession() { SID++; silence(); if (CUR) { var c = CUR; CUR = null; c.finish(false); } T = null; }

  function renderSummary() {
    var r = T.res, n = r.length, sc = T.score, rows = r.map(function (x, i) {
      var k = x.k;
      return '<div class="ik-row' + (x.ok ? "" : " bad") + '"><span class="ik-no">' + (x.ok ? "✓" : "✗") + "</span><div><b>سورة " + esc(sName(D.s[k])) + " — الآية " + AR(D.a[k]) + "</b><br><span class=\"sub\">صفحة " + AR(pageOf(k)) + " · " + gn("أكملتَ", "أكملتِ") + " " + AR(x.done) + " من " + AR(x.len) + " آيات</span></div></div>";
    }).join("");
    var pc = n ? sc / n : 0, msg = pc === 1 ? "ما شاء الله! حفظ متقن." : (pc >= .7 ? "ممتاز، حفظك جيد. راجع المواضع المعلّمة." : "تحتاج مراجعة أكثر للمواضع المعلّمة، وفقك الله.");
    root().innerHTML = '<div class="card"><h2>نتيجة الاختبار</h2><div class="ik-big">' + AR(sc) + " / " + AR(n) + '</div><p class="sub" style="text-align:center">' + msg + "</p>" +
      '<div style="margin-top:10px">' + rows + "</div>" +
      '<div class="row"><button class="p" id="ikAgain">اختبار جديد</button><button id="ikBack">تغيير الإعدادات</button></div></div>';
  }

  function start() {
    if (!navigator.onLine) return renderSetup("يحتاج الاختبار اتصالًا بالإنترنت. اتصل ثم أعد المحاولة.");
    var R = scopeRange(); if (!R) return renderSetup(CFG.sc === "mine" ? "حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي»." : "لا توجد آيات كاملة في هذا النطاق.");
    /* تهيئة الصوت داخل نقرة المستخدم (تشترطه بعض المتصفحات) */
    if (!AU) AU = new Audio();
    try { AU.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; var pp = AU.play(); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {}
    ac();   /* تهيئة صافرة الخطأ داخل النقرة */
    if (!C()) return renderSetup("تعذّر تحميل محرّك الإصغاء. أعد فتح التطبيق ثم حاول مجددًا.");
    loadText(function (ok) {
      if (!ok) return renderSetup("ملف النص غير موجود: ضع data/quran-text.json.");
      var pr = pick(CFG.n, CFG.c, R, CFG.m);
      if (!pr.length) return renderSetup(CFG.sc === "mine" ? "محفوظك قليل لإجراء اختبار. أضف صفحات أكثر ثم أعد المحاولة." : "النطاق المختار قصير جدًا لإجراء اختبار. وسّعه ثم أعد المحاولة.");
      T = { prompts: pr, res: [], score: 0, fatal: "" };
      renderRun(); runSession();
    });
  }

  /* ===== الأحداث ===== */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#t-test button"); if (!b) return;
    if (b.dataset.n) { CFG.n = +b.dataset.n; saveCfg(); [].forEach.call($("ikN").children, function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.dataset.m) { CFG.m = b.dataset.m === "page" ? "page" : "count"; saveCfg(); [].forEach.call($("ikM").children, function (x) { x.setAttribute("aria-pressed", x === b); }); $("ikCBox").classList.toggle("hide", CFG.m === "page"); return; }
    if (b.dataset.c) { CFG.c = +b.dataset.c; saveCfg(); [].forEach.call($("ikC").children, function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.dataset.sc) { CFG.sc = b.dataset.sc; saveCfg(); return renderScope(); }
    if (b.dataset.ex) { CFG.ex.splice(+b.dataset.ex, 1); saveCfg(); return renderScope(); }
    if (b.id === "ikAdd") { CFG.ex = chosen(); saveCfg(); return renderScope(); }
    if (b.id === "ikGo" || b.id === "ikAgain") return start();
    if (b.id === "ikBack") return renderSetup();
    if (b.id === "ikSk") { if (CUR) CUR.finish(false); return; }
    if (b.id === "ikQt") { endSession(); return renderSetup(); }
  });

  document.addEventListener("change", function (e) {
    var id = e.target && e.target.id;
    if ((id === "ikA" || id === "ikB") && e.target.closest("#t-test")) setRange(id === "ikA" ? 0 : 1, e.target.value);
  });

  G.Ikhtibar = {
    open: function () { if (!D) D = buildMap(); if (!T) renderSetup(D ? "" : "تعذّر تحميل بيانات المصحف."); },
    leave: function () { if (T) { endSession(); renderSetup(); } },
    _t: { state: function () { return T; }, prep: prep, prepMulti: prepMulti, pick: pick, buildMap: function () { D = buildMap(); return D; }, memRange: memRange, scopeRange: scopeRange, span: span, cfg: CFG, HIZB: HIZB, setText: function (q) { Q = q; }, pageOf: pageOf, keyOf: keyOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
