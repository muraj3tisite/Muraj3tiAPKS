/* مصحفي — قراءة المصحف كاملًا على الشاشة، مع شريط إعدادات وبحث في الآيات.
   يعتمد على بيانات الصفحات المضمّنة في الصفحة (window.QV4) وخطوط fonts/pNNN.woff ونص data/quran-text.json للبحث.
   لا يكتب في التخزين إلا مفتاحين جديدين: mshf_set (الإعدادات) وmshf_pg (آخر صفحة)، ولا يمسّ أي مفتاح قائم. */
(function (G) {
  "use strict";
  var NODE = typeof module !== "undefined" && module.exports;
  var EN = !NODE && G.LANG === "en";
  var AD = "٠١٢٣٤٥٦٧٨٩";
  function num(n) { n = String(n); return EN ? n : n.replace(/\d/g, function (d) { return AD.charAt(+d); }); }

  var TX = {
    ar: { seg1: "قرآني", seg2: "مصحفي", back: "رجوع", search: "بحث", settings: "الإعدادات", juz: "الجزء", page: "صفحة", ayah: "آية",
      title: "المصحف", sTitle: "إعدادات المصحف", colors: "ألوان التجويد", bg: "خلفية الصفحة", paper: "ورقي", white: "أبيض", night: "ليلي", black: "أسود",
      view: "عرض الصفحة", full: "كاملة على الشاشة", scroll: "ملء العرض", info: "إظهار رأس الصفحة وتذييلها", awake: "إبقاء الشاشة مضيئة", reset: "إعادة الضبط", done: "تم",
      ph: "ابحث عن كلمة في القرآن…", res: "نتيجة", more: "عرض المزيد", none: "لا توجد نتائج", min: "اكتب حرفين على الأقل", prep: "جارٍ تجهيز البحث…",
      loadFail: "تعذّر تحميل نص القرآن للبحث. تحقق من الاتصال ثم أعد المحاولة.", fontFail: "تعذّر تحميل خط هذه الصفحة. تحقق من الاتصال.", retry: "إعادة المحاولة",
      surah: "السورة", juzSel: "الجزء", prev: "الصفحة السابقة", next: "الصفحة التالية", slider: "رقم الصفحة", close: "إغلاق" },
    en: { seg1: "Quran", seg2: "My Mushaf", back: "Back", search: "Search", settings: "Settings", juz: "Juz", page: "Page", ayah: "Verse",
      title: "Mushaf", sTitle: "Mushaf settings", colors: "Tajweed colours", bg: "Page background", paper: "Paper", white: "White", night: "Night", black: "Black",
      view: "Page view", full: "Whole page", scroll: "Full width", info: "Show page header and footer", awake: "Keep screen on", reset: "Reset", done: "Done",
      ph: "Search a word in the Quran…", res: "results", more: "Show more", none: "No results", min: "Type at least two letters", prep: "Preparing search…",
      loadFail: "Could not load the Quran text for search. Check your connection and try again.", fontFail: "Could not load this page's font. Check your connection.", retry: "Retry",
      surah: "Surah", juzSel: "Juz", prev: "Previous page", next: "Next page", slider: "Page number", close: "Close" }
  };
  var T = EN ? TX.en : TX.ar;

  /* ===== 1) منطق نقيّ: تطبيع النص، الفهرس، بناء الصفحة، البحث ===== */
  /* هيكل الكلمة للبحث: بلا تشكيل ولا ألف، فيتطابق «الرحمن» مع «ٱلرَّحۡمَٰنِ» و«الصلاة» مع «ٱلصَّلَوٰةَ» */
  function norm(s) {
    return String(s || "")
      .replace(/\u0648\u0670/g, "\u0627")
      .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/[\u0671\u0622\u0623\u0625]/g, "\u0627")
      .replace(/[\u0649\u06CC]/g, "\u064A").replace(/\u06A9/g, "\u0643")
      .replace(/\u0629/g, "\u0647").replace(/\u0624/g, "\u0648").replace(/\u0626/g, "\u064A").replace(/\u0621/g, "")
      .replace(/[^\u0621-\u064A ]/g, " ")
      .replace(/\u0627/g, "")
      .replace(/\s+/g, " ").trim();
  }
  function juzOf(p) { return Math.min(30, p < 22 ? 1 : Math.floor((p - 2) / 20) + 1); }
  function juzStart(j) { return j <= 1 ? 1 : 20 * j - 18; }

  function pageOfWord(X, w) {
    var ps = X.ps, lo = 0, hi = ps.length - 1, mid;
    while (lo < hi) { mid = (lo + hi + 1) >> 1; if (ps[mid] <= w) lo = mid; else hi = mid - 1; }
    return lo + 1;
  }
  function makeIndex(QV) {
    var n = QV.W.length, s = new Uint8Array(n), a = new Uint16Array(n), m = new Uint8Array(n), ps = [], id = 0, i, k, c, S = 1, A = 0, first = [], keys = {};
    for (i = 0; i < QV.AY.length; i++) {
      A++; if (A > QV.SU[S - 1]) { S++; A = 1; }
      c = QV.AY[i]; first.push(id); keys[S + ":" + A] = i;
      for (k = 0; k < c; k++) { s[id + k] = S; a[id + k] = A; }
      m[id + c - 1] = 1; id += c;
    }
    id = 0; QV.L.forEach(function (L) { ps.push(id); L.forEach(function (v) { if (v > 0) id += v; }); });
    var X = { s: s, a: a, m: m, ps: ps, first: first, keys: keys, spage: [0] };
    for (i = 1; i <= 114; i++) X.spage[i] = pageOfWord(X, first[keys[i + ":1"]]);
    return X;
  }
  function pageOfAyah(X, s, a) { var k = X.keys[s + ":" + a]; return k === undefined ? 1 : pageOfWord(X, X.first[k]); }
  function surahOfPage(X, pg) { for (var i = 114; i >= 1; i--) if (X.spage[i] <= pg) return i; return 1; }
  function surahName(QV, s) { return QV.NM[s - 1].replace(/^\u0633\u064F\u0648\u0631\u064E\u0629\u064F\s*/, ""); }

  /* صفحة المصحف: أسطرها كما في المطبوع (15 موضعًا: سطر كلمات، أو فراغ، أو لوحة سورة، أو بسملة) */
  function pageHTML(QV, X, pg) {
    var L = QV.L[pg - 1], id = X.ps[pg - 1], mxw = 0, h = "", i;
    L.forEach(function (v) { if (v > mxw) mxw = v; });
    L.forEach(function (v) {
      if (v === 0) { h += '<div class="mq-e"></div>'; return; }
      if (v === -1) { h += '<div class="mq-ban"><b>' + QV.NM[X.s[id] - 1] + "</b></div>"; return; }
      if (v === -2) { h += '<div class="mq-bsm">\u0628\u0650\u0633\u06E1\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u06E1\u0645\u064E\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650</div>'; return; }
      var end = id + v, cur = "", row = "", last = end - 1,
        center = (pg < 3) || (X.m[last] && X.a[last] === QV.SU[X.s[last] - 1] && v <= mxw * 0.6);
      for (i = id; i < end; i++) {
        var key = X.s[i] + ":" + X.a[i];
        if (X.m[i]) {
          if (cur) { row += "</span>"; cur = ""; }
          row += '<span class="qw mq-n" role="img" aria-label="' + T.ayah + " " + num(X.a[i]) + '" data-a="' + key + '">' + QV.W[i] + "</span>";
          continue;
        }
        if (cur !== key) { if (cur) row += "</span>"; row += '<span class="aya-t" data-a="' + key + '">'; cur = key; }
        row += '<span class="qw">' + QV.W[i] + "</span>";
      }
      if (cur) row += "</span>";
      h += '<div class="mq-l' + (center ? " c" : "") + '">' + row + "</div>"; id = end;
    });
    return h;
  }

  /* فهرس البحث: كل آية بكلماتها الأصلية وهيكلها المطبَّع، مع إسقاط البسملة المدمجة في أول آية */
  function buildSearch(raw) {
    var recs = [];
    Object.keys(raw).forEach(function (k) {
      var p = k.split(":"), s = +p[0], a = +p[1]; if (!s || !a) return;
      var tk = String(raw[k] || "").trim().split(/\s+/).filter(Boolean);
      if (a === 1 && s !== 1 && s !== 9 && tk.length > 4 && norm(tk.slice(0, 4).join(" ")) === "بسم لله لرحمن لرحيم") tk = tk.slice(4);
      var parts = [], map = [], offs = [], lens = [], off = 0;
      tk.forEach(function (t, ix) { var n = norm(t); if (!n) return; parts.push(n); map.push(ix); offs.push(off); lens.push(n.length); off += n.length + 1; });
      recs.push({ s: s, a: a, tk: tk, j: parts.join(" "), map: map, offs: offs, lens: lens });
    });
    recs.sort(function (x, y) { return x.s - y.s || x.a - y.a; });
    return recs;
  }
  function search(recs, q) {
    var qn = norm(q); if (qn.length < 2) return null;
    var out = [], i, ix;
    for (i = 0; i < recs.length; i++) { ix = recs[i].j.indexOf(qn); if (ix >= 0) out.push({ r: recs[i], ix: ix }); }
    return { q: qn, list: out };
  }
  function hitTokens(h, qlen) {
    var r = h.r, set = {}, e = h.ix + qlen;
    r.map.forEach(function (tix, k) { var st = r.offs[k], en = st + r.lens[k]; if (st < e && en > h.ix) set[tix] = 1; });
    return set;
  }

  if (NODE) { module.exports = { norm: norm, makeIndex: makeIndex, pageOfAyah: pageOfAyah, surahOfPage: surahOfPage, surahName: surahName, pageHTML: pageHTML, buildSearch: buildSearch, search: search, hitTokens: hitTokens, juzOf: juzOf, juzStart: juzStart }; return; }

  /* ===== 2) الواجهة ===== */
  var D = document, QV = G.QV4;
  if (!QV || !QV.W) return;
  function g(id) { return D.getElementById(id); }
  function el(tag, cls, txt) { var e = D.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  var X = null; function idx() { return X || (X = makeIndex(QV)); }

  var THEMES = {
    paper: { bg: "#f6edd6", ink: "#2b2417", bar: "#eadfbf", line: "#d4c394", acc: "#2f7d4a", hl: "rgba(184,146,58,.42)", dark: 0 },
    white: { bg: "#ffffff", ink: "#111111", bar: "#eef1f6", line: "#d3d9e4", acc: "#1d5fd1", hl: "rgba(255,196,0,.38)", dark: 0 },
    night: { bg: "#121826", ink: "#e6ebf7", bar: "#1c2438", line: "#2c3752", acc: "#6ea0ff", hl: "rgba(255,200,60,.30)", dark: 1 },
    black: { bg: "#000000", ink: "#e9e9e9", bar: "#161616", line: "#2b2b2b", acc: "#7db0ff", hl: "rgba(255,200,60,.30)", dark: 1 }
  };
  var TJL = { lazim: "#8f0d24", wajib: "#e0282d", jawaz: "#e56a00", madd2: "#a36b00", ghunna: "#1e8a3c", gray: "#8f8f8f", tafkhim: "#1e3a8a", qalqala: "#1f7fd0" };
  var TJD = { lazim: "#ff6b81", wajib: "#ff5a5f", jawaz: "#ff9a3c", madd2: "#e0b04a", ghunna: "#4fd47a", gray: "#a3a3a3", tafkhim: "#7da2ff", qalqala: "#5db5ff" };
  var PALIDX = { lazim: [3], wajib: [9], jawaz: [4], madd2: [5], ghunna: [6], gray: [1, 2, 15], tafkhim: [7], qalqala: [8] };

  var S = { c: 1, t: "", m: "full", i: 1, w: 0 };
  function loadSet() {
    try { var r = JSON.parse(localStorage.getItem("mshf_set") || "null"); if (r) { if (r.c === 0 || r.c === 1) S.c = r.c; if (THEMES[r.t]) S.t = r.t; if (r.m === "full" || r.m === "scroll") S.m = r.m; if (r.i === 0 || r.i === 1) S.i = r.i; if (r.w === 0 || r.w === 1) S.w = r.w; } } catch (e) {}
    if (!S.t) {
      var r2 = D.documentElement, dk = r2.dataset.theme === "dark" || (!r2.dataset.theme && G.matchMedia && matchMedia("(prefers-color-scheme:dark)").matches);
      S.t = dk ? "night" : "paper";
    }
  }
  function saveSet() { try { localStorage.setItem("mshf_set", JSON.stringify(S)); } catch (e) {} }
  function lastPage() { try { var p = +localStorage.getItem("mshf_pg"); if (p >= 1 && p <= 604) return p; } catch (e) {} var tp = G.tjState && G.tjState.pg; return tp >= 1 && tp <= 604 ? tp : 1; }
  function saveLast(p) { try { localStorage.setItem("mshf_pg", String(p)); } catch (e) {} }

  var CSS = [
    ".mq-seg{margin:0 0 12px}",
    "#mqSeg button[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600}",
    ".mq{display:none;position:fixed;inset:0;z-index:100;background:var(--mq-bg);color:var(--mq-ink);font-family:Cairo,Tahoma,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent}",
    ".mq.on{display:block}body.mq-open{overflow:hidden}",
    ".mq *{box-sizing:border-box}",
    ".mq button{font:inherit;color:inherit;background:transparent;border:0;border-radius:12px;padding:0;margin:0;min-width:0;cursor:pointer}",
    ".mq select,.mq input[type=search]{font:inherit;font-size:15px;color:var(--mq-ink);background:var(--mq-bar);border:1px solid var(--mq-line);border-radius:12px;padding:9px 10px;min-width:0;max-width:100%}",
    ".mq-st{position:absolute;inset:0;display:flex;flex-direction:column;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);touch-action:pan-y;user-select:none;-webkit-user-select:none}",
    ".mq-meta{flex:none;height:26px;display:flex;justify-content:space-between;align-items:center;padding:0 16px;font-size:13px;opacity:.72}",
    ".mq-meta.ft{justify-content:center}",
    ".mq-bd{flex:1;min-height:0;display:flex;justify-content:center;align-items:center;overflow:hidden;padding:0 8px}",
    ".mq-bd.sc{overflow-y:auto;align-items:flex-start;-webkit-overflow-scrolling:touch}",
    ".mq-pg{flex:none;display:grid;direction:rtl;font-family:var(--qf),'Amiri Quran',serif;font-palette:--mshf;color:var(--mq-ink);transition:opacity .15s}",
    ".mq-pg.ld{opacity:.35}",
    ".mq-l{display:flex;justify-content:space-between;align-items:center;column-gap:.22em;white-space:nowrap;direction:rtl;height:100%;line-height:1}",
    ".mq-l.c{justify-content:center;column-gap:.3em}",
    ".mq-pg .aya-t{display:contents}.mq-pg .qw{display:block}",
    ".mq-pg .mq-hlw{background:var(--mq-hl);box-shadow:0 0 0 .11em var(--mq-hl);border-radius:.15em}",
    ".mq-ban{display:flex;align-items:center;justify-content:center;align-self:center;height:80%;border:2px solid var(--mq-acc);border-radius:.3em;background:linear-gradient(90deg,transparent,var(--mq-hl) 50%,transparent);font-family:'Amiri Quran','Amiri',serif;font-size:.62em;line-height:1}",
    ".mq-ban b{font-weight:700;font-family:inherit}",
    ".mq-bsm{display:flex;align-items:center;justify-content:center;font-family:'Amiri Quran','Amiri',serif;font-size:.62em;line-height:1}",
    ".mq-bar{position:absolute;left:0;right:0;z-index:3;background:var(--mq-bar);border:solid var(--mq-line);transition:transform .22s ease,opacity .22s ease}",
    ".mq-top{top:0;border-width:0 0 1px;padding:calc(env(safe-area-inset-top,0px) + 6px) 8px 6px;display:flex;align-items:center;gap:4px;transform:translateY(-105%);opacity:0}",
    ".mq-bot{bottom:0;border-width:1px 0 0;padding:8px 12px calc(env(safe-area-inset-bottom,0px) + 8px);direction:rtl;transform:translateY(105%);opacity:0}",
    ".mq.bars .mq-top,.mq.bars .mq-bot{transform:none;opacity:1}",
    ".mq-ic{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex:none}",
    ".mq-ic:active{background:var(--mq-line)}",
    ".mq-ic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".mq-tt{flex:1;min-width:0;text-align:center;line-height:1.25}.mq-tt b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mq-tt small{opacity:.75;font-size:12.5px}",
    ".mq-r1{display:flex;align-items:center;gap:6px}.mq-r1 input[type=range]{flex:1;min-width:0;accent-color:var(--mq-acc);height:32px}",
    ".mq-r2{display:flex;gap:8px;margin-top:6px}.mq-r2 select{flex:1}",
    ".mq-sh,.mq-sea{position:absolute;z-index:5;background:var(--mq-bg);color:var(--mq-ink)}",
    ".mq-sh{left:0;right:0;bottom:0;border-top:1px solid var(--mq-line);border-radius:18px 18px 0 0;padding:14px 16px calc(env(safe-area-inset-bottom,0px) + 16px);box-shadow:0 -10px 30px rgba(0,0,0,.25);max-height:80%;overflow-y:auto;display:none}",
    ".mq-sh.on{display:block}",
    ".mq-sh h3{margin:0 0 12px;font-size:17px}",
    ".mq-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid var(--mq-line)}",
    ".mq-row:last-of-type{border-bottom:0}.mq-lb{font-size:15px}",
    ".mq-sw{width:48px;height:28px;border-radius:99px;background:var(--mq-line);position:relative;flex:none;transition:background .15s}",
    ".mq-sw::after{content:'';position:absolute;top:3px;right:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .15s}",
    ".mq-sw[aria-checked=true]{background:var(--mq-acc)}.mq-sw[aria-checked=true]::after{transform:translateX(-20px)}",
    ".mq-ths{display:flex;gap:8px}.mq-th{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;padding:4px}",
    ".mq-th i{width:34px;height:34px;border-radius:50%;border:2px solid var(--mq-line);display:block}",
    ".mq-th[aria-pressed=true] i{border-color:var(--mq-acc);box-shadow:0 0 0 2px var(--mq-acc)}",
    ".mq-sg{display:flex;gap:6px}.mq-sg button{padding:8px 10px;border:1px solid var(--mq-line);font-size:13.5px}",
    ".mq-sg button[aria-pressed=true]{background:var(--mq-acc);border-color:var(--mq-acc);color:#fff}",
    ".mq-ft{display:flex;gap:8px;margin-top:12px}.mq-ft button{flex:1;padding:11px;border:1px solid var(--mq-line);font-weight:600}",
    ".mq-ft button.p{background:var(--mq-acc);border-color:var(--mq-acc);color:#fff}",
    ".mq-sea{inset:0;display:none;flex-direction:column;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}.mq-sea.on{display:flex}",
    ".mq-sh0{flex:none;display:flex;align-items:center;gap:4px;padding:8px;border-bottom:1px solid var(--mq-line)}.mq-sh0 input{flex:1;font-size:16px}",
    ".mq-cnt{flex:none;padding:8px 16px;font-size:13px;opacity:.8}",
    ".mq-lst{flex:1;min-height:0;overflow-y:auto;padding:0 10px 16px;-webkit-overflow-scrolling:touch}",
    ".mq-r{display:block;width:100%;text-align:right;padding:10px 12px;margin:0 0 8px;border:1px solid var(--mq-line)!important;border-radius:14px;background:var(--mq-bar)!important}",
    ".mq-rh{font-size:12.5px;opacity:.78;margin-bottom:4px}",
    ".mq-rt{font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:20px;line-height:2;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
    ".mq-rt mark{background:var(--mq-hl);color:inherit;border-radius:4px;padding:0 2px}",
    ".mq-msg{padding:24px 16px;text-align:center;opacity:.85;line-height:1.8}",
    ".mq-more{display:block;margin:6px auto 0;padding:10px 18px!important;border:1px solid var(--mq-line)!important}"
  ].join("\n");

  var ICON = {
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    set: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>'
  };

  var ov, stage, bodyEl, pageEl, tTitle, tSub, mJuz, mSur, mNum, rng, selS, selJ, shEl, seaEl, seaIn, seaCnt, seaLst, palEl;
  var on = false, cur = 1, req = 0, hlKey = null, wl = null, built = false, closing = false;

  function css() { var s = el("style"); s.id = "mqCss"; s.textContent = CSS; D.head.appendChild(s); }

  function build() {
    if (built) return; built = true; css();
    ov = el("div", "mq nt"); ov.id = "mq"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", T.title); ov.dir = EN ? "ltr" : "rtl";
    var h = '';
    h += '<div class="mq-st" id="mqSt"><div class="mq-meta" id="mqMt"><span id="mqJuz"></span><span id="mqSurH"></span></div>' +
      '<div class="mq-bd" id="mqBd"><div class="mq-pg" id="mqPg" dir="rtl"></div></div>' +
      '<div class="mq-meta ft" id="mqMb"><span id="mqNum"></span></div></div>';
    h += '<div class="mq-bar mq-top" id="mqTop"><button type="button" class="mq-ic" id="mqX" aria-label="' + T.back + '">' + ICON.x + '</button>' +
      '<div class="mq-tt"><b id="mqTt"></b><small id="mqTs"></small></div>' +
      '<button type="button" class="mq-ic" id="mqSb" aria-label="' + T.search + '">' + ICON.search + '</button>' +
      '<button type="button" class="mq-ic" id="mqGb" aria-label="' + T.settings + '">' + ICON.set + '</button></div>';
    h += '<div class="mq-bar mq-bot" id="mqBot"><div class="mq-r1"><button type="button" class="mq-ic" id="mqPv" aria-label="' + T.prev + '">' + ICON.prev + '</button>' +
      '<input type="range" id="mqRg" min="1" max="604" step="1" value="1" dir="rtl" aria-label="' + T.slider + '">' +
      '<button type="button" class="mq-ic" id="mqNx" aria-label="' + T.next + '">' + ICON.next + '</button></div>' +
      '<div class="mq-r2"><select id="mqSs" aria-label="' + T.surah + '"></select><select id="mqSj" aria-label="' + T.juzSel + '"></select></div></div>';
    h += '<div class="mq-sh" id="mqSh" role="dialog" aria-label="' + T.sTitle + '"></div>';
    h += '<div class="mq-sea" id="mqSea"><div class="mq-sh0"><button type="button" class="mq-ic" id="mqSx" aria-label="' + T.close + '">' + ICON.x + '</button>' +
      '<input type="search" id="mqSi" dir="rtl" placeholder="' + T.ph + '" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
      '<div class="mq-cnt" id="mqCn"></div><div class="mq-lst" id="mqLs"></div></div>';
    ov.innerHTML = h; D.body.appendChild(ov);

    stage = g("mqSt"); bodyEl = g("mqBd"); pageEl = g("mqPg"); tTitle = g("mqTt"); tSub = g("mqTs"); mJuz = g("mqJuz"); mSur = g("mqSurH"); mNum = g("mqNum");
    rng = g("mqRg"); selS = g("mqSs"); selJ = g("mqSj"); shEl = g("mqSh"); seaEl = g("mqSea"); seaIn = g("mqSi"); seaCnt = g("mqCn"); seaLst = g("mqLs");
    palEl = el("style"); palEl.id = "mqPal"; D.head.appendChild(palEl);

    var i, o;
    for (i = 1; i <= 114; i++) { o = el("option", "", num(i) + ". " + surahName(QV, i)); o.value = i; selS.appendChild(o); }
    for (i = 1; i <= 30; i++) { o = el("option", "", T.juz + " " + num(i)); o.value = i; selJ.appendChild(o); }

    wire(); buildSettings();
    try { new ResizeObserver(function () { clearTimeout(build.rt); build.rt = setTimeout(fit, 60); }).observe(bodyEl); } catch (e) {}
  }

  function buildSettings() {
    var h = '<h3>' + T.sTitle + '</h3>' +
      '<div class="mq-row"><span class="mq-lb">' + T.colors + '</span><button type="button" class="mq-sw" id="mqC" role="switch" aria-checked="true"></button></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.bg + '</span><div class="mq-ths" id="mqTh"></div></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.view + '</span><div class="mq-sg" id="mqVw"><button type="button" data-m="full">' + T.full + '</button><button type="button" data-m="scroll">' + T.scroll + '</button></div></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.info + '</span><button type="button" class="mq-sw" id="mqI" role="switch" aria-checked="true"></button></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.awake + '</span><button type="button" class="mq-sw" id="mqW" role="switch" aria-checked="false"></button></div>' +
      '<div class="mq-ft"><button type="button" id="mqRs">' + T.reset + '</button><button type="button" class="p" id="mqDn">' + T.done + '</button></div>';
    shEl.innerHTML = h;
    var ths = g("mqTh");
    ["paper", "white", "night", "black"].forEach(function (k) {
      var b = el("button", "mq-th"); b.type = "button"; b.dataset.t = k; b.setAttribute("aria-pressed", "false");
      var sw = el("i"); sw.style.background = THEMES[k].bg; b.appendChild(sw); b.appendChild(el("span", "", T[k])); ths.appendChild(b);
    });
    g("mqC").addEventListener("click", function () { S.c = S.c ? 0 : 1; applySet(); saveSet(); render(cur, true); });
    g("mqI").addEventListener("click", function () { S.i = S.i ? 0 : 1; applySet(); saveSet(); fit(); });
    g("mqW").addEventListener("click", function () { S.w = S.w ? 0 : 1; applySet(); saveSet(); wake(!!S.w); });
    ths.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S.t = b.dataset.t; applySet(); saveSet(); render(cur, true); });
    g("mqVw").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S.m = b.dataset.m; applySet(); saveSet(); fit(); });
    g("mqRs").addEventListener("click", function () { S.c = 1; S.m = "full"; S.i = 1; S.w = 0; S.t = ""; loadSetDefaults(); applySet(); saveSet(); wake(false); render(cur, true); });
    g("mqDn").addEventListener("click", function () { closePanels(); });
  }
  function loadSetDefaults() { var r2 = D.documentElement, dk = r2.dataset.theme === "dark" || (!r2.dataset.theme && G.matchMedia && matchMedia("(prefers-color-scheme:dark)").matches); S.t = dk ? "night" : "paper"; }

  function applySet() {
    var th = THEMES[S.t];
    ov.style.setProperty("--mq-bg", th.bg); ov.style.setProperty("--mq-ink", th.ink); ov.style.setProperty("--mq-bar", th.bar);
    ov.style.setProperty("--mq-line", th.line); ov.style.setProperty("--mq-acc", th.acc); ov.style.setProperty("--mq-hl", th.hl);
    ov.style.colorScheme = th.dark ? "dark" : "light";
    g("mqC").setAttribute("aria-checked", S.c ? "true" : "false");
    g("mqI").setAttribute("aria-checked", S.i ? "true" : "false");
    g("mqW").setAttribute("aria-checked", S.w ? "true" : "false");
    [].forEach.call(g("mqTh").children, function (b) { b.setAttribute("aria-pressed", b.dataset.t === S.t ? "true" : "false"); });
    [].forEach.call(g("mqVw").children, function (b) { b.setAttribute("aria-pressed", b.dataset.m === S.m ? "true" : "false"); });
    g("mqMt").style.display = S.i ? "" : "none"; g("mqMb").style.display = S.i ? "" : "none";
    bodyEl.classList.toggle("sc", S.m === "scroll");
  }

  function palette(pg) {
    var th = THEMES[S.t], cols = th.dark ? TJD : TJL, map = { 0: th.ink }, r, oc = [], i;
    for (r in PALIDX) PALIDX[r].forEach(function (ix) { map[ix] = S.c ? cols[r] : th.ink; });
    for (i in map) oc.push(i + " " + map[i]);
    palEl.textContent = "@font-palette-values --mshf{font-family:QPC" + pg + ";base-palette:0;override-colors:" + oc.join(",") + "}";
  }

  /* ===== الخط والعرض ===== */
  var FF = {};
  function font(pg, cb) {
    if (typeof G.tjFont === "function") { try { return G.tjFont(pg, cb); } catch (e) {} }
    var st = FF[pg]; if (st === 1) return cb(true); if (st && st.push) { st.push(cb); return; }
    FF[pg] = [cb];
    var u = new URL("fonts/p" + ("00" + pg).slice(-3) + ".woff", location.href).href;
    function done(ok) { var q = FF[pg]; FF[pg] = ok ? 1 : null; q.forEach(function (f) { f(ok); }); }
    fetch(u).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (buf) { var ff = new FontFace("QPC" + pg, buf); return ff.load().then(function () { D.fonts.add(ff); done(true); }); })
      .catch(function () { done(false); });
  }

  function go(pg, hl) {
    pg = Math.max(1, Math.min(604, Math.round(+pg) || 1));
    var tok = ++req; cur = pg; hlKey = hl || null;
    meta(pg);
    if (pageEl.firstChild) pageEl.classList.add("ld");
    font(pg, function (ok) {
      if (tok !== req) return;
      if (!ok) { fontError(pg); return; }
      render(pg);
    });
    [pg - 1, pg + 1].forEach(function (p) { if (p >= 1 && p <= 604) font(p, function () {}); });
  }
  function fontError(pg) {
    pageEl.classList.remove("ld"); pageEl.innerHTML = ""; pageEl.style.cssText = "";
    var m = el("div", "mq-msg", T.fontFail), b = el("button", "mq-more", T.retry); b.type = "button"; b.onclick = function () { go(pg, hlKey); };
    m.appendChild(el("br")); m.appendChild(b); pageEl.style.display = "block"; pageEl.appendChild(m);
  }
  function meta(pg) {
    var s = surahOfPage(idx(), pg), nm = surahName(QV, s);
    tTitle.textContent = (EN ? T.surah + " " : "سورة ") + nm;
    tSub.textContent = T.juz + " " + num(juzOf(pg)) + " · " + T.page + " " + num(pg);
    mJuz.textContent = T.juz + " " + num(juzOf(pg)); mSur.textContent = (EN ? T.surah + " " : "سورة ") + nm; mNum.textContent = num(pg);
    rng.value = pg; selS.value = s; selJ.value = juzOf(pg);
  }
  function render(pg, keep) {
    palette(pg);
    pageEl.style.cssText = ""; pageEl.classList.remove("ld");
    pageEl.style.setProperty("--qf", "QPC" + pg);
    pageEl.innerHTML = pageHTML(QV, idx(), pg);
    fit(); hlApply();
    try { if (D.fonts) { D.fonts.load("40px QPC" + pg, "\uFB50").then(fit, function () {}); D.fonts.ready.then(fit); } } catch (e) {}
    setTimeout(fit, 150); setTimeout(fit, 700);
    if (!keep) saveLast(pg);
  }
  function fit() {
    if (!on || !pageEl.firstChild || !pageEl.querySelector(".mq-l")) return;
    var W = bodyEl.clientWidth - 16, H = bodyEl.clientHeight - 6;
    if (W <= 0 || H <= 0) return;
    var rows = QV.L[cur - 1].length, mx = 0;
    pageEl.style.width = W + "px"; pageEl.style.fontSize = "40px"; pageEl.style.height = "auto"; pageEl.style.gridTemplateRows = "";
    [].forEach.call(pageEl.querySelectorAll(".mq-l"), function (l) {
      var w = 0, n = 0; [].forEach.call(l.querySelectorAll(".qw"), function (x) { w += x.getBoundingClientRect().width; n++; });
      if (n) { w += (n - 1) * 0.22 * 40; if (w > mx) mx = w; }
    });
    if (!mx) return;
    var fsW = 40 * W / mx, fs, rowH;
    if (S.m === "full") { fs = Math.min(fsW, (H / rows) / 1.62, 70); rowH = Math.min(H / rows, fs * 2.15); }
    else { fs = Math.min(fsW, 70); rowH = fs * 1.95; }
    pageEl.style.fontSize = fs.toFixed(2) + "px";
    pageEl.style.width = Math.min(W, mx * fs / 40).toFixed(1) + "px";
    pageEl.style.gridTemplateRows = "repeat(" + rows + "," + rowH.toFixed(1) + "px)";
    pageEl.style.height = (rows * rowH).toFixed(1) + "px";
  }
  function hlClear() { [].forEach.call(pageEl.querySelectorAll(".mq-hlw"), function (w) { w.classList.remove("mq-hlw"); }); }
  function hlApply() {
    hlClear(); if (!hlKey) return;
    [].forEach.call(pageEl.querySelectorAll('[data-a="' + hlKey + '"] .qw, .qw[data-a="' + hlKey + '"]'), function (w) { w.classList.add("mq-hlw"); });
  }

  /* ===== التنقل والأشرطة واللوحات ===== */
  var barTm = 0;
  function bars(v, auto) {
    clearTimeout(barTm); ov.classList.toggle("bars", !!v);
    if (v && auto) barTm = setTimeout(function () { if (!panelOpen()) ov.classList.remove("bars"); }, auto);
  }
  function panelOpen() { return shEl.classList.contains("on") || seaEl.classList.contains("on"); }
  function closePanels() { shEl.classList.remove("on"); seaEl.classList.remove("on"); try { seaIn.blur(); } catch (e) {} }
  function flip(d) { var n = cur + d; if (n < 1 || n > 604) return; go(n); }

  function wire() {
    var down = null;
    stage.addEventListener("pointerdown", function (e) { if (e.button > 0) return; down = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener("pointerup", function (e) {
      if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { flip(dx > 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { if (panelOpen()) closePanels(); else bars(!ov.classList.contains("bars")); }
    });
    stage.addEventListener("pointercancel", function () { down = null; });
    g("mqX").addEventListener("click", function () { close(); });
    g("mqPv").addEventListener("click", function () { flip(-1); });
    g("mqNx").addEventListener("click", function () { flip(1); });
    rng.addEventListener("input", function () { meta(+rng.value); });
    rng.addEventListener("change", function () { go(+rng.value); });
    selS.addEventListener("change", function () { go(idx().spage[+selS.value]); });
    selJ.addEventListener("change", function () { go(juzStart(+selJ.value)); });
    g("mqGb").addEventListener("click", function () { seaEl.classList.remove("on"); shEl.classList.toggle("on"); bars(true); });
    g("mqSb").addEventListener("click", openSearch);
    g("mqSx").addEventListener("click", function () { seaEl.classList.remove("on"); try { seaIn.blur(); } catch (e) {} });
    D.addEventListener("keydown", function (e) {
      if (!on) return;
      var t = e.target && e.target.tagName;
      if (e.key === "Escape") { if (panelOpen()) closePanels(); else close(); return; }
      if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
      if (e.key === "ArrowLeft") flip(1); else if (e.key === "ArrowRight") flip(-1);
    });
    G.addEventListener("popstate", function () { if (on) close(true); });
    D.addEventListener("visibilitychange", function () { if (on && S.w && D.visibilityState === "visible") wake(true); });
  }

  function wake(v) {
    try {
      if (v && navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { wl = l; }).catch(function () {});
      else if (wl) { wl.release(); wl = null; }
    } catch (e) {}
  }

  /* ===== البحث ===== */
  var RECS = null, loading = false, lastRes = null, shown = 0, sTm = 0;
  function loadText(cb) {
    if (RECS) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { RECS = buildSearch(j); cb(true); }).catch(function () { cb(false); });
  }
  function openSearch() {
    shEl.classList.remove("on"); seaEl.classList.add("on");
    setTimeout(function () { try { seaIn.focus(); } catch (e) {} }, 60);
    if (!RECS && !loading) {
      loading = true; seaCnt.textContent = T.prep;
      loadText(function (ok) { loading = false; if (!ok) { seaCnt.textContent = ""; seaLst.innerHTML = ""; var m = el("div", "mq-msg", T.loadFail), b = el("button", "mq-more", T.retry); b.type = "button"; b.onclick = openSearch; m.appendChild(el("br")); m.appendChild(b); seaLst.appendChild(m); return; } seaCnt.textContent = ""; runSearch(); });
    } else runSearch();
  }
  function runSearch() {
    if (!RECS) return;
    var q = seaIn.value; seaLst.innerHTML = ""; lastRes = null; shown = 0;
    if (!q.trim()) { seaCnt.textContent = ""; return; }
    var r = search(RECS, q);
    if (!r) { seaCnt.textContent = T.min; return; }
    lastRes = r;
    if (!r.list.length) { seaCnt.textContent = ""; seaLst.appendChild(el("div", "mq-msg", T.none)); return; }
    seaCnt.textContent = num(r.list.length) + " " + T.res;
    more();
  }
  function more() {
    var old = seaLst.querySelector(".mq-more"); if (old) old.remove();
    var r = lastRes, end = Math.min(r.list.length, shown + 30), i;
    for (i = shown; i < end; i++) seaLst.appendChild(row(r.list[i], r.q.length));
    shown = end;
    if (shown < r.list.length) { var b = el("button", "mq-more", T.more); b.type = "button"; b.onclick = more; seaLst.appendChild(b); }
  }
  function row(h, qlen) {
    var r = h.r, b = el("button", "mq-r"); b.type = "button"; b.dataset.s = r.s; b.dataset.a = r.a;
    b.appendChild(el("div", "mq-rh", surahName(QV, r.s) + " · " + T.ayah + " " + num(r.a) + " · " + T.page + " " + num(pageOfAyah(idx(), r.s, r.a))));
    var tx = el("div", "mq-rt"), set = hitTokens(h, qlen);
    r.tk.forEach(function (t, k) {
      if (k) tx.appendChild(D.createTextNode(" "));
      if (set[k]) tx.appendChild(el("mark", "", t)); else tx.appendChild(D.createTextNode(t));
    });
    b.appendChild(tx); return b;
  }
  function jump(s, a) {
    seaEl.classList.remove("on"); try { seaIn.blur(); } catch (e) {}
    go(pageOfAyah(idx(), s, a), s + ":" + a); bars(false);
  }

  /* ===== فتح الشاشة وإغلاقها ===== */
  function open() {
    build(); if (on) return;
    loadSet(); applySet();
    on = true; ov.classList.add("on"); D.body.classList.add("mq-open");
    try { history.pushState({ mshf: 1 }, ""); } catch (e) {}
    closePanels(); go(lastPage()); bars(true, 2800); if (S.w) wake(true);
  }
  function close(fromPop) {
    if (!on) return; on = false; req++; clearTimeout(barTm);
    ov.classList.remove("on", "bars"); D.body.classList.remove("mq-open"); closePanels(); wake(false);
    segSet("q");
    if (!fromPop) { try { if (history.state && history.state.mshf) history.back(); } catch (e) {} }
  }

  /* ===== خيارا الخانة: قرآني | مصحفي ===== */
  var seg = null;
  function segSet(v) { if (!seg) return; [].forEach.call(seg.children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false"); }); }
  function initSeg() {
    var sec = g("t-qurani"); if (!sec || g("mqSeg")) return;
    seg = el("div", "seg mq-seg"); seg.id = "mqSeg"; seg.setAttribute("role", "group");
    var a = el("button", "", "قرآني"), b = el("button", "", "مصحفي");
    a.type = "button"; b.type = "button"; a.dataset.v = "q"; b.dataset.v = "m";
    seg.appendChild(a); seg.appendChild(b); sec.insertBefore(seg, sec.firstChild); segSet("q");
    seg.addEventListener("click", function (e) { var t = e.target.closest("button"); if (!t) return; if (t.dataset.v === "m") { segSet("m"); open(); } else segSet("q"); });
  }

  D.addEventListener("click", function (e) {
    var r = e.target.closest && e.target.closest("#mq .mq-r"); if (r) jump(+r.dataset.s, +r.dataset.a);
  });
  D.addEventListener("input", function (e) {
    if (e.target && e.target.id === "mqSi") { clearTimeout(sTm); sTm = setTimeout(runSearch, 220); }
  });
  initSeg();
  G.Mushafi = { open: open, close: close, goto: function (p) { build(); go(p); } };
})(typeof window !== "undefined" ? window : this);
