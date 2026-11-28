/* اختباري — اختبار المحفوظ.
   تُتلى آية بصوت الشيخ محمد صديق المنشاوي (مرتّل)، ثم تبدأ فرصة القارئ ليكمل ما بعدها.
   يُكمل القارئ الآيات التالية كلها دفعة واحدة (عددًا محدّدًا من ١ إلى ٥، أو إلى آخر الصفحة)، ثم تأتي آية جديدة، وهكذا.
   الآيات تُختار عشوائيًا من الصفحات المحفوظة (أجزاء كاملة أو صفحات متفرقة، من خطة المستخدم).
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
  try { var sv = JSON.parse(localStorage.getItem("ikCfg") || "null"); if (sv && sv.n >= 5 && sv.n <= 10 && sv.c >= 1 && sv.c <= 5) CFG = { n: sv.n, c: sv.c, m: sv.m === "page" ? "page" : "count" }; } catch (e) {}
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
  function pageOf(k) { return D.pw[D.as[k]] || 0; }
  function keyOf(k) { return D.s[k] + ":" + D.a[k]; }
  function sName(s) { return String(D.V.NM[s - 1] || "").replace(/^سُورَةُ\s*/, "") || ("سورة " + AR(s)); }
  var pad3 = function (n) { return ("00" + n).slice(-3); };

  /* اختيار آيات الأسئلة: كل سؤال آية تتبعها آيات من السورة نفسها داخل المحفوظ:
     عددًا محدّدًا (c)، أو (mode = page) كل الآيات التي تبدأ في صفحة الآية حتى آخر الصفحة */
  function pick(n, c, R, mode) {
    var out = [], used = {}, tries = 0, k, len, j, clash, page = mode === "page", lim = page ? 60 : c;
    while (out.length < n && tries < 1200) {
      tries++;
      k = R.list[Math.floor(Math.random() * R.list.length)];
      len = 0;
      while (len < lim && k + len + 1 < D.as.length && R.ok[k + len + 1] && D.s[k + len + 1] === D.s[k] && (!page || pageOf(k + len + 1) === pageOf(k))) len++;
      if (len < 1 || (tries < 600 && (page ? len < 2 : len < c))) continue;   /* نفضّل السلسلة الكاملة أولًا */
      clash = false; for (j = k; j <= k + len; j++) if (used[j]) clash = true;
      if (clash && tries < 900) continue;                                        /* ثم نسمح بالتداخل إن ضاق المحفوظ */
      for (j = k; j <= k + len; j++) used[j] = 1;
      out.push({ k: k, len: len });
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

  var CSS = "#t-test .ik-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}" +
    "#t-test .ik-st{font-weight:700;margin:12px 0 4px;min-height:1.8em}" +
    "#t-test .ik-ay{font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:26px;line-height:2.6;text-align:justify;min-height:3em;padding:6px 4px}" +
    "#t-test .ikw{display:inline-block;margin:0 3px;padding:0 6px;border-radius:8px;transition:background .35s,color .35s,box-shadow .35s}" +
    "#t-test .ikw:not(.on){color:transparent;background:var(--acc2);text-shadow:none;user-select:none}" +
    "#t-test .ikw:not(.on).nx{animation:ikNx 1.4s ease-in-out infinite}" +
    "@keyframes ikNx{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}50%{box-shadow:0 0 0 2px rgba(212,160,23,.7)}}" +
    "#t-test .ikw.on{animation:ikIn .6s cubic-bezier(.22,1.25,.36,1) both}" +
    "@keyframes ikIn{0%{opacity:0;transform:translateY(7px) scale(.82);filter:blur(3px) drop-shadow(0 0 0 rgba(212,160,23,0))}55%{opacity:1;filter:blur(0) drop-shadow(0 0 7px rgba(212,160,23,.75))}100%{opacity:1;transform:none;filter:none}}" +
    "#t-test .ik-ay.ok .ikw.on{color:var(--ok)}" +
    "#t-test .ikw.mk{padding:0 2px;font-size:.8em;opacity:.8}#t-test .ik-ay{max-height:55vh;overflow:auto}" +
    "#t-test .ikw.on.x{color:#d93025;background:rgba(217,48,37,.14);box-shadow:0 0 0 1.5px rgba(217,48,37,.6)}" +
    "@media(prefers-reduced-motion:reduce){#t-test .ikw.on,#t-test .ikw:not(.on).nx{animation:none}}" +
    "#t-test .ik-tm{margin-top:10px;height:8px}" +
    "#t-test .ik-row{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}" +
    "#t-test .ik-row:last-child{border-bottom:0}" +
    "#t-test .ik-no{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;background:var(--ok)}" +
    "#t-test .ik-row.bad .ik-no{background:#d93025}" +
    "#t-test .ik-big{font-size:44px;font-weight:800;text-align:center;line-height:1.3;margin:6px 0}";
  function css() { if ($("ikCss")) return; var s = document.createElement("style"); s.id = "ikCss"; s.textContent = CSS; document.head.appendChild(s); }

  var root = function () { return $("t-test"); };
  function setSt(t) { var e = $("ikSt"); if (e) e.textContent = t; }
  function setBar(id, pct) { var e = $(id); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + "%"; }

  function renderSetup(msg) {
    css(); var el = root(); if (!el) return;
    var R = D && memRange(), seg1 = "", seg2 = "", i, cl = ["آية", "آيتان", "٣ آيات", "٤ آيات", "٥ آيات"], pm = CFG.m === "page";
    for (i = 5; i <= 10; i++) seg1 += '<button data-n="' + i + '" aria-pressed="' + (CFG.n === i) + '">' + AR(i) + "</button>";
    for (i = 1; i <= 5; i++) seg2 += '<button data-c="' + i + '" aria-pressed="' + (CFG.c === i) + '">' + cl[i - 1] + "</button>";
    el.innerHTML = '<div class="card"><h2>اختباري</h2>' +
      '<p class="sub">تُتلى عليك آية بصوت الشيخ محمد صديق المنشاوي، ثم ' + gn("أكمل", "أكملي") + ' ما بعدها من حفظك، الآيات التالية كلها دفعة واحدة، فإن أصبتَ ظهرت كلها، ثم تأتي آية جديدة.</p>' +
      (msg ? '<p class="warn" role="alert">' + esc(msg) + "</p>" : "") +
      (R ? '<p class="sub" style="margin-top:8px">من محفوظك: ' + esc(G.MPlan && G.MPlan.summary ? G.MPlan.summary() : AR(R.pages) + " صفحة") + ".</p>"
         : '<p class="warn">حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي» ليُختار الاختبار من محفوظك.</p>') +
      '<label>عدد الاختبارات</label><div class="seg" id="ikN">' + seg1 + "</div>" +
      '<label>نطاق الإكمال بعد الآية</label><div class="seg" id="ikM"><button data-m="count" aria-pressed="' + !pm + '">عدد من الآيات</button><button data-m="page" aria-pressed="' + pm + '">إلى آخر الصفحة</button></div>' +
      '<div id="ikCBox"' + (pm ? ' class="hide"' : "") + '><label>عدد الآيات المطلوب إكمالها دفعة واحدة</label><div class="seg" id="ikC">' + seg2 + "</div></div>" +
      '<div class="row"><button class="p" id="ikGo"' + (R ? "" : " disabled") + ">ابدأ الاختبار</button></div>" +
      '<p class="sub" style="margin-top:10px">يحتاج اتصالًا بالإنترنت وإذن الميكروفون.</p></div>';
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

  /* الآية تُبنى مرة واحدة، ثم تُكشف كلماتها تباعًا بحركة (دون إعادة رسم، فلا تتكرر الحركة) */
  function build(P) {
    return P.disp.map(function (w, i) { return '<span class="ikw' + (w.mark ? " mk" : "") + '" data-i="' + i + '">' + esc(w.raw) + "</span>"; }).join(" ");
  }
  function paint(P, eng, mark, box) {
    var els = box.querySelectorAll(".ikw"), i, j, w, first = -1, bad;
    for (i = 0; i < P.disp.length; i++) {
      w = P.disp[i];
      if (w.b <= eng.p && !els[i].classList.contains("on")) els[i].classList.add("on");
      if (first < 0 && w.b > eng.p && !w.mark) first = i;
      if (!w.mark && els[i].classList.contains("on") && !els[i].classList.contains("x")) { bad = false; for (j = w.a; j < w.b; j++) if (mark[j] === 2) bad = true; if (bad) els[i].classList.add("x"); }
    }
    [].forEach.call(box.querySelectorAll(".nx"), function (e) { e.classList.remove("nx"); });
    if (first >= 0) { els[first].classList.add("nx"); try { if (P.disp.length > 40) els[first].scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  }
  /* عند الانتهاء: تُكشف الكلمات الباقية تباعًا (بالأحمر إن أخطأ) */
  function revealRest(P, box, ok) {
    var els = box.querySelectorAll(".ikw"), d = 0;
    [].forEach.call(box.querySelectorAll(".nx"), function (e) { e.classList.remove("nx"); });
    P.disp.forEach(function (w, i) {
      if (els[i].classList.contains("on")) return;
      els[i].style.animationDelay = Math.min(d * 70, 1400) + "ms"; d++;
      els[i].classList.add("on"); if (!ok) els[i].classList.add("x");
    });
  }

  /* فرصة القارئ لإكمال آية: تُرجع true إن أكملها صحيحة. الإصغاء والمطابقة كلمةً كلمة بمحرّك المسمّع الآلي نفسه */
  function chance(sid, keys, label) {
    return new Promise(function (resolve) {
      var P = prepMulti(keys), n = P.E.length, allow = allowed(n), start = Date.now(), lim = Math.min(300000, 15000 + 1500 * n),
        lastT = Date.now(), seen = false, done = false, rec = null, iv = null, mark = [], core = C(), eng = new core.Engine(P.EO, { start: 0 });
      var box = $("ikAy"); box.className = "ik-ay"; box.innerHTML = build(P); paint(P, eng, mark, box);
      setSt("🎤 " + label);
      function good() { return eng.p >= n && eng.err <= allow; }
      function finish(ok) {
        if (done) return; done = true; clearInterval(iv); if (rec) rec.stop(); CUR = null;
        if (!dead(sid)) { box.className = "ik-ay " + (ok ? "ok" : "bad"); revealRest(P, box, ok); }
        resolve({ ok: ok, done: ok ? keys.length : P.ends.filter(function (e) { return e <= eng.p; }).length });
      }
      CUR = { finish: finish };
      rec = listen(function (T0, from, fin) {
        if (done) return { used: 0 };
        var out = eng.feed(T0, from, fin);
        if (T0.length > from) { seen = true; lastT = Date.now(); }
        out.ev.forEach(function (v) { mark[v.i] = v.ok ? 1 : 2; if (!v.ok) beep(); });
        paint(P, eng, mark, box);
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
    var heard = await play(pr.k); if (dead(sid)) return;
    if (!heard) {   /* تعذّر الصوت: نعرض نص الآية ليستمر الاختبار */
      setSt("تعذّر تشغيل الصوت، هذه هي الآية:");
      $("ikAy").className = "ik-ay ok"; $("ikAy").innerHTML = prep(keyOf(pr.k)).disp.map(function (w) { return '<span class="ikw on">' + esc(w.raw) + "</span>"; }).join(" ");
      await wait(4500); if (dead(sid)) return;
    }
    for (d = 1; d <= pr.len; d++) keys.push(keyOf(pr.k + d));
    /* الآيات التالية كلها دفعة واحدة، لا آية آية */
    res = await chance(sid, keys, pr.len > 1 ? gn("أكمل", "أكملي") + " الآيات التي بعدها كلها (" + (pr.len === 2 ? "آيتان" : AR(pr.len) + (pr.len > 10 ? " آية" : " آيات")) + ") دفعة واحدة" : gn("أكمل", "أكملي") + " الآية التي بعدها");
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
    var R = memRange(); if (!R) return renderSetup("حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي».");
    /* تهيئة الصوت داخل نقرة المستخدم (تشترطه بعض المتصفحات) */
    if (!AU) AU = new Audio();
    try { AU.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; var pp = AU.play(); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {}
    ac();   /* تهيئة صافرة الخطأ داخل النقرة */
    if (!C()) return renderSetup("تعذّر تحميل محرّك الإصغاء. أعد فتح التطبيق ثم حاول مجددًا.");
    loadText(function (ok) {
      if (!ok) return renderSetup("ملف النص غير موجود: ضع data/quran-text.json.");
      var pr = pick(CFG.n, CFG.c, R, CFG.m);
      if (!pr.length) return renderSetup("محفوظك قليل لإجراء اختبار. أضف صفحات أكثر ثم أعد المحاولة.");
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
    if (b.id === "ikGo" || b.id === "ikAgain") return start();
    if (b.id === "ikBack") return renderSetup();
    if (b.id === "ikSk") { if (CUR) CUR.finish(false); return; }
    if (b.id === "ikQt") { endSession(); return renderSetup(); }
  });

  G.Ikhtibar = {
    open: function () { if (!D) D = buildMap(); if (!T) renderSetup(D ? "" : "تعذّر تحميل بيانات المصحف."); },
    leave: function () { if (T) { endSession(); renderSetup(); } },
    _t: { state: function () { return T; }, prep: prep, prepMulti: prepMulti, pick: pick, buildMap: function () { D = buildMap(); return D; }, memRange: memRange, setText: function (q) { Q = q; }, pageOf: pageOf, keyOf: keyOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
