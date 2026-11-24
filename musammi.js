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
  var Q = null, st = { on: false, rec: null, list: [], words: [], pending: [], i: -1, buf: "", itx: "", iskip: 0, t0: 0, tm: null, fails: 0, errs: 0 };
  function AQ(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function css() {
    var s = document.createElement("style");
    s.textContent =
      ".ms-bar{position:fixed;z-index:9998;right:18px;bottom:22px;display:none;align-items:center;gap:8px}" +
      ".ms-bar.on{display:flex}#msBtn{width:66px;height:66px;border-radius:50%;font-size:25px;font-weight:900;box-shadow:0 8px 26px rgba(0,0,0,.25);display:grid;place-items:center;padding:0}" +
      "#msBtn.live{border-radius:18px;background:#c0392b;border-color:#c0392b;color:#fff;width:60px;height:60px}" +
      "#msStat{position:absolute;right:0;bottom:76px;white-space:nowrap;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:6px 10px;font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,.12)}" +
      ".tj-hideaya .aya-t .qw{color:transparent!important;text-shadow:none!important}" +
      ".tj-hideaya .aya-t .qw.ms-word-rev{color:inherit!important;text-shadow:none!important}" +
      ".ms-lock .aya-t .qw.ms-word-rev{animation:msIn .22s ease}" +
      ".ms-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#c0392b;margin-inline-end:5px;animation:msP 1s infinite}" +
      "@keyframes msP{50%{opacity:.25}}@keyframes msIn{from{opacity:.25}to{opacity:1}}" +
      "#tjFin{position:fixed!important;z-index:9997;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));width:min(620px,calc(100% - 24px));margin:0 auto!important;box-shadow:0 8px 28px rgba(0,0,0,.22)}";
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
    st.words = [].slice.call(document.querySelectorAll("#mushafText .aya-t .qw")).map(function(e){
      e.classList.remove("ms-word-rev"); return { el:e, text:norm(e.textContent) };
    }).filter(function(x){ return !!x.text; });
    st.list = pageAyat(); st.i = -1; st.pending = []; st.buf = ""; st.itx = ""; st.iskip = 0;
    st.fails = 0; st.errs = 0; st.t0 = Date.now();
    if (st.on) { lock(); prompt(); }
  }
  function prompt() {
    if (!st.on) return;
    stat('<span class="ms-dot"></span>ابدأ القراءة من أي موضع في الصفحة');
  }
  function beepError() {
    try {
      var AC = G.AudioContext || G.webkitAudioContext, ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = 190; g.gain.setValueAtTime(.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.16, ac.currentTime + .015);
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .20);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .21);
      o.onended = function(){ ac.close(); };
    } catch(e) {}
  }
  function wordScore(a,b) { return sim(a,b); }
  function revealThrough(index) {
    for (var j=0;j<=index;j++) st.words[j].el.classList.add("ms-word-rev");
  }
  function findStart(tokens) {
    var best=-1, bestScore=0, bestRun=0;
    for (var i=0;i<st.words.length;i++) {
      var run=0, score=0;
      for (var j=0;j<tokens.length && i+j<st.words.length;j++) {
        var sc=wordScore(st.words[i+j].text,tokens[j]);
        if(sc>=.75){run++;score+=sc;} else break;
      }
      if(run>bestRun || (run===bestRun && score>bestScore)){best=i;bestRun=run;bestScore=score;}
    }
    return bestRun ? {index:best,run:bestRun} : null;
  }
  function consume(tokens) {
    if (!st.on || !tokens.length) return;
    if (st.i < 0) {
      var found=findStart(tokens);
      if(!found){beepError();return;}
      st.i=found.index-1;
    }
    tokens.forEach(function(t){
      var next=st.i+1, expected=st.words[next];
      if(!expected)return;
      if(wordScore(expected.text,t)>=.75){
        st.i=next; revealThrough(st.i);
      } else {
        st.errs++; beepError();
      }
    });
    var count=Math.max(0,st.i+1);
    stat('<span class="ms-dot"></span>تم كشف '+AQ(count)+' كلمة');
    if(st.i>=st.words.length-1) done();
  }
  function done() {
    stat("أحسنت! أتممت تسميع الصفحة. اضغط زر إنهاء التسميع لتسجيلها.");
    try { if (G.S) { G.S.tas = G.S.tas || {}; G.S.tas[G.tjState.pg] = { d: G.dkey(new Date()), ok: st.errs ? 0 : 1 }; G.save(); } } catch (e) {}
    stop(true);
  }
  function onSpeech(t, fin) {
    if (!st.on || !fin) return;
    var tokens=toks(t);
    if(!tokens.length)return;
    if(st.i<0){
      st.pending=st.pending.concat(tokens);
      clearTimeout(st.tm);
      if(st.pending.length>=2){var first=st.pending;st.pending=[];consume(first);}
      else st.tm=setTimeout(function(){var first=st.pending;st.pending=[];consume(first);},1800);
      return;
    }
    consume(tokens);
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
        if (res.isFinal) cb(res[0].transcript, true); else cb(res[0].transcript, false);
      } };
      r.onerror = function (e) { onEnd(e.error); }; r.onend = function () { onEnd(); };
      r.start();
    }, stop: function () { try { r.abort(); } catch (e) {} },
    ready: function (cb) {
      var NativeSR = G.SpeechRecognition || G.webkitSpeechRecognition;
      if (!NativeSR || !NativeSR.available) {
        if (allowOnline()) { if ("processLocally" in r) r.processLocally = false; return cb(true); }
        return cb(false, "هذا المتصفح لا يدعم حزم التعرف الصوتي المحلية. جرّب Chrome محدّثًا على Android.");
      }
      NativeSR.available({ langs: ["ar-SA"], processLocally: true }).then(function (status) {
        if (status === "available") { r.processLocally = true; return cb(true); }
        if (allowOnline()) { r.processLocally = false; return cb(true); }
        cb(false, status === "unavailable"
          ? "حزمة العربية غير متاحة للتنزيل من هذا المتصفح أو الجهاز. جرّب Chrome على Android."
          : "حزمة العربية غير مثبتة. افتح الإعدادات واضغط «تنزيل حزمة العربية» أولًا.");
      }).catch(function () { cb(false, "تعذّر فحص حزمة العربية. افتح الإعدادات وحاول تنزيلها."); });
    } };
  }
  function start() {
    loadText(function (ok) {
      if (!ok) return stat("تعذّر تحميل نص القرآن.", "bad");
      var en = engine();
      if (!en) return stat("التعرّف الصوتي غير متاح في هذا المتصفح. جرّب Chrome حديثًا.", "bad");
      (en.ready || function (c) { c(true); })(function (good, why) {
        if (!good) return stat(why || "محرك الصوت غير جاهز", "bad");
        st.rec = en; st.on = true;
        $("msBtn").classList.add("live"); $("msBtn").textContent = "■";
        resetPage();
        var run = function () { st.itx = ""; en.start(onSpeech, function (err) {
          if (!st.on) return;
          if (err === "not-allowed" || err === "service-not-allowed") { stat("اسمح باستخدام الميكروفون."); return stop(); }
          if (err === "network" || err === "language-not-supported") { stat("التعرّف الصوتي غير متاح حاليًا."); return stop(); }
          setTimeout(run, 250);
        }); };
        run();
      });
    });
  }
  function stop(keep) {
    st.on = false; clearTimeout(st.tm); if (st.rec) st.rec.stop();
    var b = $("msBtn"); if (b) { b.classList.remove("live"); b.textContent = "🎙"; }
    unlock(); if (!keep) stat("");
  }
  function syncBar() {
    var b = document.querySelector(".ms-bar"), m = G.tjState && G.tjState.mode;
    if (b) b.classList.toggle("on", m === "review" || m === "tasmee");
    if (m === "study" && st.on) stop();
  }
  function init() {
    if (!$("tjModes") || $("msBtn")) return;
    css();
    var bar = document.createElement("div"); bar.className = "ms-bar";
    bar.innerHTML = '<span id="msStat" aria-live="polite"></span><button id="msBtn" class="p" type="button" aria-label="بدء التسميع">🎙</button>';
    document.body.appendChild(bar);
    $("msBtn").onclick = function () { st.on ? stop() : start(); };
    $("tjModes").addEventListener("click", function () { setTimeout(syncBar, 0); });
    var o = G.tjRenderPage; G.tjRenderPage = function () { var r = o.apply(this, arguments); if (st.on) resetPage(); return r; };
    var s0 = G.tjSetMode; G.tjSetMode = function () { var r = s0.apply(this, arguments); syncBar(); return r; };
    var installBtn = $("msInstallBtn"), installMsg = $("msInstallMsg");
    function installStatus(msg, bad) {
      if (installMsg) { installMsg.textContent = msg; installMsg.style.color = bad ? "#c0392b" : "var(--ink)"; }
    }
    if (installBtn) installBtn.onclick = function () {
      var NativeSR = G.SpeechRecognition || G.webkitSpeechRecognition;
      if (!NativeSR || !NativeSR.available || !NativeSR.install) {
        installStatus("هذا المتصفح لا يتيح تنزيل حزم اللغة من داخل المواقع. جرّب Chrome محدّثًا على Android، أو استخدم متصفحًا يدعم تنزيل حزم التعرف الصوتي.", true);
        return;
      }
      installBtn.disabled = true;
      installStatus("جارٍ التحقق من حزمة اللغة العربية…");
      NativeSR.available({ langs: ["ar-SA"], processLocally: true }).then(function (status) {
        if (status === "available") {
          try { localStorage.setItem("msArabicPack", "1"); } catch (e) {}
          installStatus("حزمة العربية مثبتة وجاهزة للتسميع ✓");
          return true;
        }
        if (status === "unavailable") {
          installStatus("حزمة العربية غير متاحة للتنزيل على هذا الجهاز أو المتصفح.", true);
          return false;
        }
        installStatus("جارٍ تنزيل حزمة اللغة العربية. اترك التطبيق مفتوحًا حتى يكتمل التنزيل…");
        return NativeSR.install({ langs: ["ar-SA"] }).then(function (ok) {
          if (ok) {
            try { localStorage.setItem("msArabicPack", "1"); } catch (e) {}
            installStatus("تم تنزيل حزمة العربية بنجاح. يمكنك الآن بدء التسميع ✓");
            return true;
          }
          installStatus("لم يكتمل تنزيل الحزمة. تحقق من اتصال الإنترنت والمساحة المتاحة ثم أعد المحاولة.", true);
          return false;
        });
      }).catch(function () {
        installStatus("تعذّر تنزيل حزمة العربية. تأكد من اتصال الإنترنت وحدّث Chrome ثم أعد المحاولة.", true);
      }).then(function () { installBtn.disabled = false; }, function () { installBtn.disabled = false; });
    };
    syncBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
