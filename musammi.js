/* المسمّع الآلي — مطابقة صارمة للتلاوة، ويعمل عبر الإنترنت فقط (تعرّف المتصفح الصوتي).
   النص: data/quran-text.json */
(function (G) {
  "use strict";
  /* ===== 1) التطبيع والمطابقة (لا يعتمد على المتصفح) ===== */
  function norm(s) {
    return String(s || "").replace(/\u0648\u0670/g, "ا").replace(/\u0670/g, "ا").replace(/[\u0640\u064B-\u065F\u06D6-\u06ED]/g, "")
      .replace(/[\u0671\u0622\u0623\u0625]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^\u0621-\u064A ]/g, " ").replace(/\s+/g, " ").replace(/(^| )ء(?=ا)/g, "$1").trim();   /* ءامنوا، ءايات (مدّ أول الكلمة) = آمنوا، آيات */
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
  /* تقارب الأصوات التي يخلط فيها التعرّف الصوتي كثيرًا (ظ/ض، ذ/ز، ث/س/ص، ط/ت، ح/ه، ع/ء/ا). لا نضمّ ق/ك ولا غ/خ كي لا نقبل كلمة قرآنية أخرى */
  var PHM = { "ء": "ا", "ع": "ا", "ظ": "ض", "ذ": "ز", "ث": "س", "ص": "س", "ط": "ت", "ح": "ه" };
  function pk(w) { return w.replace(/[ءعظذثصطح]/g, function (c) { return PHM[c]; }).replace(/ا/g, "").replace(/(.)\1+/g, "$1"); }
  function wsim(a, b) {
    var sa = sk(a), sb = sk(b);
    if (sa === sb) return 1;
    if (/اء$/.test(a) !== /اء$/.test(b) && sk(a.replace(/اء$/, "ا")) === sk(b.replace(/اء$/, "ا"))) return .95;
    if (Math.min(sa.length, sb.length) < 3) return 0;
    var pa = pk(sa), pb = pk(sb);
    if (pa === pb) return .92;
    var L = Math.max(pa.length, pb.length);
    if (L <= 3) return 0;
    return 1 - lev(pa, pb) / L;
  }
  var LN = { ا: "الف", ل: "لام", م: "ميم", ص: "صاد", ر: "را", ك: "كاف", ه: "ها", ي: "يا", ع: "عين", ط: "طا", س: "سين", ح: "حا", ق: "قاف", ن: "نون" };
  /* صيغ نطق كل حرف مقطّع كما يكتبها التعرّف الصوتي (ر: را/راء، ه: ها/هاء ...) */
  var NV = { "ا": ["الف", "ا"], "ل": ["لام", "ل"], "م": ["ميم", "م"], "ص": ["صاد", "ص"], "ر": ["را", "راء", "ر"], "ك": ["كاف", "ك"], "ه": ["ها", "هاء", "ه"], "ي": ["يا", "ياء", "ي"], "ع": ["عين", "ع"], "ط": ["طا", "طاء", "ط"], "س": ["سين", "س"], "ح": ["حا", "حاء", "ح"], "ق": ["قاف", "ق"], "ن": ["نون", "ن"] };
  function nameOk(c, t) {
    var v = NV[c]; if (!v || !t) return false;
    if (v.indexOf(t) >= 0) return true;
    return sk(v[0]).length >= 3 && wsim(v[0], t) >= .85;
  }
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
  var API = { nameOk: nameOk, norm: norm, matchAyah: matchAyah, expectedWords: expectedWords, BSM: BSM, isBsm: isBsm, sim: sim, wsim: wsim };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  G.Musammi = API;


  /* ===== 2) الواجهة والمحرك: تسميع كلمةً كلمة، من أي موضع في الصفحة ===== */
  var $ = function (i) { return document.getElementById(i); };
  var Q = null, W = [];
  var st = { wait: false, wt: null, fc: [], sus: "", max: 0, rr: false, erred: false, on: false, rec: null, pos: -1, fin: [], itx: [], j: 0, tm: null, tt: null, errs: 0, s0: -1, beepT: 0, ac: null, g: "" };
  function gN(m, f) { var w = G.MRobot && G.MRobot.who(); return w && w.g === "f" ? f : m; }

  function css() {
    var s = document.createElement("style");
    s.textContent =
      "#msFab{position:fixed;left:12px;bottom:calc(var(--vvb,0px) + env(safe-area-inset-bottom,0px) + var(--ms-fin,64px) + 24px);z-index:44;display:none;flex-direction:column;align-items:center;gap:0}#msFab.on{display:flex}" +
      "#msRobot{filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))}" +
      "#msName{position:relative;margin:-7px 0 4px;font-size:11px;font-weight:800;line-height:18px;padding:0 9px;border-radius:99px;background:var(--card);color:var(--ink);border:1px solid var(--line)}" +
      "#msBtn{width:64px;height:64px;padding:0;border-radius:50%;border:3px solid #d93025;background:var(--card);display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent}" +
      "#msBtn::after{content:'';width:28px;height:28px;border-radius:50%;background:#d93025;transition:width .18s,height .18s,border-radius .18s}" +
      "#msBtn.live{animation:msRing 1.3s ease-out infinite}#msBtn.live::after{width:24px;height:24px;border-radius:6px}" +
      "@keyframes msRing{0%{box-shadow:0 0 0 0 rgba(217,48,37,.55),0 6px 18px rgba(0,0,0,.3)}100%{box-shadow:0 0 0 18px rgba(217,48,37,0),0 6px 18px rgba(0,0,0,.3)}}" +
      "#msToast{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);width:min(520px,calc(100% - 24px));z-index:46;display:none;background:var(--card);color:var(--ink);border:2px solid var(--warn);border-radius:14px;padding:10px 14px;font-size:14px;line-height:1.7;box-shadow:0 8px 24px rgba(0,0,0,.3)}" +
      "#msToast.on{display:block}#msToast.ok{border-color:var(--ok);font-weight:800}" +
      /* الكشف كلمةً كلمة: الآية مخفية كلها، وتُظهَر الكلمات المقروءة صحيحًا فقط */
      ".tj-hideaya .aya-t:not(.rev) .qw.wrev{visibility:visible!important}" +
      ".tj-hideaya .aya-t .qw.wrev,.tj-hideaya .aya-t .qw.wrev *{color:var(--ms-ink,#0b1a33)!important}" +
      ".tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-lazim{color:var(--tj-lazim)!important}.tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-wajib{color:var(--tj-wajib)!important}" +
      ".tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-jawaz{color:var(--tj-jawaz)!important}.tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-madd2{color:var(--tj-madd2)!important}" +
      ".tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-ghunna{color:var(--tj-ghunna)!important}.tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-gray{color:var(--tj-gray)!important}" +
      ".tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-tafkhim{color:var(--tj-tafkhim)!important}.tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev .tj-c-qalqala{color:var(--tj-qalqala)!important}" +
      ".tj-hideaya .aya-t .qw.wrev.werr,.tj-hideaya .aya-t .qw.wrev.werr *,.tj-hideaya:not(.tj-hidden) .aya-t .qw.wrev.werr [class*=tj-c-]{color:#d93025!important}" +
      ".qw.werr{background:rgba(217,48,37,.16);box-shadow:0 0 0 1.5px rgba(217,48,37,.6);border-radius:.3em}" +
      ".qw.wre{animation:msRe 1.3s ease-out forwards;border-radius:.3em}.qw.wcur{animation:msCur 1.1s ease-out forwards;border-radius:.3em}" +
      "@keyframes msRe{0%{background:rgba(212,160,23,.32);box-shadow:0 0 0 1.5px rgba(212,160,23,.75)}100%{background:rgba(212,160,23,0);box-shadow:0 0 0 1.5px rgba(212,160,23,0)}}" +
      "@keyframes msCur{0%{background:rgba(212,160,23,.55);box-shadow:0 0 0 2px rgba(212,160,23,1)}100%{background:rgba(212,160,23,0);box-shadow:0 0 0 2px rgba(212,160,23,0)}}" +
      ".ms-lock .qw.wrev{animation:msIn .6s cubic-bezier(.22,1.25,.36,1) both}" +
      "@keyframes msIn{0%{opacity:0;transform:translateY(7px) scale(.82);filter:blur(3px) drop-shadow(0 0 0 rgba(212,160,23,0))}55%{opacity:1;filter:blur(0) drop-shadow(0 0 7px rgba(212,160,23,.75))}100%{opacity:1;transform:none;filter:none}}.tj-hideaya.ms-lock .aya-num{pointer-events:none}" +
      "@media(prefers-reduced-motion:reduce){#msBtn.live,.ms-lock .qw.wrev{animation:none}}";
    document.head.appendChild(s);
  }

  function toast(html, cls, ms) {
    var e = $("msToast"); if (!e) return; clearTimeout(st.tt);
    if (!html) { e.className = ""; e.innerHTML = ""; return; }
    e.className = "on " + (cls || ""); e.innerHTML = html;
    /* كل الإشعارات تختفي تلقائيًا: القصيرة بعد ٤٫٥ ثوانٍ، وما فيه خيار أو تحميل أطول قليلًا */
    if (!ms) ms = /<label|جارٍ/.test(html) ? 7000 : 3500;
    st.tt = setTimeout(function () { toast(""); }, ms);
  }

  /* ===== الصوت: صافرة قصيرة عند الخطأ فقط ===== */
  function ac() {
    try {
      if (!st.ac) { var C = G.AudioContext || G.webkitAudioContext; if (C) st.ac = new C(); }
      if (st.ac && st.ac.state === "suspended") st.ac.resume();
    } catch (e) {}
    return st.ac;
  }
  G.MusammiAC = function () { return ac(); };
  var TOL = .75, STOL = .5;   /* حدّ التشابه */
  function beep() {
    var n = Date.now(); if (n - st.beepT < 600) return; st.beepT = n;
    var r = $("msRobot"); if (r) { r.classList.remove("rb-err"); void r.offsetWidth; r.classList.add("rb-err"); }
    var a = ac(); if (!a) return;
    try {
      var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(140, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .34);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .36);
    } catch (e) {}
  }

  /* ===== النص وكلمات الصفحة ===== */
  function loadText(cb) {
    if (Q) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      Q = {}; Object.keys(j).forEach(function (k) {
        var t = j[k]; if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") { var w = norm(t).split(" "); if (isBsm(w) && w.length > 4) t = t.trim().split(/\s+/).slice(4).join(" "); }
        Q[k] = t;
      }); cb(true);
    }).catch(function () { cb(false); });
  }
  /* كلمات الصفحة بالترتيب. كل عنصر: t = الكلمة المتوقعة، els = شكل الكلمة (أو الكلمات) في الصفحة لإظهاره */
  function muqOf(t) { if (MUQ.test(t)) return t; var u = t.replace(/ا$/, ""); return u !== t && MUQ.test(u) ? u : null; }
  function buildWords() {
    var groups = {}, order = [], out = [];
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t"), function (a) {
      var k = a.dataset.a; if (!groups[k]) { groups[k] = []; order.push(k); }
      [].forEach.call(a.querySelectorAll(".qw"), function (q) { groups[k].push(q); });
    });
    order.forEach(function (k) {
      var els = groups[k], txt = Q && Q[k], n = els.length;
      if (!txt) return els.forEach(function (e) { out.push({ k: k, i: 0, t: "", els: [e], loose: true }); });
      var tk = norm(txt).split(" ").filter(Boolean), comp = tk.join("");
      tk.forEach(function (t, i) {
        var a = Math.floor(i * n / tk.length), b = Math.max(a + 1, Math.floor((i + 1) * n / tk.length));
        var e = tk.length === n ? [els[i]] : els.slice(a, Math.min(n, b));
        /* الحروف المقطّعة في أول السورة (الر، الم، حم، كهيعص ...) تُنطق أسماءً، سواء كانت الآية كلها أو تتبعها كلمات (يوسف: الر تلك آيات...) */
        var mq = i === 0 && (/:1$/.test(k) || k === "42:2") ? muqOf(t) : null;
        out.push(mq ? { k: k, i: i, t: mq, els: e, names: mq.split("") } : { k: k, i: i, t: t, els: e });
      });
    });
    return out;
  }
  function reveal(i) { var w = W[i]; if (w) w.els.forEach(function (e) { e.classList.add("wrev"); e.classList.remove("werr"); }); }
  /* كلمات أخطأ فيها القارئ أو تخطّاها: تُكشف بالأحمر ليراها */
  function markErr(a, b) { for (var i = a; i < b; i++) if (W[i]) W[i].els.forEach(function (e) { e.classList.add("wrev", "werr"); }); }
  function clearRev() { [].forEach.call(document.querySelectorAll("#mushafText .wrev,#mushafText .wre,#mushafText .wcur"), function (e) { e.classList.remove("wrev", "wre", "wcur", "werr"); }); }
  function lock() {
    var sh = $("mushafSheet"); sh.classList.add("tj-hideaya", "ms-lock");
    try { sh.style.setProperty("--ms-ink", getComputedStyle($("mushafText")).color); } catch (e) {}
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t.rev"), function (e) { e.classList.remove("rev"); });
    clearRev();
    var h = $("tjHideAya"); if (h) h.disabled = true;
  }
  function unlock() { var sh = $("mushafSheet"); if (sh) sh.classList.remove("ms-lock"); var h = $("tjHideAya"); if (h) h.disabled = false; }
  /* لا كشف يدوي للآيات أثناء المسمّع الآلي */
  document.addEventListener("click", function (e) { if (st.on && e.target.closest && e.target.closest("#mushafText .aya-num")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  /* ===== المطابقة كلمةً كلمة ===== */
  function toks(s) { var n = norm(s); return n ? n.split(" ") : []; }
  function wm(a, b) { return !!a && !!b && wsim(a, b) >= TOL; }
  function soft(a, b) { return !!a && !!b && sk(a).length >= 3 && wsim(a, b) >= STOL; }
  /* هل تُطابق الكلمة المتوقعة في الموضع p الكلمات المنطوقة من T[j]؟ تُرجع {tok: كلمات منطوقة مستهلكة، adv: كلمات صفحة متقدَّم بها} أو null */
  function tryAt(p, T, j) {
    var w = W[p]; if (!w || j >= T.length) return null;
    if (w.loose) return { tok: 1, adv: 1 };
    if (w.names) {
      if (wm(w.t, T[j])) return { tok: 1, adv: 1 };
      var n = w.names.length; if (T.length - j < n) return null;
      for (var i = 0; i < n; i++) if (!nameOk(w.names[i], T[j + i])) return null;
      return { tok: n, adv: 1 };
    }
    if (wm(w.t, T[j])) return { tok: 1, adv: 1 };
    /* دمج أو فصل في التعرّف: «يوم الدين» ↔ «يومالدين» */
    if (T[j + 1]) { var c = T[j] + T[j + 1]; if (c.length >= 6 && wsim(w.t, c) >= .85) return { tok: 2, adv: 1 }; }
    var nx = W[p + 1];
    if (nx && !nx.loose && !nx.names && (w.t + nx.t).length >= 8 && wsim(w.t + nx.t, T[j]) >= .88) return { tok: 1, adv: 2 };
    return null;
  }
  /* بعد خطأ: إن نطق القارئ كلمة صحيحة من الكلمات التالية (حتى ٦) وتلتها الكلمة التي بعدها صحيحة، فالكلمات بينهما أخطأ فيها أو لم يعرفها */
  function resync(T, j, final) {
    for (var k = 1; k <= 6; k++) {
      var p = st.pos + k, x = W[p]; if (!x) break;
      if (x.loose || x.names || sk(x.t).length < 3) continue;
      var r = tryAt(p, T, j); if (!r) continue;
      if (T[j + r.tok] !== undefined) { if (p + r.adv < W.length && !tryAt(p + r.adv, T, j + r.tok)) continue; }
      else if (!final || sk(x.t).length < 4) continue;
      return { p: p, r: r };
    }
    return null;
  }
  function seq(p, T, s, lim) {
    var m = 0, j = s, q = p, r;
    while (q < W.length && j < T.length && m < lim && (r = tryAt(q, T, j))) { j += r.tok; q += r.adv; m++; }
    return { m: m, q: q, j: j };
  }
  function bsmAt(T, j) { return T.length - j >= 4 && BW.every(function (w, i) { return sk(T[j + i]) === sk(w); }); }
  function pageHasBsm() { return W.some(function (w) { return w.k === "1:1"; }); }

  /* القفل: أول كلمتين صحيحتين (أو كلمة فريدة طويلة) تحدّدان موضع القارئ في الصفحة، أيًّا كان */
  function tryLock(T, stable) {
    var Ts = T.slice(0, st.j + stable), best = null, uniq = [], s, p, r;
    for (s = st.j; s < Math.min(Ts.length, st.j + 3); s++) {
      best = null; uniq = [];
      for (p = 0; p < W.length; p++) {
        r = seq(p, Ts, s, 3); if (!r.m) continue;
        if (r.m >= 2) { if (!best || r.m > best.m) best = { m: r.m, p: p, q: r.q, j: r.j }; }
        else uniq.push({ m: 1, p: p, q: r.q, j: r.j });
      }
      if (!best && uniq.length === 1 && sk(Ts[s]).length >= 3) best = uniq[0];
      if (best) break;
    }
    if (!best) return false;
    for (p = 0; p < best.q; p++) reveal(p);   /* الكلمة المقروءة وكل ما قبلها */
    st.pos = best.q; st.j = best.j; st.s0 = best.p; return true;
  }
  /* قفزة صامتة: إن أعاد القارئ من موضع آخر (كلمتان متتاليتان صحيحتان) ننتقل إليه دون صافرة، وأقرب موضع للحالي أولًا */
  function findJump(T, avail) {
    if (avail < 2) return null;
    var best = null, p, r;
    for (p = 0; p < W.length; p++) {
      if (p === st.pos) continue;
      r = seq(p, T, st.j, 2);
      if (r.m >= 2 && sk(T[st.j] + T[st.j + 1]).length >= 6 && (!best || Math.abs(p - st.pos) < Math.abs(best.p - st.pos))) best = { p: p, q: r.q, j: r.j };
    }
    return best;
  }
  /* إعادة القراءة: إطار شفاف على الكلمات المُعادة، ومؤشر أقوى على الكلمة التي وصل إليها الآن */
  function setCur(i) {
    [].forEach.call(document.querySelectorAll("#mushafText .wcur"), function (e) { e.classList.remove("wcur"); });
    var w = W[i]; if (w) w.els.forEach(function (e) { flash(e, "wcur"); });
  }
  function flash(e, c) { e.classList.remove(c); void e.offsetWidth; e.classList.add(c); }   /* يعيد تشغيل الوميض */
  function markRe(a, b) { for (var i = a; i < b; i++) if (W[i]) W[i].els.forEach(function (e) { flash(e, "wre"); }); if (b > a) setCur(b - 1); }
  function adv() {   /* بعد كل تقدّم: إن بلغ القارئ أبعد نقطة وصل إليها سابقًا انتهت الإعادة */
    if (st.pos > st.max) st.max = st.pos;
    if (st.rr && st.pos >= st.max) { st.rr = false; [].forEach.call(document.querySelectorAll("#mushafText .wcur"), function (e) { e.classList.remove("wcur"); }); }
  }
  function step(final, quiet) {
    if (!st.on || st.wait) return;
    var T = st.fin.concat(st.itx), avail, stable, r, jp, a;
    if (st.j > T.length) st.j = T.length;
    var guard = 400;
    while (st.on && guard--) {
      avail = T.length - st.j; stable = final ? avail : avail - 1;   /* آخر كلمة في النتيجة المؤقتة قد تتغيّر، فلا نحكم عليها بعد */
      if (stable <= 0) break;
      if (st.pos < 0) {
        if (stable >= 4 && bsmAt(T, st.j) && !pageHasBsm()) { st.j += 4; continue; }
        if (!tryLock(T, stable)) break;
        if (st.pos >= W.length) return done();
        continue;
      }
      var w = W[st.pos];
      /* بسملة قبل أول آية من السورة */
      if (w.i === 0 && /:1$/.test(w.k) && w.k !== "1:1" && sk(T[st.j]) === "بسم") {
        if (bsmAt(T, st.j)) { st.j += 4; continue; }
        if (!final && avail < 4) break;
      }
      r = tryAt(st.pos, T, st.j);
      if (r) {
        for (a = 0; a < r.adv; a++) reveal(st.pos + a);
        if (st.rr) markRe(st.pos, st.pos + r.adv);
        st.pos += r.adv; st.j += r.tok; st.erred = false; adv();
        if (st.pos >= W.length) return done();
        continue;
      }
      /* الحروف المقطّعة: إن نُطق بعضها فقط وما نُطق صحيح بالترتيب فننتظر الباقي ولا نحكم بالخطأ */
      if (w.names && T.length - st.j < w.names.length) {
        var pre = true; for (var q = 0; q < T.length - st.j; q++) if (!nameOk(w.names[q], T[st.j + q])) { pre = false; break; }
        if (pre) break;
      }
      /* تكرار الكلمة السابقة (تردّد) لا يُعدّ خطأً */
      if (st.pos > 0 && W[st.pos - 1].t && wm(W[st.pos - 1].t, T[st.j])) { st.j++; continue; }
      /* تساهل: كلمة تشبه المتوقعة (التعرّف شوّهها) وتليها الكلمة التالية الصحيحة ← نقبلها */
      if (!w.loose && !w.names && soft(w.t, T[st.j])) {
        if (T[st.j + 1] === undefined && !final) break;
        var r2 = tryAt(st.pos + 1, T, st.j + 1);
        if (r2) { reveal(st.pos); if (st.rr) markRe(st.pos, st.pos + 1); st.pos++; st.j++; st.erred = false; adv(); continue; }
      }
      jp = findJump(T, avail);
      if (jp) {
        for (a = jp.p; a < jp.q; a++) reveal(a);
        if (st.pos > st.max) st.max = st.pos;
        if (jp.p > st.pos && jp.p - st.pos <= 12) {   /* قفزة قصيرة للأمام: كلمات تخطّاها القارئ */
          markErr(st.pos, jp.p);
          if (!st.erred) { st.errs++; beep(); }
        }
        st.rr = jp.p < st.pos;   /* قفزة للخلف = إعادة قراءة */
        if (st.rr) markRe(jp.p, jp.q);
        st.pos = jp.q; st.j = jp.j; st.erred = false; adv();
        if (st.pos >= W.length) return done();
        continue;
      }
      /* الخطأ لا يُحكم به إلا بعد ثلاث كلمات (أو سكوت)، لأن التعرّف قد يصحّح نفسه */
      if (!final && avail < 3) break;
      /* وقفة قصيرة وسط القراءة: آخر كلمة قد يكون التعرّف ناقصًا فيها، فننتظر النتيجة النهائية قبل الحكم */
      if (quiet && avail < 2) break;
      /* كلام لم يتأكد منه التعرّف (ثقة منخفضة) لا نحكم عليه بالخطأ، نتجاوزه بصمت */
      if ((st.j < st.fin.length ? (st.fc[st.j] || 1) : 1) < .5) { st.j++; continue; }
      /* في النتائج المؤقتة: لا بد أن يثبت الاختلاف نفسه في تحديثين متتاليين، فقد يصحّح التعرّف نفسه */
      if (!final) { var key = st.pos + "|" + T[st.j]; if (st.sus !== key) { st.sus = key; break; } }
      var rs = resync(T, st.j, final);
      if (rs) {
        markErr(st.pos, rs.p);
        if (!st.erred) { st.errs++; beep(); }
        for (a = 0; a < rs.r.adv; a++) reveal(rs.p + a);
        if (st.rr) markRe(rs.p, rs.p + rs.r.adv);
        st.pos = rs.p + rs.r.adv; st.j += rs.r.tok; st.erred = false; adv();
        if (st.pos >= W.length) return done();
        continue;
      }
      /* صافرة واحدة فقط لكل خطأ: لا تتكرر حتى تُقرأ كلمة صحيحة أو يعيد القارئ من موضع آخر */
      if (!st.erred) { st.erred = true; st.errs++; beep(); }
      st.j++;
    }
    /* تنظيف المخزن بعد استهلاك كل الكلمات */
    if (!st.itx.length && st.j >= st.fin.length && st.fin.length) { st.fin = []; st.fc = []; st.j = 0; }
  }
  function onSpeech(t, fin, conf) {
    if (!st.on) return;
    var tk = toks(t), c = conf > 0 ? conf : 1;
    if (fin) { tk.forEach(function () { st.fc.push(c); }); st.fin = st.fin.concat(tk); st.itx = []; } else st.itx = tk;
    step(fin);
    clearTimeout(st.tm); st.tm = setTimeout(function () { step(true, true); }, st.tmo || 1000);
  }
  function altScore(tk) {
    var T = st.fin.concat(tk), s = Math.min(st.j, st.fin.length), p, best = 0, r;
    if (st.pos >= 0) return seq(st.pos, T, s, 99).m;
    for (p = 0; p < W.length; p++) { r = seq(p, T, s, 3); if (r.m > best) best = r.m; }
    return best;
  }
  /* من بين بدائل التعرّف نختار الأوفق لموضع القارئ (بدائل الصياغة تقلّل الصافرات الكاذبة) */
  function bestAlt(alts) {
    var b = alts[0], bs = -1, i, s;
    for (i = 0; i < alts.length; i++) { s = altScore(toks(alts[i].t)); if (s > bs) { bs = s; b = alts[i]; } }
    return b;
  }

  /* انتهت الصفحة: نسجّل تسميعها ونقلب للتالية ونكمل دون توقف. لا يتوقف المسمّع إلا بضغط الزر (أو آخر صفحة في المصحف) */
  function done() {
    var m = st.errs, full = st.s0 === 0, pg = G.tjState && G.tjState.pg;
    try { if (full && G.S) { G.S.tas = G.S.tas || {}; G.S.tas[pg] = { d: G.dkey(new Date()), ok: m ? 0 : 1 }; G.save(); } } catch (e) {}
    var msg = "✓ " + gN("أتممتَ", "أتممتِ") + " الصفحة" + (m ? " — " + gN("تعثّرتَ", "تعثّرتِ") + " " + (m === 1 ? "مرة واحدة" : m + " مرات") : " بلا أي تعثّر");
    if (pg && pg < 604 && G.tjFlip) {
      st.wait = true;            /* نحتفظ بما نُطق من الكلمات إلى أن تُرسم الصفحة التالية */
      toast(msg + " — ننتقل إلى الصفحة التالية…", "ok", 3000);
      clearTimeout(st.wt);
      st.wt = setTimeout(function () { if (st.wait && st.on) { st.wait = false; toast("تعذّر فتح الصفحة التالية. تأكد من الاتصال ثم اضغط الزر للمتابعة.", "", 6000); stop(true); } }, 15000);
      try { G.tjFlip(1); } catch (e) { st.wait = false; stop(true); }
      return;
    }
    toast(msg + ". انتهى المصحف.", "ok", 5000);
    stop(true);
  }

  /* المحرك: تعرّف المتصفح الصوتي عبر الإنترنت فقط */
  var NOSR = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome أو Edge أو Safari.";
  var NONET = "التسميع الآلي يحتاج إلى اتصال بالإنترنت. اتصل بالإنترنت ثم أعد المحاولة.";
  function engine() {
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(); r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    try { if ("processLocally" in r) r.processLocally = false; } catch (e) {}
    return { start: function (cb, onEnd) {
      r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var a = bestAlt([].map.call(res, function (x) { return { t: x.transcript, c: x.confidence }; }));
        if (res.isFinal) cb(a.t, true, a.c); else cb(a.t, false);
      } };
      r.onerror = function (e) { onEnd(e.error); }; r.onend = function () { onEnd(); };
      r.start();
    }, stop: function () { try { r.abort(); } catch (e) {} } };
  }

  function resetPage() {
    var carry = st.wait;   /* انتقال تلقائي: لا نمسح الكلام المنطوق، فقد يكون القارئ بدأ الصفحة التالية */
    if (!carry) { st.fin = []; st.fc = []; st.itx = []; st.j = 0; }
    st.sus = ""; st.pos = -1; st.s0 = -1; st.errs = 0; st.erred = false; st.max = 0; st.rr = false; st.wait = false;
    clearTimeout(st.tm); clearTimeout(st.wt);
    W = buildWords();
    if (st.on) lock();
    if (carry && st.on) { step(false); st.tm = setTimeout(function () { step(true, true); }, st.tmo || 1000); }
  }
  function setLive(on) {
    var b = $("msBtn"), r = $("msRobot");
    if (b) { b.classList.toggle("live", on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-label", on ? "إيقاف التسميع الآلي" : "بدء التسميع الآلي"); }
    if (r) r.classList.toggle("rb-live", on);
  }
  function start() {
    ac();
    if (!navigator.onLine) return toast(NONET, "", 6000);
    loadText(function (ok) {
      if (!ok) return toast("ملف النص غير موجود: ضع data/quran-text.json.", "", 6000);
      var en = engine(); if (!en) return toast(NOSR, "", 6000);
      toast("");
      st.tmo = 1000; st.rec = en; st.on = true; setLive(true);
      resetPage(); lock();
      var run = function () {
        if (st.itx.length) { st.itx = []; if (st.j > st.fin.length) st.j = st.fin.length; }
        en.start(onSpeech, function (e2) {
          if (!st.on) return;
          if (e2 === "not-allowed" || e2 === "service-not-allowed") { toast("اسمح للموقع باستخدام الميكروفون.", "", 7000); return stop(true); }
          if (e2 === "network" || e2 === "language-not-supported") { toast(NONET, "", 6000); return stop(true); }
          setTimeout(run, 250);
        });
      };
      run();
    });
  }
  function stop(keep) {
    st.on = false; st.wait = false; clearTimeout(st.tm); clearTimeout(st.wt); if (st.rec) st.rec.stop();
    setLive(false); unlock(); if (!keep) toast("");
  }
  function revealAll() { for (var i = 0; i < W.length; i++) if (W[i]) W[i].els.forEach(function (e) { e.classList.add("wrev"); }); }   /* تبقى علامة الأخطاء ظاهرة للمراجعة */

  /* ===== الزر العائم ===== */
  function fabInit() {
    var f = document.createElement("div"); f.id = "msFab";
    f.innerHTML = '<div id="msRobot"></div><div id="msName"></div><button id="msBtn" type="button" aria-pressed="false" aria-label="بدء التسميع الآلي"></button>';
    document.body.appendChild(f);
    var t = document.createElement("div"); t.id = "msToast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t);
    t.addEventListener("click", function () { toast(""); });
    $("msBtn").onclick = function () { if (st.on) { stop(); revealAll(); } else start(); };   /* عند ضغط الإيقاف تظهر الآيات كلها */
  }
  /* اسم الروبوت: يضعه المستخدم، والافتراضي «المسمّع الآلي» */
  var DEF_NAME = "المسمّع الآلي";
  function rname() { try { return G.MRobot ? G.MRobot.name() : DEF_NAME; } catch (e) { return DEF_NAME; } }
  function paintRobot() {
    var w = G.MRobot ? G.MRobot.who() : { g: "m" };
    if (st.g === w.g) return; st.g = w.g;
    var r = $("msRobot"), n = $("msName");
    if (r && G.MRobot) r.innerHTML = G.MRobot.svg(w.g, 56, "");
    if (n) n.textContent = rname();
    if (r) r.classList.toggle("rb-live", st.on);
  }
  function syncBar() {
    var f = $("msFab"), m = G.tjState && G.tjState.mode, q = $("t-qurani"), vis = q && !q.classList.contains("hide") && (m === "review" || m === "tasmee");
    if (f) f.classList.toggle("on", !!vis);
    if (vis) paintRobot();
    if (st.on && (!vis)) stop();
  }
  function init() {
    if (!$("tjModes") || $("msBtn")) return;
    if (G.MRobot) G.MRobot.css();
    css(); fabInit();
    /* زر إخفاء/إظهار الآيات: الكلمات المكشوفة بالمسمّع تُمسح أولًا، وإلا بقيت ظاهرة رغم الإخفاء */
    var hb = $("tjHideAya"); if (hb) hb.addEventListener("click", function () { clearRev(); });
    document.addEventListener("mrobot", function () { st.g = ""; paintRobot(); });
    $("tjModes").addEventListener("click", function () { setTimeout(syncBar, 0); });
    var fin = $("tjFin"); if (fin && G.ResizeObserver) new ResizeObserver(function () { document.documentElement.style.setProperty("--ms-fin", fin.offsetHeight + "px"); }).observe(fin);
    var q = $("t-qurani"); if (q && G.MutationObserver) new MutationObserver(syncBar).observe(q, { attributes: true, attributeFilter: ["class"] });
    var o = G.tjRenderPage; G.tjRenderPage = function () { var r = o.apply(this, arguments); if (st.on) resetPage(); return r; };
    var s0 = G.tjSetMode; G.tjSetMode = function () { clearRev(); var r = s0.apply(this, arguments); syncBar(); return r; };
    syncBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
