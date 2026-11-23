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
  var BSM = "بسم الله الرحمن الرحيم";
  /* مطابقة تقابلية بالبرمجة الديناميكية: كل كلمة متوقعة لا بد أن تُقابَل بالترتيب.
     النتيجة تنجح فقط إذا: لا كلمة محذوفة، والتشابه فوق العتبة، والزيادات قليلة. */
  function alignOk(exp, hyp) {
    var n = exp.length, m = hyp.length, D = [], i, j, S;
    var maxIns = Math.max(1, Math.ceil(n / 10));
    if (m < n || m > n + maxIns) return false;
    for (i = 0; i <= n; i++) { D[i] = []; for (j = 0; j <= m; j++) D[i][j] = i === 0 ? j : Infinity; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      S = sim(exp[i - 1], hyp[j - 1]);
      D[i][j] = Math.min(D[i][j - 1] + 1, S >= .8 ? D[i - 1][j - 1] + (1 - S) : Infinity);
    }
    return D[n][m] <= maxIns + 0.6 * n * .25 && D[n][m] < Infinity;
  }
  /* يُرجع عدد كلمات الكلام المستهلكة إن طابقت الآية، وإلا 0. تُقبل بسملة قبل أول آية، وزيادة بعد الآية تُترك للتالية */
  function matchAyah(txt, said, allowBsm) {
    var ex = expectedWords(txt), h = norm(said).split(" ").filter(Boolean), off = 0, cand, k, hl;
    if (allowBsm && h.slice(0, 4).join(" ") === BSM && h.length > 4) { off = 4; }
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
    return null;
  }
  var API = { norm: norm, matchAyah: matchAyah, expectedWords: expectedWords, BSM: BSM };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  G.Musammi = API;

  /* ===== 2) الواجهة والمحرك ===== */
  var $ = function (i) { return document.getElementById(i); };
  function allowOnline() { try { return localStorage.getItem("msOnline") === "1"; } catch (e) { return false; } }
  var Q = null, st = { on: false, rec: null, list: [], i: 0, buf: "", t0: 0, tm: null, fails: 0, done: {} };
  function css() {
    var s = document.createElement("style");
    s.textContent = ".ms-bar{display:none;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.ms-bar.on{display:flex}" +
      "#msBtn{font-weight:800}#msBtn.live{background:#c0392b;border-color:#c0392b;color:#fff}" +
      "#msStat{font-size:14px;flex:1;min-width:160px}#msStat.ok{color:var(--ok)}#msStat.bad{color:var(--warn)}" +
      ".ms-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#c0392b;margin-inline-end:6px;animation:msP 1s infinite}" +
      "@keyframes msP{50%{opacity:.25}}.tj-hideaya.ms-lock .aya-num{pointer-events:none}";
    document.head.appendChild(s);
  }
  function stat(t, c) { var e = $("msStat"); if (e) { e.className = c || ""; e.innerHTML = t; } }
  function loadText(cb) {
    if (Q) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      Q = {}; Object.keys(j).forEach(function (k) {
        var t = j[k]; if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") { var n = norm(t); if (n.indexOf(BSM) === 0 && n.length > BSM.length + 2) t = t.split(/\s+/).slice(4).join(" "); }
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
  /* لا كشف يدوي للآيات أثناء المسمّع الآلي: لا ثغرة بالنقر على رقم الآية */
  document.addEventListener("click", function (e) { if (st.on && e.target.closest && e.target.closest("#mushafText .aya-num")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  function resetPage() {
    st.list = pageAyat().filter(function (k) { return Q && Q[k]; }); st.i = 0; st.buf = ""; st.fails = 0;
    if (st.on) { lock(); prompt(); }
  }
  function prompt() {
    if (st.i >= st.list.length) { stat("✓ أتممتَ الصفحة كلها بلا خطأ. اضغط «أنهيت…» لتسجيلها.", "ok"); stop(true); return; }
    stat('<span class="ms-dot"></span>اقرأ الآية ' + AQ(st.list[st.i].split(":")[1]) + " من هذه الصفحة…");
  }
  function AQ(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function judge(final) {
    if (!st.on || st.i >= st.list.length) return;
    var k = st.list[st.i], r = matchAyah(Q[k], st.buf, st.i === 0 || /:1$/.test(k));
    var secs = (Date.now() - st.t0) / 1000;
    /* حدّ أدنى للزمن يمنع النجاح بكلمة سريعة/ضجيج: ٠٫١٨ ثانية للكلمة */
    if (r && secs < r.n * .18) r = null;
    if (r) {
      var left = norm(st.buf).split(" ").slice(r.used).join(" ");
      reveal(k); st.i++; st.fails = 0; st.buf = left; st.t0 = Date.now(); stat("✓ صحيحة", "ok");
      if (left) { clearTimeout(st.tm); judge(false); } else setTimeout(prompt, 700);
      return;
    }
    if (final) {
      st.fails++; st.buf = ""; st.t0 = Date.now();
      /* الخطأ: لا تُكشف الآية ولا تُذكر الكلمة الخاطئة */
      stat("✗ غير صحيحة — أعد الآية " + AQ(k.split(":")[1]) + " (محاولة " + AQ(st.fails) + ")", "bad");
    }
  }
  function onSpeech(text) {
    if (!st.buf) st.t0 = st.t0 || Date.now();
    st.buf = (st.buf + " " + text).trim(); judge(false);
    clearTimeout(st.tm); st.tm = setTimeout(function () { judge(true); }, 2400);
  }
  /* المحرك: يُفضَّل محرك محلي مخصص (window.MusammiEngine)، ثم تعرّف الجهاز بلا شبكة. لا اتصال بالإنترنت أبدًا ما لم يُسمح صراحة */
  function engine() {
    if (G.MusammiEngine) return G.MusammiEngine;
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(); r.lang = "ar-SA"; r.continuous = true; r.interimResults = false; r.maxAlternatives = 3;
    if ("processLocally" in r) r.processLocally = true; else if (!allowOnline()) return null;
    return { start: function (cb, onEnd) {
      r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) {
        var alts = [].map.call(e.results[i], function (a) { return a.transcript; });
        var pick = alts[0], k = st.list[st.i];
        if (k) for (var j = 0; j < alts.length; j++) if (matchAyah(Q[k], (st.buf + " " + alts[j]).trim(), st.i === 0 || /:1$/.test(k))) { pick = alts[j]; break; }
        cb(pick);
      } };
      r.onerror = function (e) { onEnd(e.error); }; r.onend = function () { onEnd(); };
      r.start();
    }, stop: function () { try { r.abort(); } catch (e) {} },
    ready: function (cb) {
      if (!G.SpeechRecognition || !G.SpeechRecognition.available) return cb(true);
      G.SpeechRecognition.available({ langs: ["ar-SA"], processLocally: true }).then(function (s) {
        if (s === "available") return cb(true);
        if (s === "unavailable") { if (allowOnline()) { r.processLocally = false; return cb(true); } return cb(false, "حزمة العربية للتعرّف الصوتي غير متاحة على هذا الجهاز. فعّل «السماح بالإنترنت» أو نزّل حزمة العربية دون اتصال في إعدادات الهاتف."); }
        stat("جارٍ تنزيل حزمة التعرّف على العربية (مرة واحدة)…");
        G.SpeechRecognition.install({ langs: ["ar-SA"], processLocally: true }).then(function (ok) { if (!ok && allowOnline()) { r.processLocally = false; return cb(true); } cb(!!ok, "تعذّر تنزيل الحزمة"); }, function () { if (allowOnline()) { r.processLocally = false; return cb(true); } cb(false, "تعذّر تنزيل الحزمة"); });
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
        var run = function () { en.start(onSpeech, function (err) {
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
  function syncBar() { var b = document.querySelector(".ms-bar"), m = G.tjState && tjState.mode; if (b) b.classList.toggle("on", m === "review" || m === "tasmee"); if (m === "study" && st.on) stop(); }
  function init() {
    if (!$("tjModes") || $("msBtn")) return;
    css();
    var bar = document.createElement("div"); bar.className = "ms-bar";
    bar.innerHTML = '<button id="msBtn" class="p" type="button">🎙 المسمّع الآلي</button><span id="msStat" aria-live="polite"></span><label style="display:flex;gap:6px;align-items:center;font-size:13px;font-weight:400;margin:0;width:100%"><input type="checkbox" id="msOnline"> السماح بالتعرّف عبر الإنترنت إن لم تتوفر حزمة محلية (يُرسل الصوت إلى Google)</label>';
    $("msOnline").checked = allowOnline();
    $("msOnline").onchange = function () { try { localStorage.setItem("msOnline", this.checked ? "1" : "0"); } catch (e) {} };
    $("tjModes").parentNode.appendChild(bar);
    $("msBtn").onclick = function () { st.on ? stop() : start(); };
    $("tjModes").addEventListener("click", function () { setTimeout(syncBar, 0); });
    var o = G.tjRenderPage; G.tjRenderPage = function () { var r = o.apply(this, arguments); if (st.on) resetPage(); return r; };
    var s0 = G.tjSetMode; G.tjSetMode = function () { var r = s0.apply(this, arguments); syncBar(); return r; };
    syncBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
