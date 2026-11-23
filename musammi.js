/* المسمّع الآلي — مطابقة صارمة للتلاوة، يعمل دون إنترنت.
   النص: data/quran-text.json  |  المحرك: تعرّف صوتي على الجهاز فقط (لا يُرسل الصوت لأي خادم). */
(function (G) {
  "use strict";
  /* ===== 1) التطبيع والمطابقة (لا يعتمد على المتصفح) ===== */
  function norm(s) {
    return String(s || "").replace(/\u0670/g, "ا").replace(/[\u0640\u064B-\u065F\u06D6-\u06ED]/g, "")
      .replace(/[\u0671\u0622\u0623\u0625]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^\u0621-\u064A ]/g, " ").replace(/\s+/g, " ").trim();
  }
  /* هيكل الكلمة: بلا ألف، فلا يضرّ اختلاف رسم الألف الخنجرية (مٰلك/مالك) */
  function sk(w) { w = w.replace(/^ال(?=..)/, ""); return w.replace(/ا/g, ""); }
  function lev(a, b) {
    var m = a.length, n = b.length, p = [], i, j, c, t;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) {
      t = p[0]; p[0] = i;
      for (j = 1; j <= n; j++) { c = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, t + (a[i - 1] === b[j - 1] ? 0 : 1)); t = c; }
    }
    return p[n];
  }
  function sim(a, b) {
    a = sk(a); b = sk(b);
    if (a === b) return 1;
    if (Math.max(a.length, b.length) <= 4) return 0; /* الكلمات القصيرة (حتى ٤ حروف): تطابق تام، فلا يمرّ حرف ناقص */
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  var LN = { ا: "الف", ل: "لام", م: "ميم", ص: "صاد", ر: "را", ك: "كاف", ه: "ها", ي: "يا", ع: "عين", ط: "طا", س: "سين", ح: "حا", ق: "قاف", ن: "نون" };
  var MUQ = /^(الم|المص|الر|المر|كهيعص|طه|طسم|طس|يس|ص|حم|عسق|ق|ن)$/;
  /* الحروف المقطّعة تُنطق أسماءً: الم ← «ألف لام ميم» (ويُقبل نطقها كما كُتبت) */
  function expectedWords(txt) {
    var n = norm(txt);
    if (MUQ.test(n.replace(/ /g, ""))) return { w: n.replace(/ /g, "").split("").map(function (c) { return LN[c]; }), alt: n.replace(/ /g, "") };
    return { w: n.split(" ") };
  }
  var BSM = "بسم الله الرحمن الرحيم", BW = ["بسم", "الله", "الرحمن", "الرحيم"];
  function isBsm(t) { return t.length >= 4 && BW.every(function (w, i) { return sk(t[i]) === sk(w); }); }
  /* مطابقة تقابلية بالبرمجة الديناميكية: كل كلمة متوقعة لا بد أن تُقابَل بالترتيب.
     النتيجة تنجح فقط إذا: لا كلمة محذوفة، والتشابه فوق العتبة، والزيادات قليلة. */
  function alignOk(exp, hyp) {
    var n = exp.length, m = hyp.length, D = [], i, j, S;
    var maxIns = Math.max(1, Math.ceil(n / 10));
    if (m < n || m > n + maxIns) return false;
    for (i = 0; i <= n; i++) { D[i] = []; for (j = 0; j <= m; j++) D[i][j] = i === 0 ? j : Infinity; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      S = sim(exp[i - 1], hyp[j - 1]);
      D[i][j] = Math.min(D[i][j - 1] + 1, S >= .75 ? D[i - 1][j - 1] + (1 - S) : Infinity);
    }
    return D[n][m] <= maxIns + 0.6 * n * .25 && D[n][m] < Infinity;
  }
  /* يُرجع عدد كلمات الكلام المستهلكة إن طابقت الآية، وإلا 0. تُقبل بسملة قبل أول آية، وزيادة بعد الآية تُترك للتالية */
  function matchAyah(txt, said, allowBsm) {
    var ex = expectedWords(txt), h = norm(said).split(" ").filter(Boolean), off = 0, cand, k, hl;
    if (allowBsm && h.length > 4 && isBsm(h)) { off = 4; }
    h = h.slice(off);
    var n = ex.w.length;
    var tries = [ex.w]; if (ex.alt) tries.push([ex.alt]);
    for (var t = 0; t < tries.length; t++) {
      cand = tries[t]; hl = cand.length;
      for (k = hl; k <= Math.min(h.length, t ? hl : hl + Math.max(1, Math.ceil(hl / 10))); k++) {
        if (alignOk(cand, h.slice(0, k)) && (norm(cand.join("")).length < 6 || lev(sk(cand.join("")), sk(h.slice(0, k).join(""))) / sk(cand.join("")).length <= .12))
          return { used: off + k, n: hl };
      }
    }
    /* ملاذ لأخطاء الفصل/الدمج في التعرّف (يوم الدين ↔ يومالدين): مقارنة النص كاملًا بتسامح ضيق جدًّا، فلا تمرّ كلمة ناقصة */
    var js = sk(ex.w.join("")), hl2 = ex.w.length;
    if (!ex.alt && js.length >= 8) for (k = Math.max(1, hl2 - 3); k <= Math.min(h.length, hl2 + 2); k++) {
      var jh = sk(h.slice(0, k).join(""));
      if (Math.abs(jh.length - js.length) <= 1 && lev(js, jh) / js.length <= (js.length >= 12 ? .04 : 0)) return { used: off + k, n: hl2 };
    }
    return null;
  }
  var API = { norm: norm, matchAyah: matchAyah, expectedWords: expectedWords, BSM: BSM, isBsm: isBsm, sim: sim };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  G.Musammi = API;

  /* ===== 2) الواجهة والمحرك ===== */
  var $ = function (i) { return document.getElementById(i); };
  function allowOnline() { try { return localStorage.getItem("msOnline") === "1"; } catch (e) { return false; } }
  var Q = null, st = { on: false, rec: null, list: [], i: 0, buf: "", itx: "", iskip: 0, t0: 0, tm: null, fails: 0, errs: 0 };
  function AQ(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function css() {
    var s = document.createElement("style");
    s.textContent = ".ms-bar{display:none;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.ms-bar.on{display:flex}" +
      "#msBtn{font-weight:800}#msBtn.live{background:#c0392b;border-color:#c0392b;color:#fff}" +
      "#msStat{font-size:14px;flex:1;min-width:160px}#msStat.ok{color:var(--ok);font-weight:800}#msStat.bad{color:var(--warn);font-weight:800}" +
      ".ms-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#c0392b;margin-inline-end:6px;animation:msP 1s infinite}" +
      ".ms-pb{display:inline-block;width:90px;height:6px;border-radius:9px;background:var(--acc2);vertical-align:middle;margin-inline-start:8px;overflow:hidden}.ms-pb i{display:block;height:100%;background:var(--ok);transition:width .25s}" +
      "@keyframes msP{50%{opacity:.25}}@keyframes msIn{from{opacity:.15;transform:scale(.98)}to{opacity:1;transform:none}}" +
      ".ms-lock .aya-t.rev{animation:msIn .5s ease}.tj-hideaya.ms-lock .aya-num{pointer-events:none}";
    document.head.appendChild(s);
  }
  function stat(t, c) { var e = $("msStat"); if (e) { e.className = c || ""; e.innerHTML = t; } }
  function loadText(cb) {
    if (Q) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      Q = {}; Object.keys(j).forEach(function (k) {
        var t = j[k]; if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") { var w = norm(t).split(" "); if (isBsm(w) && w.length > 4) t = t.trim().split(/\s+/).slice(4).join(" "); }
        Q[k] = t;
      }); cb(true);
    }).catch(function () { cb(false); });
  }
  function pageAyat() {
    var seen = {}, out = [];
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t"), function (e) { var k = e.dataset.a; if (!seen[k]) { seen[k] = 1; out.push(k); } });
    return out;
  }
  function reveal(k) { [].forEach.call(document.querySelectorAll('#mushafText .aya-t[data-a="' + k + '"]'), function (e) { e.classList.add("rev"); }); }
  function lock() {
    var sh = $("mushafSheet"); sh.classList.add("tj-hideaya", "ms-lock");
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t.rev"), function (e) { e.classList.remove("rev"); });
    var h = $("tjHideAya"); if (h) h.disabled = true;
  }
  function unlock() { var sh = $("mushafSheet"); if (sh) sh.classList.remove("ms-lock"); var h = $("tjHideAya"); if (h) h.disabled = false; }
  /* لا كشف يدوي للآيات أثناء المسمّع الآلي */
  document.addEventListener("click", function (e) { if (st.on && e.target.closest && e.target.closest("#mushafText .aya-num")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  function toks(s) { var n = norm(s); return n ? n.split(" ") : []; }
  function attempt() { return toks(st.buf).concat(toks(st.itx).slice(st.iskip)); }
  function allowB(k) { return /:1$/.test(k) && k !== "1:1"; }
  function strip(h, k) { return allowB(k) && h.length > 4 && isBsm(h) ? h.slice(4) : h; }
  /* عدد الكلمات الصحيحة المتتالية من أول الآية (لا يكشف نصّها) */
  function progress(ex, h) { var i = 0; for (var j = 0; j < h.length && i < ex.length; j++) if (sim(ex[i], h[j]) >= .75) i++; return i; }
  function showProg(pr, n, k) {
    stat('<span class="ms-dot"></span>الآية ' + AQ(k.split(":")[1]) + " — " + AQ(pr) + " من " + AQ(n) + ' كلمة<span class="ms-pb"><i style="width:' + Math.round(100 * pr / n) + '%"></i></span>');
  }
  function resetPage() {
    st.list = pageAyat().filter(function (k) { return Q && Q[k]; }); st.i = 0; st.buf = ""; st.itx = ""; st.iskip = 0; st.fails = 0; st.errs = 0; st.t0 = Date.now();
    if (st.on) { lock(); prompt(); }
  }
  function prompt() {
    if (!st.on || st.i >= st.list.length) return;
    var k = st.list[st.i]; showProg(0, expectedWords(Q[k]).w.length, k);
  }
  function judge(final) {
    if (!st.on || st.i >= st.list.length) return;
    var k = st.list[st.i], at = attempt(), r = matchAyah(Q[k], at.join(" "), allowB(k));
    /* حدّ أدنى للزمن منذ بدء الآية: ٠٫١٥ ثانية للكلمة، فلا ينجح ضجيج أو نطق مستحيل السرعة */
    if (r && (Date.now() - st.t0) / 1000 < r.n * .15) r = null;
    if (r) return pass(k, at, r);
    var ex = expectedWords(Q[k]).w, pr = progress(ex, strip(at, k));
    if (!final) { if (at.length) showProg(pr, ex.length, k); return; }
    if (!at.length) return;
    st.fails++; st.errs++; st.buf = ""; st.itx = ""; st.iskip = 0; st.t0 = Date.now();
    /* الخطأ: الآية تبقى مخفية، ويُذكر موضع التعثّر فقط */
    stat("✗ غير صحيحة — تعثّرتَ عند الكلمة " + AQ(pr + 1) + ". أعد الآية " + AQ(k.split(":")[1]) + " من أولها", "bad");
  }
  function pass(k, at, r) {
    var b = toks(st.buf).length, rest = at.slice(r.used);
    if (r.used <= b) st.buf = toks(st.buf).slice(r.used).join(" "); else { st.iskip += r.used - b; st.buf = ""; }
    reveal(k); st.i++; st.fails = 0; st.t0 = Date.now() - rest.length * 250;
    if (st.i >= st.list.length) return done();
    stat("✓ صحيحة", "ok"); setTimeout(prompt, 700);
    if (rest.length) judge(false);
  }
  function done() {
    var m = st.errs;
    stat("✓ أتممتَ الصفحة — " + (m ? "تعثّرتَ " + AQ(m) + " مرة" : "بلا أي تعثّر") + ". اضغط «أنهيت…» لتسجيلها.", "ok");
    try { if (G.S) { G.S.tas = G.S.tas || {}; G.S.tas[G.tjState.pg] = { d: G.dkey(new Date()), ok: m ? 0 : 1 }; G.save(); } } catch (e) {}
    stop(true);
  }
  function onSpeech(t, fin) {
    if (!st.on) return;
    if (fin) { st.buf = toks(st.buf).concat(toks(t).slice(st.iskip)).join(" "); st.itx = ""; st.iskip = 0; } else st.itx = t;
    judge(false);
    clearTimeout(st.tm); st.tm = setTimeout(function () { judge(true); }, fin ? 1800 : 2600);
  }
  function bestAlt(alts) {
    var k = st.list[st.i]; if (!k) return alts[0];
    for (var j = 0; j < alts.length; j++) if (matchAyah(Q[k], toks(st.buf).concat(toks(alts[j]).slice(st.iskip)).join(" "), allowB(k))) return alts[j];
    return alts[0];
  }
  /* المحرك: محلي مخصص (window.MusammiEngine) ثم تعرّف الجهاز. الإنترنت لا يُستخدم إلا بإذن صريح */
  function engine() {
    if (G.MusammiEngine) return G.MusammiEngine;
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(); r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    if ("processLocally" in r) r.processLocally = true; else if (!allowOnline()) return null;
    return { start: function (cb, onEnd) {
      r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        if (res.isFinal) cb(bestAlt([].map.call(res, function (a) { return a.transcript; })), true); else cb(res[0].transcript, false);
      } };
      r.onerror = function (e) { onEnd(e.error); }; r.onend = function () { onEnd(); };
      r.start();
    }, stop: function () { try { r.abort(); } catch (e) {} },
    ready: function (cb) {
      if (!G.SpeechRecognition || !G.SpeechRecognition.available) return cb(true);
      var fb = function (why) { if (allowOnline()) { r.processLocally = false; return cb(true); } cb(false, why); };
      G.SpeechRecognition.available({ langs: ["ar-SA"], processLocally: true }).then(function (s) {
        if (s === "available") return cb(true);
        if (s === "unavailable") return fb("حزمة العربية للتعرّف الصوتي غير متاحة على هذا الجهاز. فعّل «السماح بالإنترنت» أو نزّل حزمة العربية دون اتصال في إعدادات الهاتف.");
        stat("جارٍ تنزيل حزمة التعرّف على العربية (مرة واحدة)…");
        G.SpeechRecognition.install({ langs: ["ar-SA"], processLocally: true }).then(function (ok) { ok ? cb(true) : fb("تعذّر تنزيل الحزمة"); }, function () { fb("تعذّر تنزيل الحزمة"); });
      }, function () { cb(true); });
    } };
  }
  function start() {
    loadText(function (ok) {
      if (!ok) return stat("ملف النص غير موجود: ضع data/quran-text.json (انظر README).", "bad");
      var en = engine();
      if (!en) return stat("هذا المتصفح لا يوفّر تعرّفًا صوتيًا يعمل دون إنترنت. استخدم Chrome حديثًا، أو ضع محركًا محليًا (انظر README).", "bad");
      (en.ready || function (c) { c(true); })(function (good, why) {
        if (!good) return stat(why || "المحرك غير جاهز", "bad");
        st.rec = en; st.on = true; $("msBtn").classList.add("live"); $("msBtn").textContent = "⏹ إيقاف";
        resetPage();
        var run = function () { st.itx = ""; st.iskip = 0; en.start(onSpeech, function (err) {
          if (!st.on) return;
          if (err === "not-allowed" || err === "service-not-allowed") { stat("اسمح للموقع باستخدام الميكروفون.", "bad"); return stop(); }
          if (err === "network" || err === "language-not-supported") { stat("لا يعمل التعرّف الآن دون إنترنت. نزّل حزمة العربية دون اتصال في إعدادات الهاتف، أو اتصل بالإنترنت وفعّل «السماح بالإنترنت».", "bad"); return stop(); }
          setTimeout(run, 250); }); };
        run();
      });
    });
  }
  function stop(keep) {
    st.on = false; clearTimeout(st.tm); if (st.rec) st.rec.stop();
    var b = $("msBtn"); if (b) { b.classList.remove("live"); b.textContent = "🎙 المسمّع الآلي"; }
    unlock(); if (!keep) stat("");
  }
  function syncBar() { var b = document.querySelector(".ms-bar"), m = G.tjState && G.tjState.mode; if (b) b.classList.toggle("on", m === "review" || m === "tasmee"); if (m === "study" && st.on) stop(); }
  function init() {
    if (!$("tjModes") || $("msBtn")) return;
    css();
    var bar = document.createElement("div"); bar.className = "ms-bar";
    bar.innerHTML = '<button id="msBtn" class="p" type="button">🎙 المسمّع الآلي</button><span id="msStat" aria-live="polite"></span><label style="display:flex;gap:6px;align-items:center;font-size:13px;font-weight:400;margin:0;width:100%"><input type="checkbox" id="msOnline"> السماح بالتعرّف عبر الإنترنت إن لم تتوفر حزمة محلية (يُرسل الصوت إلى Google)</label>';
    var ck = bar.querySelector("#msOnline"); ck.checked = allowOnline();
    ck.onchange = function () { try { localStorage.setItem("msOnline", this.checked ? "1" : "0"); } catch (e) {} };
    $("tjModes").parentNode.appendChild(bar);
    $("msBtn").onclick = function () { st.on ? stop() : start(); };
    $("tjModes").addEventListener("click", function () { setTimeout(syncBar, 0); });
    var o = G.tjRenderPage; G.tjRenderPage = function () { var r = o.apply(this, arguments); if (st.on) resetPage(); return r; };
    var s0 = G.tjSetMode; G.tjSetMode = function () { var r = s0.apply(this, arguments); syncBar(); return r; };
    syncBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
