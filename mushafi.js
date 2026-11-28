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
      surah: "السورة", juzSel: "الجزء", prev: "الصفحة السابقة", next: "الصفحة التالية", slider: "رقم الصفحة", close: "إغلاق",
      auto: "تلقائي", frame: "لون الإطار", size: "حجم الخط", lsp: "تباعد الأسطر", big: "كبير", mid: "متوسط", sml: "صغير", tight: "متقارب", norm: "عادي", loose: "متباعد", none: "بدون",
      green: "أخضر", gold: "ذهبي", blue: "أزرق", brown: "بني", cream: "ورقي", sand: "بيج", mint: "أخضر فاتح", gray: "رمادي",
      noteQ: "قرآني: للمراجعة والحفظ والتسميع، بألوان التجويد ومهامك اليومية.", noteM: "مصحفي: للقراءة فقط، صفحة كاملة على الشاشة مع بحث وإعدادات.",
      mRead: "قراءة", mStudy: "حفظ", mReview: "مراجعة", mTasmee: "تسميع", today: "مهام اليوم", guide: "دليل التجويد", goto: "الانتقال إلى", hifzPos: "موضع حفظي", rvPos: "موضع مراجعتي", lastRead: "آخر قراءة", go: "اذهب", pageNo: "رقم الصفحة", rep: "التكرار", repAdd: "+١ تكرار", repHint: "كرّر الصفحة ٩ مرات للحفظ", repDone: "اكتملت ٩ تكرارات", ayah: "آية", robotDef: "المسمّع الآلي", micHintF: "اضغطي الميكروفون وسمّعي من حفظك",  showAll: "أظهر الكل", hideAll: "أخفِ الكل", nextAya: "الآية التالية", revealPage: "اكشف", okBtn: "بلا خطأ", badBtn: "أخطأت", lastTas: "آخر تسميع", tasOk: "بلا خطأ", tasBad: "بأخطاء", mic: "ابدأ", micStop: "إيقاف", from: "ابدأ من", micHint: "اضغط الميكروفون وسمّع من حفظك", listening: "أسمعك… ", words: "كلمة", errs: "أخطاء", stopped: "تم الإيقاف", doneOk: "أحسنت! أتممت الصفحة بلا أخطاء ✓", doneErr: "أتممت الصفحة، وعدد الأخطاء: %n", noSR: "متصفحك لا يدعم التعرّف على الصوت. جرّب Chrome، أو استخدم التسميع اليدوي.", micDenied: "لم يُسمح باستخدام الميكروفون. فعّله من إعدادات المتصفح.", srErr: "تعذّر التعرّف على الصوت. تحقق من الإنترنت.", prepText: "جارٍ تجهيز النص…", textFail: "تعذّر تحميل نص القرآن اللازم للتسميع الآلي.", finStudy: "أنهيت حفظي", finReview: "أنهيت مراجعتي", finTasmee: "أنهيت تسميعي", finUndo: "إلغاء", yourSec: "هذا قسمك الحالي", optional: "اختياري", recorded: "سُجّل", dayDone: "وأنهيت يومك كاملًا 🎉", noPlan: "لم تضبط موضع حفظك بعد، فلا توجد مهام لليوم.", taskRead: "اقرأ", taskReview: "راجع", taskTasmee: "سمّع", taskAuto: "آلي", kahfSet: "تذكير سورة الكهف كل جمعة", kahfT: "جمعة مباركة", kahfH: "قال ﷺ: «مَنْ قَرَأَ سُورَةَ الْكَهْفِ يَوْمَ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ»", kahfSrc: "رواه الحاكم والبيهقي وصححه الألباني", kahfGo: "اقرأها الآن", kahfLater: "لاحقًا" },
    en: { seg1: "Quran", seg2: "My Mushaf", back: "Back", search: "Search", settings: "Settings", juz: "Juz", page: "Page", ayah: "Verse",
      title: "Mushaf", sTitle: "Mushaf settings", colors: "Tajweed colours", bg: "Page background", paper: "Paper", white: "White", night: "Night", black: "Black",
      view: "Page view", full: "Whole page", scroll: "Full width", info: "Show page header and footer", awake: "Keep screen on", reset: "Reset", done: "Done",
      ph: "Search a word in the Quran…", res: "results", more: "Show more", none: "No results", min: "Type at least two letters", prep: "Preparing search…",
      loadFail: "Could not load the Quran text for search. Check your connection and try again.", fontFail: "Could not load this page's font. Check your connection.", retry: "Retry",
      surah: "Surah", juzSel: "Juz", prev: "Previous page", next: "Next page", slider: "Page number", close: "Close",
      auto: "Auto", frame: "Frame colour", size: "Text size", lsp: "Line spacing", big: "Large", mid: "Medium", sml: "Small", tight: "Tight", norm: "Normal", loose: "Loose", none: "None",
      green: "Green", gold: "Gold", blue: "Blue", brown: "Brown", cream: "Cream", sand: "Sand", mint: "Mint", gray: "Gray",
      noteQ: "Qurani: for review, memorisation and recitation, with tajweed colours and your daily tasks.", noteM: "My Mushaf: for reading only, a full page on screen with search and settings.",
      mRead: "Read", mStudy: "Memorize", mReview: "Review", mTasmee: "Recite", today: "Today's tasks", guide: "Tajweed guide", goto: "Go to", hifzPos: "My memorization spot", rvPos: "My review spot", lastRead: "Last read", go: "Go", pageNo: "Page number", rep: "Repetitions", repAdd: "+1 rep", repHint: "Repeat the page 9 times to memorize", repDone: "9 repetitions done", ayah: "Verse", robotDef: "Auto Reciter", micHintF: "Tap the mic and recite from memory",  showAll: "Show all", hideAll: "Hide all", nextAya: "Next verse", revealPage: "Reveal", okBtn: "No mistakes", badBtn: "Mistakes", lastTas: "Last recital", tasOk: "No mistakes", tasBad: "With mistakes", mic: "Start", micStop: "Stop", from: "Start from", micHint: "Tap the mic and recite from memory", listening: "Listening… ", words: "words", errs: "Mistakes", stopped: "Stopped", doneOk: "Well done! Page completed with no mistakes ✓", doneErr: "Page completed. Mistakes: %n", noSR: "Your browser does not support speech recognition. Try Chrome, or use manual recital.", micDenied: "Microphone access was denied. Enable it in browser settings.", srErr: "Speech recognition failed. Check your connection.", prepText: "Preparing text…", textFail: "Could not load the Quran text needed for auto recital.", finStudy: "I finished memorizing", finReview: "I finished reviewing", finTasmee: "I finished reciting", finUndo: "Undo", yourSec: "your current section", optional: "optional", recorded: "Recorded", dayDone: "and you finished your whole day 🎉", noPlan: "You have not set your memorization spot yet, so there are no tasks today.", taskRead: "Read", taskReview: "Review", taskTasmee: "Recite", taskAuto: "Auto", kahfSet: "Friday reminder for Surat Al-Kahf", kahfT: "Blessed Friday", kahfH: "The Prophet ﷺ said: whoever reads Surat Al-Kahf on Friday, a light will shine for him between the two Fridays.", kahfSrc: "Narrated by Al-Hakim and Al-Bayhaqi", kahfGo: "Read it now", kahfLater: "Later" }
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

  /* الفاتحة وأول صفحة من البقرة: تُحذف الأسطر الفارغة حول المحتوى ليقع في منتصف الشاشة تمامًا */
  function rowsOf(QV, pg) {
    var L = QV.L[pg - 1]; if (pg > 2) return L;
    var a = 0, b = L.length; while (a < b && L[a] === 0) a++; while (b > a && L[b - 1] === 0) b--;
    return L.slice(a, b);
  }
  /* صفحة المصحف: أسطرها كما في المطبوع (15 موضعًا: سطر كلمات، أو فراغ، أو لوحة سورة، أو بسملة) */
  function pageHTML(QV, X, pg) {
    var L = rowsOf(QV, pg), id = X.ps[pg - 1], mxw = 0, h = "", i;
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

  /* ===== التسميع الآلي: مطابقة ما يُسمع بكلمات الصفحة (منطق نقيّ، يُختبر خارج المتصفح) ===== */
  /* تشابه كلمتين مطبَّعتين: 1 = متطابقتان، 0 = مختلفتان تمامًا (مسافة ليفنشتاين) */
  function wsim(a, b) {
    if (a === b) return 1; if (!a || !b) return 0;
    var n = a.length, m = b.length, p = [], c, i, j, t;
    for (j = 0; j <= m; j++) p[j] = j;
    for (i = 1; i <= n; i++) {
      c = [i];
      for (j = 1; j <= m; j++) { t = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1; c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + t); }
      p = c;
    }
    return 1 - p[m] / Math.max(n, m);
  }
  function tokenize(s) { var n = norm(s); return n ? n.split(" ") : []; }
  var BSMN = "بسم لله لرحمن لرحيم";
  /* السور التي تبدأ بحروف مقطّعة: يقرؤها القارئ أسماءً (ألف لام ميم) فلا تُطابَق بحرفها */
  var MQS = { 2: 1, 3: 1, 7: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 19: 1, 20: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 32: 1, 36: 1, 38: 1, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1, 46: 1, 50: 1, 68: 1 };
  var LETTER = {};
  ["الف", "لام", "ميم", "صاد", "را", "كاف", "ها", "يا", "عين", "طا", "سين", "حا", "قاف", "نون", "الم", "طه", "يس", "حم", "عسق", "كهيعص"].forEach(function (x) { LETTER[norm(x)] = 1; });

  /* كلمات صفحة المصحف بالترتيب (بلا علامات نهاية الآيات) مع هيكل كل كلمة من نص القرآن.
     إن اختلف عدد كلمات الآية في النص عن عدد رموزها في الخط، تُوزَّع بالنسبة وتُعلَّم «غامضة» فيُتسامح معها. */
  function buildE(QV, X, pg, tokOf) {
    var w0 = X.ps[pg - 1], w1 = pg < 604 ? X.ps[pg] : QV.W.length, E = [], i, s, a, key, k, cnt, off, tk, n, fz;
    for (i = w0; i < w1; i++) {
      if (X.m[i]) continue;
      s = X.s[i]; a = X.a[i]; key = s + ":" + a; k = X.keys[key]; cnt = QV.AY[k] - 1; off = i - X.first[k]; tk = tokOf && tokOf[key]; fz = false; n = "";
      if (tk && tk.length) {
        if (tk.length === cnt) n = tk[off]; else { n = tk[Math.min(tk.length - 1, Math.floor(off * tk.length / cnt))]; fz = true; }
      } else fz = true;
      E.push({ i: i, s: s, a: a, key: key, n: n || "", af: off === 0, fz: fz, mq: off === 0 && !!MQS[s] && (a === 1 || (s === 42 && a === 2)) });
    }
    return E;
  }

  /* المحرّك: يستقبل كلمات مسموعة ويقدّم مؤشّر الكلمة المتوقَّعة.
     feed(T, from, fin) يعالج T[from..] ويعيد {used: كم رمزًا استُهلك، ev: [{i, ok}]}.
     النتائج المؤقتة (fin=false) لا تُحاسَب على خطأ: يتوقف المحرّك عند أول كلمة غير محسومة وتُعاد دراستها مع النتيجة النهائية. */
  function Engine(E, o) { o = o || {}; this.E = E; this.p = o.start || 0; this.err = 0; this.tol = o.tol || .75; this.done = this.p >= E.length; }
  Engine.prototype.feed = function (T, from, fin) {
    var E = this.E, ev = [], j = from, tol = this.tol, e, t, nx, nn, tl, conf;
    while (j < T.length && this.p < E.length) {
      e = E[this.p]; t = T[j]; tl = e.fz ? tol - .12 : tol; nx = E[this.p + 1]; nn = E[this.p + 2];
      if (e.af && e.a === 1 && T.length - j >= 4 && T.slice(j, j + 4).join(" ") === BSMN) { j += 4; continue; }          /* بسملة قبل أول آية */
      if (!e.n) { ev.push({ i: this.p, ok: true }); this.p++; continue; }                                                  /* لا نص لهذه الكلمة: تمرّ */
      if (e.mq) { ev.push({ i: this.p, ok: true }); this.p++; j++; while (j < T.length && LETTER[T[j]]) j++; continue; }  /* الحروف المقطّعة */
      if (wsim(e.n, t) >= tl) { ev.push({ i: this.p, ok: true }); this.p++; j++; continue; }
      if (T[j + 1] && (t + T[j + 1]).length >= 6 && wsim(e.n, t + T[j + 1]) >= .85) { ev.push({ i: this.p, ok: true }); this.p++; j += 2; continue; }   /* كلمة فصلها التعرّف */
      if (nx && nx.n && (e.n + nx.n).length >= 6 && wsim(e.n + nx.n, t) >= .88) { ev.push({ i: this.p, ok: true }, { i: this.p + 1, ok: true }); this.p += 2; j++; continue; }   /* كلمتان دمجهما التعرّف */
      if (nx && nx.n && wsim(nx.n, t) >= tol) {                                                                             /* تخطّى كلمة */
        conf = fin || !nn || !nn.n || (T[j + 1] && wsim(nn.n, T[j + 1]) >= tol);
        if (!conf) break;
        ev.push({ i: this.p, ok: false }, { i: this.p + 1, ok: true }); this.err++; this.p += 2; j++; continue;
      }
      if (T[j + 1] && wsim(e.n, T[j + 1]) >= tl) { j++; continue; }                                                         /* كلمة زائدة من التعرّف */
      if (!fin) break;
      ev.push({ i: this.p, ok: false }); this.err++; this.p++; j++;                                                         /* خطأ: كلمة مغايرة */
    }
    if (this.p >= E.length) this.done = true;
    return { used: j - from, ev: ev };
  };

  if (!NODE) G.MushafiCore = { Engine: Engine, wsim: wsim, tokenize: tokenize, norm: norm };   /* المحرّك نفسه يستعمله «اختباري» فيتساوى الإصغاء في الاثنين */
  if (NODE) { module.exports = { Engine: Engine, buildE: buildE, wsim: wsim, tokenize: tokenize, norm: norm, makeIndex: makeIndex, pageOfAyah: pageOfAyah, surahOfPage: surahOfPage, surahName: surahName, pageHTML: pageHTML, rowsOf: rowsOf, buildSearch: buildSearch, search: search, hitTokens: hitTokens, juzOf: juzOf, juzStart: juzStart }; return; }

  /* ===== 2) الواجهة ===== */
  var D = document, QV = G.QV4;
  if (!QV || !QV.W) return;
  function g(id) { return D.getElementById(id); }
  function el(tag, cls, txt) { var e = D.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  var X = null; function idx() { return X || (X = makeIndex(QV)); }

  /* ألوان الصفحة هي نفسها خيارات «شكل صفحات المصحف» في إعدادات التطبيق، فيتبدّل «قرآني» و«مصحفي» معًا */
  var THEMES = {
    cream: { bg: "#f6edd6", ink: "#2b2417", bar: "#eadfbf", line: "#d4c394", acc: "#2f7d4a", hl: "rgba(184,146,58,.42)", dark: 0 },
    white: { bg: "#ffffff", ink: "#111111", bar: "#eef1f6", line: "#d3d9e4", acc: "#1d5fd1", hl: "rgba(255,196,0,.38)", dark: 0 },
    sand: { bg: "#f3e6c8", ink: "#2b2417", bar: "#e6d6ac", line: "#cdb985", acc: "#2f7d4a", hl: "rgba(184,146,58,.42)", dark: 0 },
    mint: { bg: "#e6f2e3", ink: "#14301c", bar: "#d4e6d0", line: "#b4cfae", acc: "#2f7d4a", hl: "rgba(184,146,58,.40)", dark: 0 },
    gray: { bg: "#e9edf2", ink: "#111827", bar: "#dbe1e9", line: "#c0c9d6", acc: "#1d5fd1", hl: "rgba(255,196,0,.38)", dark: 0 },
    night: { bg: "#0b1b3a", ink: "#eaf1ff", bar: "#14274d", line: "#27406d", acc: "#6ea0ff", hl: "rgba(255,200,60,.30)", dark: 1 },
    black: { bg: "#000000", ink: "#e9e9e9", bar: "#161616", line: "#2b2b2b", acc: "#7db0ff", hl: "rgba(255,200,60,.30)", dark: 1 }
  };
  var FRAMES = { green: "#3f9a5f", gold: "#c9a24a", blue: "#4a7fd4", brown: "#a56a2e", none: "transparent" };
  var SWATCH = { cream: "#f6edd6", white: "#ffffff", sand: "#f3e6c8", mint: "#e6f2e3", gray: "#e9edf2", night: "#0b1b3a", black: "#000000" };
  function isDark() { var r2 = D.documentElement, t = r2.getAttribute("data-theme"); return t === "dark" || (!t && G.matchMedia && matchMedia("(prefers-color-scheme:dark)").matches); }
  /* إعدادات الشكل المشتركة مع التطبيق (data-mp / data-mf / data-ms / data-ml) */
  function pref() { var r = D.documentElement; return { p: r.getAttribute("data-mp") || "", f: r.getAttribute("data-mf") || "", s: r.getAttribute("data-ms") || "", l: r.getAttribute("data-ml") || "" }; }
  function themeKey() { var p = pref().p; return THEMES[p] ? p : (isDark() ? "night" : "cream"); }
  function setPref(k, v) { if (G.MPREF) G.MPREF.set(k, v); }
  var TJL = { lazim: "#8f0d24", wajib: "#e0282d", jawaz: "#e56a00", madd2: "#a36b00", ghunna: "#1e8a3c", gray: "#8f8f8f", tafkhim: "#1e3a8a", qalqala: "#1f7fd0" };
  var TJD = { lazim: "#ff6b81", wajib: "#ff5a5f", jawaz: "#ff9a3c", madd2: "#e0b04a", ghunna: "#4fd47a", gray: "#a3a3a3", tafkhim: "#7da2ff", qalqala: "#5db5ff" };
  var PALIDX = { lazim: [3], wajib: [9], jawaz: [4], madd2: [5], ghunna: [6], gray: [1, 2, 15], tafkhim: [7], qalqala: [8] };

  var S = { c: 1, m: "full", i: 1, w: 0, k: 1 };
  function loadSet() {
    try { var r = JSON.parse(localStorage.getItem("mshf_set") || "null"); if (r) { if (r.c === 0 || r.c === 1) S.c = r.c; if (r.m === "full" || r.m === "scroll") S.m = r.m; if (r.i === 0 || r.i === 1) S.i = r.i; if (r.w === 0 || r.w === 1) S.w = r.w; if (r.k === 0 || r.k === 1) S.k = r.k; } } catch (e) {}
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
    ".mq-ban{display:flex;align-items:center;justify-content:center;align-self:center;height:80%;border:2px solid var(--mq-fr,var(--mq-acc));border-radius:.3em;background:linear-gradient(90deg,transparent,var(--mq-hl) 50%,transparent);font-family:'Amiri Quran','Amiri',serif;font-size:.62em;line-height:1}",
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
    ".mq-r1{display:flex;align-items:center;gap:6px}.mq-r1 select{flex:1}",
    ".mq-row.col{flex-direction:column;align-items:stretch;gap:8px}.mq-row.col .mq-ths{flex-wrap:wrap}",
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
    ".mq-more{display:block;margin:6px auto 0;padding:10px 18px!important;border:1px solid var(--mq-line)!important}",
    ".mq-note{margin:0 0 12px;font-size:12.5px;line-height:1.7;color:var(--mut);opacity:.9}",
    ".mq-kh{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translate(-50%,-150%);width:min(480px,calc(100% - 20px));box-sizing:border-box;z-index:210;background:var(--card);color:var(--ink);border:2px solid var(--acc);border-radius:18px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:transform .5s cubic-bezier(.22,1.25,.36,1),opacity .3s;opacity:0;font-family:Cairo,Tahoma,sans-serif}",
    ".mq-kh.on{transform:translate(-50%,0);opacity:1}.mq-kh b{display:block;font-size:15px;margin-bottom:2px}",
    ".mq-kh p{margin:0;font-size:14px;line-height:1.9}.mq-kh small{display:block;margin-top:2px;font-size:12px;color:var(--mut)}",
    ".mq-kh .kb{display:flex;gap:8px;margin-top:10px}.mq-kh .kb button{flex:1;padding:9px 10px;border:1px solid var(--line);border-radius:12px;font:inherit;font-weight:600;background:var(--card);color:var(--ink);cursor:pointer}",
    ".mq-kh .kb button.p{background:var(--acc);border-color:var(--acc);color:#fff}",
    ".mq-md{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px!important;border-radius:12px;font-size:11.5px;font-weight:600;line-height:1.3;opacity:.78}",
    ".mq-md svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".mq-md[aria-pressed=true]{background:var(--mq-acc);color:#fff;opacity:1}",
    ".mq-modes{display:flex;gap:4px;margin-bottom:6px}",
    ".mq-act{display:none;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px}.mq.tr .mq-act{display:flex}.mq.tr .mq-r1{display:none}",
    ".mq-mid{flex:1;min-width:0;display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:nowrap}.mq-act .mq-ic{width:34px;flex:none}",
    ".mq .mq-b{padding:6px 9px;border:1px solid var(--mq-line);font-size:13px;font-weight:600;border-radius:12px;display:inline-flex;align-items:center;gap:6px;line-height:1.3}",
    ".mq .mq-b.p{background:var(--mq-acc);border-color:var(--mq-acc);color:#fff}",
    ".mq .mq-b.ok{border-color:#1e8a3c;color:#1e8a3c}.mq .mq-b.bad{border-color:#d93025;color:#d93025}",
    ".mq .mq-b svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".mq-rp{font-size:13.5px}.mq-rp b{font-size:16px}",
    ".mq-mic.rec{animation:mqPulse 1.3s ease-in-out infinite}@keyframes mqPulse{50%{box-shadow:0 0 0 6px rgba(217,48,37,.28)}}",
    ".mq-as{flex-basis:100%;font-size:12.5px;line-height:1.6;text-align:center;opacity:.92;min-height:1.6em}.mq-as.bad{color:#d93025}.mq-as.warn{color:#c2410c}.mq-as.ok{color:#1e8a3c}",
    ".mq-fin{display:none;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px 4px 6px;margin-bottom:6px;border:1px solid var(--mq-line);border-radius:12px;font-size:13px}.mq-fin span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mq .mq-act select{max-width:130px;padding:7px 8px;font-size:13px}",
    ".mq-top .mq-ic{width:40px}.mq-tt{cursor:pointer}.mq-tt small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mq.tr.bars .mq-st{padding-top:var(--mq-th,0px);padding-bottom:var(--mq-bh,0px)}",
    ".mq.hid .mq-pg .aya-t:not(.rev) .qw{visibility:hidden}",
    ".mq.hid .mq-pg .aya-t .qw.on{visibility:visible}",
    ".mq-rb{display:none;align-items:center;gap:8px;margin-bottom:6px;padding:4px 8px;border:1px solid var(--mq-line);border-radius:14px}",
    ".mq-rbi{flex:none;width:34px;height:34px}.mq-rbi .rb{width:34px;height:34px}",
    ".mq-rbt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.4}.mq-rbt b{font-size:13px}",
    ".mq-rbt .mq-as{flex-basis:auto;min-height:0;font-size:11.5px;text-align:start}",
    ".mq-rb select{max-width:78px;padding:6px 6px;font-size:12.5px}",
    ".mq.hid .mq-pg .mq-n{cursor:pointer}",
    ".mq-pg .qw.x{background:rgba(217,48,37,.2);box-shadow:0 0 0 .1em rgba(217,48,37,.65);border-radius:.15em}",
    ".mq-pg .qw{position:relative}",
    /* الكلمات المخفية: أشرطة هادئة تحل محلها، والكلمة المنتظرة تنبض بالذهبي */
    ".mq.hid .mq-pg .aya-t:not(.rev) .qw:not(.on)::before{content:'';position:absolute;inset:.32em -.03em .2em;border-radius:.3em;background:var(--mq-hl);opacity:.3;visibility:visible}",
    ".mq.hid .mq-pg .aya-t:not(.rev) .qw.nx:not(.on)::before{opacity:.75;animation:mqNx 1.3s ease-in-out infinite}",
    "@keyframes mqNx{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}50%{box-shadow:0 0 0 .09em rgba(212,160,23,.9)}}",
    /* ظهور الكلمة: تنبثق بتوهّج ذهبي ثم تستقر */
    ".mq.hid .mq-pg .aya-t.rev .qw{animation:mqIn .5s ease both}",
    ".mq.hid .mq-pg .aya-t .qw.on:not(.x){animation:mqIn .65s cubic-bezier(.22,1.25,.36,1) both}",
    "@keyframes mqIn{0%{opacity:0;transform:translateY(.12em) scale(.82);filter:blur(.05em)}55%{opacity:1;filter:drop-shadow(0 0 .16em rgba(212,160,23,.8))}100%{opacity:1;transform:none;filter:none}}",
    /* وضع الحفظ: النص ظاهر، والمسمّع يظلّل ما قرأتَه */
    ".mq.ast .mq-pg .qw.on:not(.x){background:var(--mq-hl);border-radius:.15em;animation:mqIn .5s ease both}",
    ".mq.ast .mq-pg .qw.nx:not(.on){box-shadow:0 0 0 .08em rgba(212,160,23,.75);border-radius:.15em}",
    ".mq-ps{flex-basis:100%;display:flex;justify-content:center;margin-top:2px}.mq .mq-pos{padding:5px 12px;font-size:12.5px}.mq .mq-pos svg{width:16px;height:16px}",
    ".mq-tk{border:1px solid var(--mq-line);border-radius:14px;padding:10px 12px;margin:0 0 10px}.mq-tk.done{opacity:.7}.mq-tkh small{display:block;opacity:.75;font-size:12.5px;line-height:1.6}.mq-tkb{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.mq-tkb .mq-b{flex:1;justify-content:center}",
    "body.mq-open .tjg{z-index:130}",
    "@media(prefers-reduced-motion:reduce){.mq-mic.rec,.mq.hid .mq-pg .qw,.mq.ast .mq-pg .qw.on,.mq.hid .mq-pg .qw.nx::before{animation:none!important}}",
    "@media(prefers-reduced-motion:reduce){.mq-kh{transition:none}}"
  ].join("\n");

  var ICON = {
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    set: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.6-6-10.2A6 6 0 0 1 18 10.8C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    read: '<svg viewBox="0 0 24 24"><path d="M12 6C9.5 4.5 6 4.5 3 5.5v13c3-1 6.5-1 9 .5 2.5-1.5 6-1.5 9-.5v-13c-3-1-6.5-1-9 .5zM12 6v13"/></svg>',
    study: '<svg viewBox="0 0 24 24"><path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4"/></svg>',
    review: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3 3.5M6.5 7.6A15 15 0 0 0 3 12s4 6 9 6a9 9 0 0 0 3.4-.7M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    tasmee: '<svg viewBox="0 0 24 24"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
    guide: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21c-1.5 0-2-1-2-2 0-2 3-1.5 3-3.5 0-1-1-1.5-1-1.5"/></svg>'
  };

  var ov, stage, bodyEl, pageEl, tTitle, tSub, mJuz, mSur, mNum, selS, selJ, shEl, seaEl, seaIn, seaCnt, seaLst, palEl;
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
      '<div class="mq-tt" id="mqTtl" role="button" tabindex="0" aria-label="' + T.goto + '"><b id="mqTt"></b><small id="mqTs"></small></div>' +
      '<button type="button" class="mq-ic" id="mqTk" aria-label="' + T.today + '">' + ICON.list + '</button>' +
      '<button type="button" class="mq-ic" id="mqGd" aria-label="' + T.guide + '">' + ICON.guide + '</button>' +
      '<button type="button" class="mq-ic" id="mqSb" aria-label="' + T.search + '">' + ICON.search + '</button>' +
      '<button type="button" class="mq-ic" id="mqGb" aria-label="' + T.settings + '">' + ICON.set + '</button></div>';
    h += '<div class="mq-bar mq-bot" id="mqBot"><div class="mq-modes" id="mqMd" role="group">' +
      [["read", T.mRead, ICON.read], ["study", T.mStudy, ICON.study], ["review", T.mReview, ICON.review], ["tasmee", T.mTasmee, ICON.tasmee] ].map(function (o) {
        return '<button type="button" class="mq-md" data-m="' + o[0] + '" aria-pressed="' + (o[0] === "read") + '">' + o[2] + '<span>' + o[1] + '</span></button>'; }).join("") + '</div>' +
      '<div class="mq-rb" id="mqRb"></div><div class="mq-fin" id="mqFn"></div><div class="mq-act" id="mqAc"></div>' +
      '<div class="mq-r1"><button type="button" class="mq-ic" id="mqPv" aria-label="' + T.prev + '">' + ICON.prev + '</button>' +
      '<select id="mqSs" aria-label="' + T.surah + '"></select><select id="mqSj" aria-label="' + T.juzSel + '"></select>' +
      '<button type="button" class="mq-ic" id="mqNx" aria-label="' + T.next + '">' + ICON.next + '</button></div></div>';
    h += '<div class="mq-sh" id="mqSh" role="dialog" aria-label="' + T.sTitle + '"></div><div class="mq-sh" id="mqSh2" role="dialog" aria-label="' + T.today + '"></div><div class="mq-sh" id="mqSh3" role="dialog" aria-label="' + T.goto + '"></div>';
    h += '<div class="mq-sea" id="mqSea"><div class="mq-sh0"><button type="button" class="mq-ic" id="mqSx" aria-label="' + T.close + '">' + ICON.x + '</button>' +
      '<input type="search" id="mqSi" dir="rtl" placeholder="' + T.ph + '" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
      '<div class="mq-cnt" id="mqCn"></div><div class="mq-lst" id="mqLs"></div></div>';
    ov.innerHTML = h; D.body.appendChild(ov);

    stage = g("mqSt"); bodyEl = g("mqBd"); pageEl = g("mqPg"); tTitle = g("mqTt"); tSub = g("mqTs"); mJuz = g("mqJuz"); mSur = g("mqSurH"); mNum = g("mqNum");
    selS = g("mqSs"); selJ = g("mqSj"); shEl = g("mqSh"); seaEl = g("mqSea"); seaIn = g("mqSi"); seaCnt = g("mqCn"); seaLst = g("mqLs");
    palEl = el("style"); palEl.id = "mqPal"; D.head.appendChild(palEl);
    topEl = g("mqTop"); botEl = g("mqBot"); modeEl = g("mqMd"); actEl = g("mqAc"); finEl = g("mqFn"); rbEl = g("mqRb"); try { G.MRobot && G.MRobot.css && G.MRobot.css(); } catch (e) {} sh2 = g("mqSh2"); sh3 = g("mqSh3");

    var i, o;
    for (i = 1; i <= 114; i++) { o = el("option", "", num(i) + ". " + surahName(QV, i)); o.value = i; selS.appendChild(o); }
    for (i = 1; i <= 30; i++) { o = el("option", "", T.juz + " " + num(i)); o.value = i; selJ.appendChild(o); }

    wire(); buildSettings(); wire2();
    try { new ResizeObserver(function () { clearTimeout(build.rt); build.rt = setTimeout(fit, 60); }).observe(bodyEl); } catch (e) {}
  }

  function segH(id, items) { return '<div class="mq-sg" id="' + id + '">' + items.map(function (o) { return '<button type="button" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join("") + '</div>'; }
  function buildSettings() {
    var h = '<h3>' + T.sTitle + '</h3>' +
      '<div class="mq-row"><span class="mq-lb">' + T.colors + '</span><button type="button" class="mq-sw" id="mqC" role="switch" aria-checked="true"></button></div>' +
      '<div class="mq-row col"><span class="mq-lb">' + T.bg + '</span><div class="mq-ths" id="mqTh"></div></div>' +
      '<div class="mq-row col"><span class="mq-lb">' + T.frame + '</span><div class="mq-ths" id="mqFr"></div></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.size + '</span>' + segH("mqSz", [["", T.big], ["md", T.mid], ["sm", T.sml]]) + '</div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.lsp + '</span>' + segH("mqLs2", [["tight", T.tight], ["", T.norm], ["loose", T.loose]]) + '</div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.view + '</span><div class="mq-sg" id="mqVw"><button type="button" data-m="full">' + T.full + '</button><button type="button" data-m="scroll">' + T.scroll + '</button></div></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.info + '</span><button type="button" class="mq-sw" id="mqI" role="switch" aria-checked="true"></button></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.awake + '</span><button type="button" class="mq-sw" id="mqW" role="switch" aria-checked="false"></button></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.kahfSet + '</span><button type="button" class="mq-sw" id="mqK" role="switch" aria-checked="true"></button></div>' +
      '<div class="mq-ft"><button type="button" id="mqRs">' + T.reset + '</button><button type="button" class="p" id="mqDn">' + T.done + '</button></div>';
    shEl.innerHTML = h;
    var ths = g("mqTh"), frs = g("mqFr");
    [""].concat(Object.keys(THEMES)).forEach(function (k) {
      var b = el("button", "mq-th"); b.type = "button"; b.dataset.v = k; b.setAttribute("aria-pressed", "false");
      var sw = el("i"); sw.style.background = k ? SWATCH[k] : "linear-gradient(135deg,#f6edd6 50%,#0b1b3a 50%)"; b.appendChild(sw); b.appendChild(el("span", "", k ? T[k] || k : T.auto)); ths.appendChild(b);
    });
    [""].concat(Object.keys(FRAMES)).forEach(function (k) {
      var b = el("button", "mq-th"); b.type = "button"; b.dataset.v = k; b.setAttribute("aria-pressed", "false");
      var sw = el("i"); sw.style.background = "var(--mq-bg)"; sw.style.border = "4px solid " + (k ? FRAMES[k] : "var(--mq-acc)"); b.appendChild(sw); b.appendChild(el("span", "", k ? T[k] : T.auto)); frs.appendChild(b);
    });
    g("mqC").addEventListener("click", function () { S.c = S.c ? 0 : 1; applySet(); saveSet(); render(cur, true); });
    g("mqI").addEventListener("click", function () { S.i = S.i ? 0 : 1; applySet(); saveSet(); fit(); });
    g("mqW").addEventListener("click", function () { S.w = S.w ? 0 : 1; applySet(); saveSet(); wake(!!S.w); });
    g("mqK").addEventListener("click", function () { S.k = S.k ? 0 : 1; applySet(); saveSet(); if (S.k) kahfAsk(); });
    ths.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPref("p", b.dataset.v); });
    frs.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPref("f", b.dataset.v); });
    g("mqSz").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPref("s", b.dataset.v); });
    g("mqLs2").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPref("l", b.dataset.v); });
    g("mqVw").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S.m = b.dataset.m; applySet(); saveSet(); fit(); });
    g("mqRs").addEventListener("click", function () { S.c = 1; S.m = "full"; S.i = 1; S.w = 0; S.k = 1; if (G.MPREF) G.MPREF.reset(); applySet(); saveSet(); wake(false); render(cur, true); });
    g("mqDn").addEventListener("click", function () { closePanels(); });
  }
  function applySet() {
    var th = THEMES[themeKey()], pf = pref();
    ov.style.setProperty("--mq-bg", th.bg); ov.style.setProperty("--mq-ink", th.ink); ov.style.setProperty("--mq-bar", th.bar);
    ov.style.setProperty("--mq-line", th.line); ov.style.setProperty("--mq-acc", th.acc); ov.style.setProperty("--mq-hl", th.hl);
    ov.style.setProperty("--mq-fr", FRAMES[pf.f] || th.acc);
    ov.style.colorScheme = th.dark ? "dark" : "light";
    g("mqC").setAttribute("aria-checked", S.c ? "true" : "false");
    g("mqI").setAttribute("aria-checked", S.i ? "true" : "false");
    g("mqW").setAttribute("aria-checked", S.w ? "true" : "false");
    g("mqK").setAttribute("aria-checked", S.k ? "true" : "false");
    [].forEach.call(g("mqTh").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === pf.p ? "true" : "false"); });
    [].forEach.call(g("mqFr").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === pf.f ? "true" : "false"); });
    [].forEach.call(g("mqSz").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === pf.s ? "true" : "false"); });
    [].forEach.call(g("mqLs2").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === pf.l ? "true" : "false"); });
    [].forEach.call(g("mqVw").children, function (b) { b.setAttribute("aria-pressed", b.dataset.m === S.m ? "true" : "false"); });
    g("mqMt").style.display = S.i ? "" : "none"; g("mqMb").style.display = S.i ? "" : "none";
    bodyEl.classList.toggle("sc", S.m === "scroll");
  }

  function palette(pg) {
    var th = THEMES[themeKey()], cols = th.dark ? TJD : TJL, map = { 0: th.ink }, r, oc = [], i;
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
    var tok = ++req; if (pg !== cur) revSet = {}; cur = pg; hlKey = hl || null;
    meta(pg); trMeta();
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
    selS.value = s; selJ.value = juzOf(pg);
  }
  function render(pg, keep) {
    palette(pg);
    pageEl.style.cssText = ""; pageEl.classList.remove("ld");
    pageEl.style.setProperty("--qf", "QPC" + pg);
    pageEl.innerHTML = pageHTML(QV, idx(), pg);
    fit(); hlApply(); trRender();
    try { if (D.fonts) { D.fonts.load("40px QPC" + pg, "\uFB50").then(fit, function () {}); D.fonts.ready.then(fit); } } catch (e) {}
    setTimeout(fit, 150); setTimeout(fit, 700);
    if (!keep) saveLast(pg);
  }
  function fit() {
    if (!on || !pageEl.firstChild || !pageEl.querySelector(".mq-l")) return;
    var pf = pref(), sc = pf.s === "md" ? .86 : (pf.s === "sm" ? .72 : 1), lf = pf.l === "tight" ? .87 : (pf.l === "loose" ? 1.18 : 1);
    var W = (bodyEl.clientWidth - 16) * sc, H = bodyEl.clientHeight - 6;
    if (W <= 0 || H <= 0) return;
    var rows = rowsOf(QV, cur).length, mx = 0;
    pageEl.style.width = W + "px"; pageEl.style.fontSize = "40px"; pageEl.style.height = "auto"; pageEl.style.gridTemplateRows = "";
    [].forEach.call(pageEl.querySelectorAll(".mq-l"), function (l) {
      var w = 0, n = 0; [].forEach.call(l.querySelectorAll(".qw"), function (x) { w += x.getBoundingClientRect().width; n++; });
      if (n) { w += (n - 1) * 0.22 * 40; if (w > mx) mx = w; }
    });
    if (!mx) return;
    var fsW = 40 * W / mx, fs, rowH;
    var need = false;
    if (S.m === "full") {
      fs = Math.min(fsW, (H / rows) / 1.62, 70);
      if (lf > 1 && cur > 2) { rowH = fs * 2.15 * lf; need = rowH * rows > H + 1; }   /* التباعد الواسع يتجاوز الشاشة فتصير الصفحة قابلة للتمرير */
      else rowH = Math.min(H / rows, fs * 2.15 * Math.min(lf, 1));
    } else { fs = Math.min(fsW, 70); rowH = fs * 1.95 * lf; }
    bodyEl.classList.toggle("sc", S.m === "scroll" || need);
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
  function panelOpen() { return !!ov.querySelector(".mq-sh.on") || seaEl.classList.contains("on"); }
  function closePanels() { [].forEach.call(ov.querySelectorAll(".mq-sh"), function (x) { x.classList.remove("on"); }); seaEl.classList.remove("on"); try { seaIn.blur(); } catch (e) {} }
  function flip(d) { var n = cur + d; if (n < 1 || n > 604) return; go(n); }

  function wire() {
    var down = null;
    stage.addEventListener("pointerdown", function (e) { if (e.button > 0) return; down = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener("pointerup", function (e) {
      if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { flip(dx > 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        var nn = e.target.closest && e.target.closest(".mq-n");
        if (nn && (M === "review" || M === "tasmee")) { toggleRev(nn.dataset.a); return; }
        if (panelOpen()) closePanels(); else bars(!ov.classList.contains("bars"));
      }
    });
    stage.addEventListener("pointercancel", function () { down = null; });
    g("mqX").addEventListener("click", function () { close(); });
    g("mqPv").addEventListener("click", function () { flip(-1); });
    g("mqNx").addEventListener("click", function () { flip(1); });
    selS.addEventListener("change", function () { go(idx().spage[+selS.value]); });
    selJ.addEventListener("change", function () { go(juzStart(+selJ.value)); });
    g("mqGb").addEventListener("click", function () { showSheet(shEl); });
    g("mqSb").addEventListener("click", openSearch);
    g("mqSx").addEventListener("click", function () { seaEl.classList.remove("on"); try { seaIn.blur(); } catch (e) {} });
    D.addEventListener("keydown", function (e) {
      if (!on) return;
      var t = e.target && e.target.tagName;
      if (e.key === "Escape") { if (D.querySelector(".tjg:not(.hide)")) return; if (panelOpen()) closePanels(); else close(); return; }
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
  function open(pg, opts) {
    build();
    var md = (opts && opts.mode) || "read";
    if (on) { if (pg >= 1 && pg <= 604) go(pg); setMode(md); return; }
    loadSet(); applySet();
    on = true; ov.classList.add("on"); D.body.classList.add("mq-open");
    try { history.pushState({ mshf: 1 }, ""); } catch (e) {}
    closePanels(); go(pg >= 1 && pg <= 604 ? pg : lastPage()); setMode(md); if (S.w) wake(true);
  }
  function close(fromPop) {
    if (!on) return; on = false; req++; clearTimeout(barTm);
    ov.classList.remove("on", "bars"); D.body.classList.remove("mq-open"); closePanels(); wake(false);
    autoStop(true); clearTimeout(AU.tm); AU.resume = false; AU.eng = null; AU.pg = 0; TASK = null; M = "read"; revSet = {};
    ov.classList.remove("tr", "hid", "ast"); modeEl && [].forEach.call(modeEl.children, function (b) { b.setAttribute("aria-pressed", b.dataset.m === "read" ? "true" : "false"); });
    if (!fromPop) { try { if (history.state && history.state.mshf) history.back(); } catch (e) {} }
  }

  /* ===== المصحف الموحَّد: قراءة | حفظ | مراجعة | تسميع | آلي — في شريط واحد داخل شاشة المصحف ===== */
  var M = "read", TASK = null, revSet = {}, topEl, botEl, modeEl, actEl, finEl, rbEl, sh2, sh3, textQ = [], textBusy = false;
  function isRB() { return M !== "read"; }   /* المسمّع الآلي يظهر في الحفظ والمراجعة والتسميع */
  function isF() { try { return G.MRobot && G.MRobot.who().g === "f"; } catch (e) { return false; } }
  var AU = { rec: null, active: false, E: null, W: null, eng: null, st: 0, pg: 0, mark: [], cons: {}, ac: null, bt: 0, tokOf: null, msg: "", cls: "", resume: false, tm: 0 };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function A() { return G.S || null; }
  function todayKey() { return G.dkey ? G.dkey(new Date()) : ""; }

  /* القسم الذي تنتمي إليه الصفحة من خطة اليوم (نفس منطق زر «أنهيت…» القديم في قرآني) */
  function section(pg, mode) {
    var a = A(); if (!a || !a.log) return null;
    var dn = a.log[todayKey()] || {}, pr = dn.pr || {}, id, c;
    for (id in pr) { if (dn[id] && pg >= pr[id][0] && pg <= pr[id][1] && (mode === "study" || id !== "new")) return { id: id, t: pr[id][2], lo: pr[id][0], hi: pr[id][1] }; }
    c = (G.TK || []).filter(function (t) { return t.pgs ? t.pgs.indexOf(pg) >= 0 : (pg >= t.lo && pg <= t.hi); })[0];
    return c ? { id: c.id, t: c.t, lo: c.lo, hi: c.hi, pgs: c.pgs } : null;
  }
  /* الصفحة التالية داخل المهمة (قد لا تكون متتالية إن كان المحفوظ متفرقًا) */
  function nextInTask(t, p) { var i, q; if (!t) return 0; if (t.pgs) { q = t.pgs.slice().sort(function (a, b) { return a - b; }); for (i = 0; i < q.length; i++) if (q[i] > p) return q[i]; return 0; } return p < t.hi ? p + 1 : 0; }
  function taskOf(id) { return (G.TK || []).filter(function (t) { return t.id === id; })[0] || null; }
  /* الصفحة التي يجب أن يحفظها الآن: أول صفحة من «الحفظ الجديد» في خطة اليوم، وإلا الصفحة التي بعد آخر محفوظه */
  function hifzPage() {
    var a = A(), t, p; if (!a) return 0;
    t = taskOf("new"); if (t && t.lo >= 1 && t.lo <= 604) return t.lo;
    if (G.MPlan) { p = G.MPlan.next(); if (p >= 1 && p <= 604) return p; return G.MPlan.last() || 0; }
    return a.dir === "fwd" ? Math.min(604, Math.max(1, a.a + a.N)) : Math.min(604, Math.max(1, a.b - a.N));
  }
  /* الصفحة التي تبدأ منها مراجعة اليوم */
  function reviewPage() {
    var t = taskOf("old") || taskOf("rec"), p; if (!t) return 0;
    p = (t.pgs && t.pgs.length) ? t.pgs[0] : t.lo; return p >= 1 && p <= 604 ? p : 0;
  }

  /* ----- تبديل الأوضاع ----- */
  function setMode(m) {
    if (!ov) return;
    autoStop(true); AU.eng = null; AU.pg = 0;
    M = m; revSet = {}; clearTimeout(AU.tm); AU.resume = false;
    var tr = m !== "read";
    ov.classList.toggle("tr", tr); ov.classList.toggle("hid", m === "review" || m === "tasmee"); ov.classList.toggle("ast", m === "study");
    [].forEach.call(modeEl.children, function (b) { b.setAttribute("aria-pressed", b.dataset.m === m ? "true" : "false"); });
    [].forEach.call(pageEl.querySelectorAll(".aya-t.rev,.qw.on,.qw.x"), function (x) { x.classList.remove("rev", "on", "x"); });
    if (tr) bars(true); else bars(true, 2800);
    AU.msg = ""; AU.cls = "";
    trMeta();
    if (isRB()) autoPrepare();
  }
  function trMeta() { if (!built) return; renderAct(); renderFin(); measure(); }
  function measure() {
    if (!on || !ov) return;
    var tr = ov.classList.contains("tr");
    ov.style.setProperty("--mq-th", tr ? topEl.offsetHeight + "px" : "0px"); ov.style.setProperty("--mq-bh", tr ? botEl.offsetHeight + "px" : "0px");
    clearTimeout(measure.t); measure.t = setTimeout(fit, 30);
  }
  /* بعد رسم الصفحة: أعد حالة الإخفاء/الكشف */
  function trRender() {
    if (M === "read") return;
    Object.keys(revSet).forEach(function (k) { [].forEach.call(pageEl.querySelectorAll('.aya-t[data-a="' + k + '"]'), function (n) { n.classList.add("rev"); }); });
    if (isRB()) autoOnRender();
    trMeta();
  }

  /* ----- كشف الآيات (مراجعة وتسميع يدوي) ----- */
  function toggleRev(key) {
    var has = !!revSet[key];
    [].forEach.call(pageEl.querySelectorAll('.aya-t[data-a="' + key + '"]'), function (n) { n.classList.toggle("rev", !has); });
    if (has) delete revSet[key]; else revSet[key] = 1;
    renderAct();
  }
  function ayaKeys() { var o = [], seen = {}; [].forEach.call(pageEl.querySelectorAll(".aya-t"), function (n) { var k = n.dataset.a; if (!seen[k]) { seen[k] = 1; o.push(k); } }); return o; }
  function allShown() { var ks = ayaKeys(); return ks.length > 0 && ks.every(function (k) { return revSet[k]; }); }
  function revealAll(v) { ayaKeys().forEach(function (k) { if (!!revSet[k] !== v) toggleRev(k); }); renderAct(); }
  function revealNext() { var ks = ayaKeys(), i; for (i = 0; i < ks.length; i++) if (!revSet[ks[i]]) { toggleRev(ks[i]); return; } }

  /* ----- شريط الإجراءات حسب الوضع ----- */
  function renderAct() {
    if (!actEl) return;
    renderRb();
    if (M === "read") { actEl.innerHTML = ""; return; }
    var a = A(), pv = '<button type="button" class="mq-ic" data-a="pv" aria-label="' + T.prev + '">' + ICON.prev + "</button>",
      nx = '<button type="button" class="mq-ic" data-a="nx" aria-label="' + T.next + '">' + ICON.next + "</button>", mid = "", foot = "", q;
    if (M === "study") {
      var r = (a && a.rep && a.rep[cur]) || 0;
      mid = '<span class="mq-rp" title="' + T.repHint + '">' + (r >= 9 ? "✓ " + T.repDone : T.rep + " <b>" + num(r) + "</b> / " + num(9)) + '</span><button type="button" class="mq-b p" data-a="rep">' + T.repAdd + "</button>";
    } else if (M === "review") {
      mid = '<button type="button" class="mq-b p" data-a="nextaya">' + T.nextAya + '</button><button type="button" class="mq-b" data-a="toggleall">' + (allShown() ? T.hideAll : T.showAll) + "</button>";
    } else if (M === "tasmee") {
      mid = '<button type="button" class="mq-b" data-a="reveal">' + T.revealPage + '</button><button type="button" class="mq-b ok" data-a="ok">✓ ' + T.okBtn + '</button><button type="button" class="mq-b bad" data-a="bad">✗ ' + T.badBtn + "</button>";
      q = a && a.tas && a.tas[cur];
      if (q) foot = T.lastTas + ": " + (q.ok ? T.tasOk : T.tasBad);
    }
    var pos = "";
    if (M === "study" && hifzPage()) pos = '<button type="button" class="mq-b mq-pos" data-a="hifz">' + ICON.pin + T.hifzPos + "</button>";
    else if (M === "review" && reviewPage()) pos = '<button type="button" class="mq-b mq-pos" data-a="rvpos">' + ICON.pin + T.rvPos + "</button>";
    actEl.innerHTML = pv + '<div class="mq-mid">' + mid + "</div>" + nx + (pos ? '<div class="mq-ps">' + pos + "</div>" : "") + (foot ? '<div class="mq-as">' + esc(foot) + "</div>" : "");
  }
  /* المسمّع الآلي: الروبوت يظهر في المراجعة والتسميع، ويستمع إليك ويكشف الكلمات الصحيحة ويصفّر للخطأ */
  function rbHint() { return isF() ? T.micHintF : T.micHint; }
  function renderRb() {
    if (!rbEl) return;
    if (!isRB()) { rbEl.style.display = "none"; rbEl.innerHTML = ""; return; }
    var R = G.MRobot, gg = "m", nm = T.robotDef, av = "🤖", ops = "", seen = {};
    try { if (R) { gg = R.who().g; nm = R.name(gg); av = R.svg(gg, 40, AU.active ? "rb-live" : ""); } } catch (e) {}
    if (AU.E && AU.pg === cur) AU.E.forEach(function (e, k) { if (!seen[e.key]) { seen[e.key] = 1; ops += '<option value="' + k + '"' + (k === AU.st ? " selected" : "") + ">" + (e.af ? "" : "↪ ") + T.ayah + " " + num(e.a) + "</option>"; } });
    rbEl.style.display = "flex";
    rbEl.innerHTML = '<div class="mq-rbi">' + av + '</div><div class="mq-rbt"><b>' + esc(nm) + '</b><span class="mq-as ' + AU.cls + '" id="mqAs" role="status">' + esc(AU.msg || rbHint()) + "</span></div>" +
      (ops ? '<select id="mqFr" aria-label="' + T.from + '">' + ops + "</select>" : "") +
      '<button type="button" class="mq-b p mq-mic' + (AU.active ? " rec" : "") + '" data-a="mic" aria-label="' + (AU.active ? T.micStop : T.mic) + '">' + ICON.mic + "<span>" + (AU.active ? T.micStop : T.mic) + "</span></button>";
  }
  function rbShake() { var sv = rbEl && rbEl.querySelector(".rb"); if (!sv) return; sv.classList.remove("rb-err"); void sv.getBoundingClientRect(); sv.classList.add("rb-err"); setTimeout(function () { sv.classList.remove("rb-err"); }, 520); }

  /* زر «أنهيت…» لقسم اليوم */
  function renderFin() {
    if (!finEl) return;
    var a = A(), ts = M === "tasmee", t = (M === "read" || !a) ? null : section(cur, ts ? "tasmee" : M);
    if (!t) { finEl.style.display = "none"; finEl.innerHTML = ""; measure(); return; }
    var dn = (a.log && a.log[todayKey()]) || {}, onv = ts ? !!(dn.ts && dn.ts[t.id]) : !!dn[t.id],
      lab = M === "study" ? T.finStudy : (M === "review" ? T.finReview : T.finTasmee);
    finEl.style.display = "flex";
    finEl.innerHTML = onv ? "<span>✓ " + T.recorded + " «" + esc(t.t) + "»" + (dn.all && !ts ? " — " + T.dayDone : "") + '</span><button type="button" class="mq-b" data-a="finundo">' + T.finUndo + "</button>"
      : "<span><b>" + esc(t.t) + "</b>" + (ts ? " <small>(" + T.optional + ")</small>" : "") + '</span><button type="button" class="mq-b p" data-a="fin">' + lab + "</button>";
    measure();
  }
  function finish(onv) {
    var a = A(), ts = M === "tasmee", t = a && section(cur, ts ? "tasmee" : M); if (!t) return;
    var k = todayKey(), dn = a.log[k] || (a.log[k] = {});
    try {
      if (ts) { dn.ts = dn.ts || {}; dn.ts[t.id] = onv ? 1 : 0; G.save(); G.render(); }
      else { G.setTask(t.id, onv); dn = a.log[k]; dn.pr = dn.pr || {}; if (onv) dn.pr[t.id] = [t.lo, t.hi, t.t]; else delete dn.pr[t.id]; G.save(); }
    } catch (e) {}
    renderFin();
  }

  function onAct(e) {
    var b = e.target.closest("button"); if (!b || !b.dataset.a) return; var a = A(), k = b.dataset.a;
    if (k === "pv") flip(-1); else if (k === "nx") flip(1);
    else if (k === "rep") { if (!a) return; a.rep = a.rep || {}; a.rep[cur] = (a.rep[cur] || 0) + 1; try { G.save(); } catch (x) {} renderAct(); }
    else if (k === "nextaya") revealNext();
    else if (k === "toggleall") revealAll(!allShown());
    else if (k === "reveal") revealAll(true);
    else if (k === "ok" || k === "bad") { if (a) { a.tas = a.tas || {}; a.tas[cur] = { d: todayKey(), ok: k === "ok" ? 1 : 0 }; try { G.save(); } catch (x) {} } revealAll(true); }
    else if (k === "mic") autoToggle();
    else if (k === "hifz") { var hp = hifzPage(); if (hp) { TASK = null; go(hp); } }
    else if (k === "rvpos") { var rp = reviewPage(); if (rp) { TASK = null; go(rp); } }
    else if (k === "fin") finish(true);
    else if (k === "finundo") finish(false);
  }

  /* ----- نافذتا «مهام اليوم» و«الانتقال» ----- */
  function showSheet(s) {
    [shEl, sh2, sh3].forEach(function (x) { if (x !== s) x.classList.remove("on"); });
    seaEl.classList.remove("on"); s.classList.toggle("on"); if (s.classList.contains("on")) bars(true);
  }
  function fillTasks() {
    var a = A(), tk = G.TK || [], dn = (a && a.log && a.log[todayKey()]) || {}, h = "<h3>" + T.today + "</h3>";
    if (!a || !tk.length) h += '<p class="mq-note">' + T.noPlan + "</p>";
    else tk.forEach(function (t) {
      h += '<div class="mq-tk' + (dn[t.id] ? " done" : "") + '"><div class="mq-tkh"><span>' + (dn[t.id] ? "✓ " : "") + "<b>" + esc(t.t) + "</b></span><small>" + esc(t.s) + '</small></div><div class="mq-tkb">' +
        [["study", T.taskRead], ["review", T.taskReview], ["tasmee", T.taskTasmee]].map(function (b) { return '<button type="button" class="mq-b" data-tk="' + t.lo + "," + t.hi + "," + b[0] + '">' + b[1] + "</button>"; }).join("") + "</div></div>";
    });
    sh2.innerHTML = h + '<div class="mq-ft"><button type="button" class="p" data-x="1">' + T.done + "</button></div>";
  }
  function fillGoto() {
    var hp = hifzPage(), h = "<h3>" + T.goto + '</h3><div class="mq-row"><span class="mq-lb">' + T.surah + '</span><select id="mqGs">' + selS.innerHTML + '</select></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.juzSel + '</span><select id="mqGj">' + selJ.innerHTML + '</select></div>' +
      '<div class="mq-row"><span class="mq-lb">' + T.pageNo + '</span><span style="display:flex;gap:6px"><input type="number" id="mqGp" min="1" max="604" inputmode="numeric" style="width:84px"><button type="button" class="mq-b p" data-g="p">' + T.go + "</button></span></div>" +
      '<div class="mq-ft">' + (hp ? '<button type="button" data-g="h">' + T.hifzPos + "</button>" : "") + '<button type="button" data-g="l">' + T.lastRead + "</button></div>" +
      '<div class="mq-ft"><button type="button" class="p" data-x="1">' + T.done + "</button></div>";
    sh3.innerHTML = h; g("mqGs").value = selS.value; g("mqGj").value = selJ.value; g("mqGp").value = cur;
  }

  function wire2() {
    actEl.addEventListener("click", onAct); finEl.addEventListener("click", onAct); rbEl.addEventListener("click", onAct);
    rbEl.addEventListener("change", function (e) { if (e.target.id === "mqFr") { autoBuild(+e.target.value); autoStatus(true); renderAct(); } });
    modeEl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; if (b.dataset.m !== M) setMode(b.dataset.m); });
    g("mqTk").addEventListener("click", function () { fillTasks(); showSheet(sh2); });
    g("mqGd").addEventListener("click", function () { if (typeof G.tjgOpen === "function") G.tjgOpen(); });
    g("mqTtl").addEventListener("click", function () { fillGoto(); showSheet(sh3); });
    function sheetNav(e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.x) { closePanels(); return; }
      if (b.dataset.tk) { var p = b.dataset.tk.split(","); closePanels(); TASK = { lo: +p[0], hi: +p[1] }; go(+p[0]); setMode(p[2]); return; }
      if (b.dataset.g) { var d = b.dataset.g, pg = d === "h" ? hifzPage() : (d === "l" ? lastPage() : +g("mqGp").value); if (pg >= 1 && pg <= 604) { closePanels(); go(pg); } }
    }
    sh2.addEventListener("click", sheetNav); sh3.addEventListener("click", sheetNav);
    sh3.addEventListener("change", function (e) {
      if (e.target.id === "mqGs") { closePanels(); go(idx().spage[+e.target.value]); }
      else if (e.target.id === "mqGj") { closePanels(); go(juzStart(+e.target.value)); }
    });
    try { new ResizeObserver(function () { measure(); }).observe(botEl); } catch (e) {}
  }

  /* ----- التسميع الآلي ----- */
  function setAs(msg, cls) { AU.msg = msg || ""; AU.cls = cls || ""; var e = g("mqAs"); if (e) { e.textContent = AU.msg; e.className = "mq-as " + AU.cls; } }
  function loadTextQ(cb) {
    if (RECS) return cb(true);
    textQ.push(cb); if (textBusy) return; textBusy = true;
    loadText(function (ok) { textBusy = false; textQ.splice(0).forEach(function (f) { f(ok); }); });
  }
  function tokMap() {
    if (AU.tokOf || !RECS) return AU.tokOf;
    var m = {}; RECS.forEach(function (r) { var a = []; r.tk.forEach(function (t) { var n = norm(t); if (n) a.push(n); }); m[r.s + ":" + r.a] = a; });
    return AU.tokOf = m;
  }
  function autoSupported() { return !!(G.SpeechRecognition || G.webkitSpeechRecognition); }
  function autoPrepare(cb) {
    if (AU.eng && AU.pg === cur) { if (cb) cb(); return; }
    setAs(T.prepText); renderAct();
    loadTextQ(function (ok) {
      if (!on || !isRB()) return;
      if (!ok) { setAs(T.textFail, "bad"); renderAct(); return; }
      if (!pageEl.querySelector(".qw")) return;          /* الصفحة لم تُرسم بعد: يعيد trRender المحاولة */
      autoBuild(0); autoStatus(true); renderAct(); if (cb) cb();
    });
  }
  function autoBuild(si) {
    var i, n;
    AU.pg = cur; AU.E = buildE(QV, idx(), cur, tokMap());
    AU.W = [].slice.call(pageEl.querySelectorAll(".qw:not(.mq-n)"));
    n = Math.min(AU.W.length, AU.E.length); AU.E.length = n; AU.W.length = n;
    AU.st = Math.max(0, Math.min(si || 0, n)); AU.eng = new Engine(AU.E, { start: AU.st }); AU.mark = [];
    for (i = 0; i < AU.st; i++) AU.mark[i] = 1;
    paintAuto();
  }
  function paintAuto() {
    var np = (AU.active && AU.eng && !AU.eng.done) ? AU.eng.p : -1;
    AU.W.forEach(function (w, i) { var m = AU.mark[i]; w.classList.toggle("on", !!m); w.classList.toggle("x", m === 2); w.classList.toggle("nx", i === np); });
  }
  /* رُسمت الصفحة (من تقليب أو تغيير إعداد): أعد ربط الكلمات بالحالة الحالية */
  function autoOnRender() {
    if (AU.eng && AU.pg === cur && AU.E) { AU.W = [].slice.call(pageEl.querySelectorAll(".qw:not(.mq-n)")); AU.W.length = Math.min(AU.W.length, AU.E.length); paintAuto(); return; }
    var was = AU.active || AU.resume; AU.eng = null; AU.resume = false;
    autoPrepare(function () { if (was && on && isRB()) autoStart(); });
  }
  function autoStatus(force) {
    if (!AU.eng) return;
    if (!AU.active && !force) return;
    var done = Math.max(0, AU.eng.p - AU.st), total = Math.max(1, AU.E.length - AU.st);
    setAs((AU.active ? T.listening : rbHint()) + (AU.active ? num(done) + " / " + num(total) + " " + T.words : "") + (AU.eng.err ? " · " + T.errs + " " + num(AU.eng.err) : ""), AU.eng.err ? "warn" : "");
  }
  function beep() {
    var n = Date.now(); if (n - AU.bt < 600) return; AU.bt = n;
    try {
      var a = AU.ac; if (!a) return;
      var t = a.currentTime, o = a.createOscillator(), gn = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(140, t + .3);
      gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(.28, t + .03); gn.gain.exponentialRampToValueAtTime(.0001, t + .34);
      o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + .36);
    } catch (e) {}
  }
  function autoToggle() { if (AU.active) { autoStop(); setAs(T.stopped); renderAct(); } else autoStart(); }
  function autoStart() {
    if (AU.active) return;
    if (!autoSupported()) { setAs(T.noSR, "bad"); renderAct(); return; }
    try { AU.ac = (G.MusammiAC && G.MusammiAC()) || AU.ac || new (G.AudioContext || G.webkitAudioContext)(); if (AU.ac.state === "suspended") AU.ac.resume(); } catch (e) {}
    if (!AU.eng || AU.pg !== cur) { autoPrepare(function () { autoStart(); }); return; }
    if (AU.eng.done) autoBuild(0);
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition, r;
    try { r = new SR(); } catch (e) { setAs(T.noSR, "bad"); renderAct(); return; }
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    AU.cons = {};
    r.onresult = autoResult;
    r.onerror = function (e) {
      var c = e && e.error;
      if (c === "not-allowed" || c === "service-not-allowed") { autoStop(true); setAs(T.micDenied, "bad"); renderAct(); }
      else if (c === "network") { autoStop(true); setAs(T.srErr, "bad"); renderAct(); }
    };
    r.onend = function () { if (AU.active && AU.rec === r) { AU.cons = {}; setTimeout(function () { if (AU.active && AU.rec === r) { try { r.start(); } catch (x) {} } }, 150); } };
    AU.rec = r; AU.active = true;
    try { r.start(); } catch (e) { AU.active = false; AU.rec = null; setAs(T.srErr, "bad"); renderAct(); return; }
    autoStatus(true); renderAct(); paintAuto();
  }
  function autoStop(silent) {
    var r = AU.rec; AU.active = false; AU.rec = null;
    if (r) { try { r.onend = null; r.onresult = null; r.onerror = null; r.abort ? r.abort() : r.stop(); } catch (e) {} }
    try { if (AU.W && AU.W.length) paintAuto(); } catch (e) {}
    if (!silent) renderAct();
  }
  function autoResult(e) {
    if (!AU.active || !AU.eng) return;
    var i, res, fin, T0, c, out;
    for (i = e.resultIndex; i < e.results.length; i++) {
      res = e.results[i]; fin = !!res.isFinal; T0 = tokenize((res[0] && res[0].transcript) || ""); c = AU.cons[i] || 0;
      out = AU.eng.feed(T0, c, fin); AU.cons[i] = fin ? T0.length : c + out.used;
      out.ev.forEach(function (v) {
        var w = AU.W[v.i]; AU.mark[v.i] = v.ok ? 1 : 2;
        if (w) { w.classList.add("on"); if (!v.ok) w.classList.add("x"); }
        if (!v.ok) { beep(); rbShake(); }
      });
      paintAuto();
      if (AU.eng.done) { autoDone(); return; }
    }
    autoStatus(true);
  }
  function autoDone() {
    var a = A(), errs = AU.eng.err, t, nx;
    autoStop(true);
    if (a && M === "tasmee") { a.tas = a.tas || {}; a.tas[cur] = { d: todayKey(), ok: errs ? 0 : 1, a: 1, e: errs }; try { G.save(); } catch (x) {} }
    setAs(errs ? T.doneErr.replace("%n", num(errs)) : T.doneOk, errs ? "warn" : "ok"); renderAct(); renderFin();
    if (M === "study") return;
    t = section(cur, M === "tasmee" ? "tasmee" : "review"); nx = nextInTask(t, cur);
    if (nx) { AU.resume = true; AU.tm = setTimeout(function () { if (on && isRB() && AU.resume) go(nx); }, 1600); }
  }

  /* ----- ربط المصحف الموحَّد ببقية التطبيق ----- */
  function hookNav() {
    var nav = D.querySelector("nav"); if (!nav) return;
    /* تبويب «المصحف» يفتح الشاشة الموحَّدة مباشرة (بدل تبويب قرآني القديم) */
    nav.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button");
      if (b && b.dataset.t === "qurani") { e.stopPropagation(); e.preventDefault(); TASK = null; open(0, { mode: "read" }); }
    }, true);
    var oq = g("openQ"); if (oq) oq.onclick = function () { TASK = null; open(0, { mode: "read" }); };
    /* أزرار «اقرأ / راجع / سمّع» في خطة اليوم وخريطتي تفتح المصحف الموحَّد في الصفحة والوضع المناسبين */
    G.tjGoTask = function (lo, hi, m) { openTask(+lo || 1, +hi || +lo || 1, m); };
  }
  function openTask(lo, hi, m) {
    TASK = { lo: lo, hi: hi };
    open(lo, { mode: (m === "study" || m === "review" || m === "tasmee") ? m : (m === "auto" ? "tasmee" : "read") });
  }

  /* ===== (قديم) خيارا الخانة: قرآني | مصحفي — لم يعد مستعملًا بعد الدمج ===== */
  var seg = null, noteEl = null;
  function segSet(v) {
    if (!seg) return;
    [].forEach.call(seg.children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === v ? "true" : "false"); });
    if (noteEl) noteEl.textContent = v === "m" ? T.noteM : T.noteQ;
  }
  function initSeg() {
    var sec = g("t-qurani"); if (!sec || g("mqSeg")) return;
    seg = el("div", "seg mq-seg"); seg.id = "mqSeg"; seg.setAttribute("role", "group");
    var a = el("button", "", T.seg1), b = el("button", "", T.seg2);
    a.type = "button"; b.type = "button"; a.dataset.v = "q"; b.dataset.v = "m";
    seg.appendChild(a); seg.appendChild(b);
    noteEl = el("p", "mq-note"); noteEl.id = "mqNote";
    sec.insertBefore(noteEl, sec.firstChild); sec.insertBefore(seg, sec.firstChild); segSet("q");
    seg.addEventListener("click", function (e) { var t = e.target.closest("button"); if (!t) return; if (t.dataset.v === "m") { segSet("m"); open(); } else segSet("q"); });
  }

  D.addEventListener("click", function (e) {
    var r = e.target.closest && e.target.closest("#mq .mq-r"); if (r) jump(+r.dataset.s, +r.dataset.a);
  });
  D.addEventListener("input", function (e) {
    if (e.target && e.target.id === "mqSi") { clearTimeout(sTm); sTm = setTimeout(runSearch, 220); }
  });

  /* ===== تذكير سورة الكهف كل جمعة =====
     بطاقة هادئة تظهر مرة واحدة فقط في اليوم عند فتح التطبيق يوم الجمعة، ولا تظهر أثناء الترحيب أو تسجيل الدخول.
     وإن سمح المستخدم بالإشعارات يُرسَل إشعار نظام أيضًا (وتُسجَّل مزامنة دورية في المتصفحات التي تدعمها). */
  function ymd(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function kahfSeen() { try { return localStorage.getItem("mshf_kahf") || ""; } catch (e) { return ""; } }
  function kahfMark() { try { localStorage.setItem("mshf_kahf", ymd(new Date())); } catch (e) {} }
  function kahfAsk() {
    try { if ("Notification" in G && Notification.permission === "default") Notification.requestPermission().then(kahfPeriodic, function () {}); else kahfPeriodic(); } catch (e) {}
  }
  function kahfPeriodic() {
    try {
      if (!(navigator.serviceWorker && "Notification" in G && Notification.permission === "granted")) return;
      navigator.serviceWorker.ready.then(function (reg) { if (reg.periodicSync && reg.periodicSync.register) reg.periodicSync.register("kahf-friday", { minInterval: 12 * 3600 * 1000 }).catch(function () {}); });
    } catch (e) {}
  }
  function kahfBlocked() {
    var onb = g("onb"); if (onb && !onb.classList.contains("hide")) return true;
    var mw = g("mainWrap"); if (mw && mw.classList.contains("hide")) return true;
    if (g("rbAsk") || on) return true;
    return false;
  }
  var kahfEl = null;
  function kahfHide() { if (!kahfEl) return; var n = kahfEl; kahfEl = null; n.classList.remove("on"); setTimeout(function () { n.remove(); }, 600); }
  function kahfShow() {
    if (kahfEl) return;
    var n = el("div", "mq-kh"); n.setAttribute("role", "status");
    n.innerHTML = "<b>" + T.kahfT + "</b><p>" + T.kahfH + "</p><small>" + T.kahfSrc + '</small><div class="kb"><button type="button" class="p" data-a="go">' + T.kahfGo + '</button><button type="button" data-a="no">' + T.kahfLater + "</button></div>";
    D.body.appendChild(n); kahfEl = n; kahfMark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (kahfEl === n) n.classList.add("on"); }); });
    n.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "go") { kahfHide(); try { segSet("m"); } catch (x) {} open(idx().spage[18]); } else kahfHide();
    });
    setTimeout(function () { if (kahfEl === n) kahfHide(); }, 5000);   /* يظهر خمس ثوانٍ ثم يختفي */
  }
  function kahfSys() {
    try {
      if (!("Notification" in G) || Notification.permission !== "granted" || !navigator.serviceWorker) return;
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(T.kahfT, { body: T.kahfH + "\n" + T.kahfSrc, tag: "kahf-friday", icon: "img/icon-192.png", data: { url: "./#kahf" } }).then(function () {
          setTimeout(function () { try { reg.getNotifications({ tag: "kahf-friday" }).then(function (l) { l.forEach(function (n) { n.close(); }); }); } catch (e) {} }, 5000);   /* إشعار النظام أيضًا خمس ثوانٍ */
        }).catch(function () {});
      });
    } catch (e) {}
  }
  function kahfCheck() {
    loadSet();
    if (!S.k || new Date().getDay() !== 5 || kahfSeen() === ymd(new Date())) return;
    if (kahfBlocked()) return;
    kahfShow(); kahfSys();
  }
  function kahfInit() {
    setTimeout(kahfCheck, 3500);
    setInterval(kahfCheck, 30000);   /* إن كان التطبيق مشغولًا بالترحيب أو المصحف يوم الجمعة فيُعاد الفحص حتى يظهر التذكير مرة واحدة */
    D.addEventListener("pointerdown", function ask() {   /* أول لمسة: نطلب إذن الإشعارات مرة واحدة ليصل التذكير كإشعار نظام */
      D.removeEventListener("pointerdown", ask, true); loadSet();
      try { if (S.k && "Notification" in G && Notification.permission === "default" && !localStorage.getItem("mshf_kahf_ask")) { localStorage.setItem("mshf_kahf_ask", "1"); kahfAsk(); } } catch (e) {}
    }, true);
    D.addEventListener("visibilitychange", function () { if (D.visibilityState === "visible") setTimeout(kahfCheck, 1200); });
    if (/#kahf/.test(location.hash)) setTimeout(function () { try { segSet("m"); } catch (x) {} open(idx().spage[18]); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }, 900);
    try { navigator.serviceWorker && navigator.serviceWorker.addEventListener("message", function (e) { if (e.data && e.data.type === "OPEN_KAHF") { try { segSet("m"); } catch (x) {} open(idx().spage[18]); } }); } catch (e) {}
    kahfPeriodic();
  }

  hookNav(); kahfInit();
  /* عند تغيير «شكل صفحات المصحف» (من الإعدادات أو من هنا) يُعاد رسم الصفحة فورًا */
  D.addEventListener("mpref", function () { if (!built) return; applySet(); if (on) render(cur, true); });
  G.Mushafi = { open: open, close: close, goto: function (p) { build(); go(p); }, openTask: openTask, mode: function (m) { if (on) setMode(m); } };
})(typeof window !== "undefined" ? window : this);
