/* المسمّع الآلي — تسميع كلمة كلمة، يعمل دون إنترنت (تعرّف على الجهاز).
   النص: data/quran-text.json | لا يُظهر كلمة إلا إذا نُطقت صحيحة وفي موضعها، والخطأ صوت فقط. */
(function (G) {
  "use strict";
  /* ===== 1) النواة: تطبيع ومطابقة وجلسة (لا تعتمد على المتصفح) ===== */
  function norm(s) {
    return String(s || "").replace(/\u0670/g, "ا").replace(/[\u0640\u064B-\u065F\u06D6-\u06ED]/g, "")
      .replace(/[\u0671\u0622\u0623\u0625]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^\u0621-\u064A ]/g, " ").replace(/\s+/g, " ").trim();
  }
  /* هيكل الكلمة: بلا «ال» التعريف وبلا ألف، فلا يضرّ اختلاف رسم الألف الخنجرية */
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
  /* الكلمات حتى ٤ حروف: تطابق تام (فلا يمرّ حرف ناقص)، وما فوقها: تشابه ٧٥٪ */
  function sim(a, b) {
    a = sk(a); b = sk(b);
    if (a === b) return 1;
    if (Math.max(a.length, b.length) <= 4) return 0;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  var LN = { ا: "الف", ل: "لام", م: "ميم", ص: "صاد", ر: "را", ك: "كاف", ه: "ها", ي: "يا", ع: "عين", ط: "طا", س: "سين", ح: "حا", ق: "قاف", ن: "نون" };
  var MUQ = /^(الم|المص|الر|المر|كهيعص|طه|طسم|طس|يس|ص|حم|عسق|ق|ن)$/;
  function toks(s) { return norm(s).split(" ").filter(function (t) { return t.length > 1 || MUQ.test(t); }); }
  /* وحدة = كلمة متوقعة؛ الحروف المقطّعة تُقبل مكتوبة (الم) أو بأسمائها (ألف لام ميم) */
  function mkUnit(tok, key) {
    var t = [tok]; if (MUQ.test(tok)) t.push(tok.split("").map(function (c) { return LN[c]; }).join(""));
    return { t: t, key: key, dom: [] };
  }
  var THR = .75;
  function eqU(u, s) { for (var i = 0; i < u.t.length; i++) if (sim(u.t[i], s) >= THR) return true; return false; }

  function Session(units) {
    this.u = units; this.n = units.length; this.pos = -1; this.rev = []; this.cnt = 0;
    this.pend = []; this.hold = []; this.bad = []; this.done = false;
    for (var i = 0; i < this.n; i++) this.rev[i] = false;
  }
  var SP = Session.prototype;
  SP.show = function (a, b, ev) {
    var idx = [], i;
    for (i = a; i <= b && i < this.n; i++) if (!this.rev[i]) { this.rev[i] = true; this.cnt++; idx.push(i); }
    if (idx.length) ev.push({ t: "rev", idx: idx });
    if (this.cnt === this.n && !this.done) { this.done = true; ev.push({ t: "done" }); }
  };
  SP.eqAt = function (s, str) { return s >= 0 && s < this.n && eqU(this.u[s], str); };
  /* كم وحدة تستهلك الكلمة المنطوقة؟ (دمج التعرّف لكلمتين/ثلاث: يومالدين) */
  SP.takes = function (s, str) {
    if (this.eqAt(s, str)) return 1;
    var j = this.u[s].t[0], k;
    for (k = 2; k <= 3 && s + k <= this.n; k++) { j += this.u[s + k - 1].t[0]; if (sim(j, str) >= .8) return k; }
    return 0;
  };
  /* هل المنطوق بداية الكلمة المتوقعة؟ (تقسيم التعرّف لكلمة إلى جزأين) */
  SP.prefix = function (s, str) {
    if (s >= this.n) return false;
    var p = sk(str), i, a;
    if (!p) return false;
    for (i = 0; i < this.u[s].t.length; i++) {
      a = sk(this.u[s].t[i]); if (a.length > p.length && a.indexOf(p) === 0) return true;
      a = this.u[s].t[i]; if (a.length > str.length && a.indexOf(str) === 0) return true; /* أسماء الحروف المقطّعة */
    }
    return false;
  };
  /* قبل الارتكاز: نبحث عن موضع القارئ في الصفحة. أول كلمتين متتاليتين (أو كلمة فريدة طويلة) تحدّدان البداية،
     ثم تُكشف كل كلمة قبلها وهاتان الكلمتان */
  SP.anchor = function (ev, force) {
    for (;;) {
      var p = this.pend, c = [], s, m, ok;
      if (!p.length) return;
      var jn = p.join(""), mu = -1;
      for (s = 0; s < this.n; s++) if (this.u[s].t.length > 1 && p.length > 1 && this.eqAt(s, jn)) { mu = s; break; }
      if (mu >= 0) { this.show(0, mu, ev); this.pos = mu + 1; this.pend = []; return; }
      for (s = 0; s + p.length <= this.n; s++) {
        ok = true; for (m = 0; m < p.length; m++) if (!this.eqAt(s + m, p[m])) { ok = false; break; }
        if (ok) c.push(s);
      }
      if (!c.length) {
        if (!force && this.u.some(function (u) { return u.t.length > 1 && u.t[1].length > jn.length && u.t[1].indexOf(jn) === 0; })) return;
        ev.push({ t: "err" }); p.shift(); continue;
      }
      if ((c.length === 1 && (p.length >= 2 || sk(this.u[c[0]].t[0]).length >= 4)) || p.length >= 3 || force) {
        this.show(0, c[0] + p.length - 1, ev); this.pos = c[0] + p.length; this.pend = []; return;
      }
      return;
    }
  };
  SP.feed = function (tok) {
    var ev = [], H, str, k, s, b0;
    if (this.done || !tok) return ev;
    if (this.pos < 0) { this.pend.push(tok); this.anchor(ev, false); return ev; }
    H = this.hold.concat(tok); str = H.join(""); k = this.takes(this.pos, str);
    if (k) { this.hold = []; this.bad = []; this.show(this.pos, this.pos + k - 1, ev); this.pos += k; return ev; }
    if (this.prefix(this.pos, str)) { this.hold = H; return ev; }
    if (this.hold.length) { this.hold = []; ev.push({ t: "err" }); return ev.concat(this.feed(tok)); }
    /* خطأ. إن كانت آخر كلمتين خاطئتين تطابقان موضعًا متتاليًا في الصفحة (أعاد القارئ من موضع آخر) أعدنا الارتكاز بلا صوت */
    b0 = this.bad.length ? this.bad[this.bad.length - 1] : null;
    if (b0) for (s = 0; s + 1 < this.n; s++) if (this.eqAt(s, b0) && this.eqAt(s + 1, tok)) {
      this.show(s, s + 1, ev); this.pos = s + 2; this.bad = []; return ev;
    }
    this.bad.push(tok); if (this.bad.length > 2) this.bad.shift();
    ev.push({ t: "err" }); return ev;
  };
  SP.flush = function () {
    var ev = [];
    if (this.pos < 0) { if (this.pend.length) this.anchor(ev, true); }
    else if (this.hold.length) { this.hold = []; ev.push({ t: "err" }); }
    return ev;
  };
  /* بناء وحدات من نصوص آيات (للاختبار والتشغيل): [[key, text], ...] */
  function unitsFromTexts(list) {
    var out = [];
    list.forEach(function (kv) { toks(kv[1]).forEach(function (t) { out.push(mkUnit(t, kv[0])); }); });
    return out;
  }
  var API = { norm: norm, sim: sim, sk: sk, toks: toks, Session: Session, mkUnit: mkUnit, unitsFromTexts: unitsFromTexts, errs: 0 };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  G.Musammi = API;

  /* ===== 2) الواجهة والمحرك ===== */
  var $ = function (i) { return document.getElementById(i); };
  function allowOnline() { try { return localStorage.getItem("msOnline") === "1"; } catch (e) { return false; } }
  function AQ(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  var Q = null, st = { on: false, rec: null, sess: null, units: [], cm: 0, last: [], tm: null, errs: 0, bt: 0 };

  /* --- الشخصية: مازن للذكور وعائشة للإناث --- */
  function profile() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("mprof_") === 0) { var p = JSON.parse(localStorage.getItem(k)); if (p && p.g) return p; } } } catch (e) {}
    return null;
  }
  function gender() { var p = profile(); if (p) return p.g === "f" ? "f" : "m"; if (G.S && G.S.ch) return G.S.ch === "girl" ? "f" : "m"; return null; }
  function persona() { return gender() === "f" ? { g: "f", n: "عائشة", c: "#ec4899" } : { g: "m", n: "مازن", c: "#3b82f6" }; }
  function robot(c, f, w) {
    return '<svg viewBox="0 0 64 64" width="' + w + '" height="' + w + '" aria-hidden="true"><line x1="32" y1="6" x2="32" y2="14" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>' +
      '<circle class="ms-ant" cx="32" cy="5" r="4" fill="' + c + '"/><rect x="4" y="26" width="8" height="13" rx="4" fill="' + c + '"/><rect x="52" y="26" width="8" height="13" rx="4" fill="' + c + '"/>' +
      '<rect x="10" y="14" width="44" height="37" rx="15" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="17" y="22" width="30" height="21" rx="10" fill="#0f172a"/>' +
      '<circle class="ms-eye" cx="26" cy="31" r="3.6" fill="#7dd3fc"/><circle class="ms-eye" cx="38" cy="31" r="3.6" fill="#7dd3fc"/>' +
      '<path d="M27 37Q32 41.5 37 37" stroke="#7dd3fc" stroke-width="2.3" fill="none" stroke-linecap="round"/>' +
      (f ? '<circle cx="21" cy="38" r="2.4" fill="#f9a8d4"/><circle cx="43" cy="38" r="2.4" fill="#f9a8d4"/><path d="M44 12L52 7V17ZM44 12L36 7V17Z" fill="#ec4899" stroke="#be185d" stroke-width="1.2" stroke-linejoin="round"/><circle cx="44" cy="12" r="2.6" fill="#fbcfe8"/>' : '') +
      '<rect x="21" y="51" width="22" height="10" rx="5" fill="' + c + '"/></svg>';
  }
  function css() {
    var s = document.createElement("style");
    s.textContent =
      "#msDock{position:fixed;left:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:45;display:none;flex-direction:column;align-items:center;gap:4px}#msDock.on{display:flex}" +
      "#msRobot{filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));animation:msBob 3s ease-in-out infinite}#msDock.live #msRobot{animation:msBob 1s ease-in-out infinite}" +
      "#msNm{font:800 11px/1.5 Cairo,Tahoma,sans-serif;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:0 8px}" +
      "#msFab{width:64px;height:64px;border-radius:50%;border:4px solid #e53935;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.35);display:grid;place-items:center;padding:0;cursor:pointer;touch-action:manipulation}" +
      "#msFab i{display:block;width:32px;height:32px;border-radius:50%;background:#e53935;transition:border-radius .2s,width .2s,height .2s}" +
      "#msFab.live i{border-radius:6px;width:24px;height:24px}#msFab.live{animation:msRing 1.4s infinite}" +
      "@keyframes msRing{0%{box-shadow:0 0 0 0 rgba(229,57,53,.55)}100%{box-shadow:0 0 0 20px rgba(229,57,53,0)}}@keyframes msBob{50%{transform:translateY(-3px)}}" +
      ".ms-eye{animation:msBlink 4s infinite;transform-origin:center;transform-box:fill-box}@keyframes msBlink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}" +
      ".ms-ant{animation:msAnt 1.2s ease-in-out infinite}@keyframes msAnt{50%{opacity:.35}}" +
      "#msBub{position:fixed;left:88px;bottom:calc(112px + env(safe-area-inset-bottom,0px));z-index:46;max-width:min(70vw,300px);background:var(--card);color:var(--ink);border:2px solid var(--acc);border-radius:16px;padding:8px 12px;font-size:14px;line-height:1.7;box-shadow:0 6px 20px rgba(0,0,0,.3);display:none}" +
      "#msBub.on{display:block}#msBub.bad{border-color:var(--warn)}#msBub label{display:flex;gap:6px;align-items:center;font-size:12px;margin:6px 0 0;font-weight:400}" +
      "#msWel{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));width:min(92vw,430px);z-index:70;display:flex;gap:10px;align-items:center;background:var(--card);color:var(--ink);border:2px solid var(--acc);border-radius:20px;padding:10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.4);animation:msUp .5s ease}" +
      "#msWel b{font-size:15px}#msWel p{margin:2px 0 0;font-size:14px;line-height:1.7}#msWel button{border:0;background:none;color:var(--mut);font-size:20px;line-height:1;padding:4px;cursor:pointer;align-self:flex-start}" +
      "@keyframes msUp{from{opacity:0;transform:translate(-50%,-24px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes msIn{from{opacity:.1;transform:scale(.9)}to{opacity:1;transform:none}}" +
      ".tj-hideaya .aya-t .qw.mw{visibility:visible!important;animation:msIn .35s ease}" +
      ".tj-hideaya .aya-t .qw.mw,.tj-hideaya .aya-t .qw.mw *{color:inherit!important}" +
      ".ms-lock .aya-t:not(.rev) .qw:not(.mw){visibility:hidden!important}.tj-hideaya.ms-lock .aya-num{pointer-events:none}";
    document.head.appendChild(s);
  }
  /* --- الفقاعة --- */
  function bub(html, bad, ms) {
    var b = $("msBub"); if (!b) return;
    b.className = "on" + (bad ? " bad" : ""); b.innerHTML = html;
    var gs = b.querySelector("#msGoSet"); if (gs) gs.onclick = openSettings;
    var ck = b.querySelector("#msOnline"); if (ck) { ck.checked = allowOnline(); ck.onchange = function () { try { localStorage.setItem("msOnline", this.checked ? "1" : "0"); } catch (e) {} }; }
    clearTimeout(st.bt); if (ms) st.bt = setTimeout(function () { b.className = ""; }, ms);
  }
  var ONL = '<button type="button" id="msGoSet" class="p" style="margin-top:6px;width:100%">تنزيل حزمة العربية من الإعدادات</button><label><input type="checkbox" id="msOnline"> السماح بالتعرّف عبر الإنترنت (يُرسل الصوت إلى Google)</label>';
  /* --- صوت الخطأ (بلا ملفات: يعمل دون إنترنت) --- */
  var AC = null, lastBeep = 0;
  function beep() {
    API.errs++; st.errs++;
    var now = Date.now(); if (now - lastBeep < 450) return; lastBeep = now;
    try {
      AC = AC || new (G.AudioContext || G.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = "square"; o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(130, t + .22);
      g.gain.setValueAtTime(.14, t); g.gain.exponentialRampToValueAtTime(.001, t + .28);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .3);
    } catch (e) {}
  }
  /* --- النص --- */
  function loadText(cb) {
    if (Q) return cb(true);
    fetch("data/quran-text.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      Q = {}; Object.keys(j).forEach(function (k) {
        var t = j[k]; if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") {
          var w = norm(t).split(" "), bw = ["بسم", "الله", "الرحمن", "الرحيم"];
          if (w.length > 4 && bw.every(function (x, i) { return sk(w[i]) === sk(x); })) t = t.trim().split(/\s+/).slice(4).join(" ");
        }
        Q[k] = t;
      }); cb(true);
    }).catch(function () { cb(false); });
  }
  /* --- بناء وحدات الصفحة وربطها بكلمات المصحف (.qw) --- */
  function buildPage() {
    var X = G.qIndex(), id = X.ps[G.tjState.pg - 1], N = X.s.length, items = [], cache = {};
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t .qw"), function (el) {
      while (id < N && X.m[id]) id++;
      var key = X.s[id] + ":" + X.a[id], c = cache[key], st0, en;
      if (!c || id < c.s || id > c.e) {
        st0 = id; while (st0 > 0 && !X.m[st0 - 1] && X.s[st0 - 1] === X.s[id] && X.a[st0 - 1] === X.a[id]) st0--;
        en = id; while (en + 1 < N && !X.m[en + 1] && X.s[en + 1] === X.s[id] && X.a[en + 1] === X.a[id]) en++;
        c = cache[key] = { s: st0, e: en };
      }
      items.push({ el: el, key: key, j: id - c.s, tot: c.e - c.s + 1 }); id++;
    });
    var units = [], i = 0, g, base, T, nw, ja, jb, tot, a, b, t, ui, k, q;
    while (i < items.length) {
      g = items[i]; ja = g.j; tot = g.tot; k = i;
      while (k + 1 < items.length && items[k + 1].key === g.key) k++;
      jb = items[k].j + 1;
      if (!Q[g.key]) return { ok: false, msg: "ملف النص ناقص عند الآية " + g.key + ". أعد توليد data/quran-text.json." };
      T = toks(Q[g.key]); nw = T.length; if (!nw) { i = k + 1; continue; }
      a = Math.round(ja * nw / tot); b = jb >= tot ? nw : Math.round(jb * nw / tot); if (b <= a) b = Math.min(nw, a + 1); if (b <= a) a = b - 1;
      base = units.length;
      for (t = a; t < b; t++) units.push(mkUnit(T[t], g.key));
      for (q = i; q <= k; q++) { t = Math.min(nw - 1, Math.floor(items[q].j * nw / tot)); ui = base + Math.max(a, Math.min(b - 1, t)) - a; units[ui].dom.push(items[q].el); }
      i = k + 1;
    }
    return units.length ? { ok: true, units: units } : { ok: false, msg: "لا كلمات في هذه الصفحة." };
  }
  function lock() {
    var sh = $("mushafSheet"); sh.classList.add("tj-hideaya", "ms-lock");
    [].forEach.call(document.querySelectorAll("#mushafText .aya-t.rev,#mushafText .qw.mw"), function (e) { e.classList.remove("rev", "mw"); });
    var h = $("tjHideAya"); if (h) h.disabled = true;
  }
  function unlock() { var sh = $("mushafSheet"); if (sh) sh.classList.remove("ms-lock"); var h = $("tjHideAya"); if (h) h.disabled = false; }
  /* لا كشف يدوي أثناء التسميع الآلي */
  document.addEventListener("click", function (e) { if (st.on && e.target.closest && e.target.closest("#mushafText .aya-num")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  function handle(evs) {
    evs.forEach(function (e) {
      if (e.t === "err") beep();
      else if (e.t === "rev") e.idx.forEach(function (i) { st.units[i].dom.forEach(function (el) { el.classList.add("mw"); }); });
      else if (e.t === "done") onDone();
    });
  }
  function onDone() {
    var f = persona().g === "f", m = st.errs;
    bub("🎉 ما شاء الله! " + (f ? "أتممتِ" : "أتممتَ") + " الصفحة" + (m ? " مع " + AQ(m) + " تعثّر" : " بلا تعثّر") + ". اضغط «أنهيت…» لتسجيلها.", false, 7000);
    try { if (G.S) { G.S.tas = G.S.tas || {}; G.S.tas[G.tjState.pg] = { d: G.dkey(new Date()), ok: m ? 0 : 1 }; G.save(); } } catch (e) {}
  }
  function resetPage() {
    clearTimeout(st.tm); st.cm = 0; st.last = []; st.errs = 0;
    var b = buildPage();
    if (!b.ok) { st.sess = null; if (st.on) bub(b.msg, true); return; }
    st.units = b.units; st.sess = new Session(b.units); if (st.on) lock();
  }
  /* تغذية الجلسة: الكلمة الأخيرة في النص المؤقت غير مستقرة فلا تُحكم حتى تستقر أو يصمت القارئ */
  function feedTo(upto) { for (var i = st.cm; i < upto; i++) handle(st.sess.feed(st.last[i])); if (upto > st.cm) st.cm = upto; }
  function settle() { if (!st.on || !st.sess) return; feedTo(st.last.length); handle(st.sess.flush()); }
  function onSpeech(text, fin) {
    if (!st.on || !st.sess) return;
    var tk = toks(text); st.last = tk;
    feedTo(fin ? tk.length : Math.max(0, tk.length - 1));
    if (fin) { st.cm = 0; st.last = []; }
    clearTimeout(st.tm); st.tm = setTimeout(settle, fin ? 700 : 1100);
  }
  /* المحرك: محلي مخصص (window.MusammiEngine) ثم تعرّف الجهاز. الإنترنت لا يُستخدم إلا بإذنك */
  function engine() {
    if (G.MusammiEngine) return G.MusammiEngine;
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(); r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    if ("processLocally" in r) r.processLocally = true; else if (!allowOnline()) return null;
    return { start: function (cb, onEnd) {
      r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) cb(e.results[i][0].transcript, e.results[i].isFinal); };
      r.onerror = function (e) { onEnd(e.error); }; r.onend = function () { onEnd(); };
      r.start();
    }, stop: function () { try { r.abort(); } catch (e) {} },
    ready: function (cb) {
      if (!G.SpeechRecognition || !G.SpeechRecognition.available) return cb(true);
      var fb = function (why) { if (allowOnline()) { r.processLocally = false; return cb(true); } cb(false, why); };
      G.SpeechRecognition.available({ langs: ["ar-SA"], processLocally: true }).then(function (s) {
        if (s === "available") return cb(true);
        if (s === "unavailable") return fb("حزمة العربية للتعرّف الصوتي غير متاحة على هذا الجهاز.");
        bub("جارٍ تنزيل حزمة التعرّف على العربية (مرة واحدة)…");
        G.SpeechRecognition.install({ langs: ["ar-SA"], processLocally: true }).then(function (ok) { ok ? cb(true) : fb("تعذّر تنزيل الحزمة."); }, function () { fb("تعذّر تنزيل الحزمة."); });
      }, function () { cb(true); });
    } };
  }
  function start() {
    try { AC = AC || new (G.AudioContext || G.webkitAudioContext)(); AC.resume(); } catch (e) {}
    loadText(function (ok) {
      if (!ok) return bub("ملف النص غير موجود: ضع data/quran-text.json بجانب index.html.", true);
      var en = engine();
      if (!en) return bub("هذا المتصفح لا يوفّر تعرّفًا صوتيًا يعمل دون إنترنت." + ONL, true);
      (en.ready || function (c) { c(true); })(function (good, why) {
        if (!good) return bub((why || "المحرك غير جاهز.") + " نزّل حزمة العربية دون اتصال في إعدادات الهاتف، أو:" + ONL, true);
        st.rec = en; st.on = true; $("msFab").classList.add("live"); $("msDock").classList.add("live"); $("msFab").setAttribute("aria-label", "إيقاف");
        resetPage(); if (st.sess) bub("أنا " + persona().n + " 🎧 ابدأ القراءة من أي موضع في الصفحة.", false, 3500);
        var run = function () { st.cm = 0; st.last = []; en.start(onSpeech, function (err) {
          if (!st.on) return;
          if (err === "not-allowed" || err === "service-not-allowed") { bub("اسمح للموقع باستخدام الميكروفون.", true); return stop(true); }
          if (err === "network" || err === "language-not-supported") { bub("لا يعمل التعرّف الآن دون إنترنت. نزّل حزمة العربية دون اتصال، أو:" + ONL, true); return stop(true); }
          setTimeout(run, 250); }); };
        run();
      });
    });
  }
  function stop(keepBub) {
    st.on = false; clearTimeout(st.tm); if (st.rec) st.rec.stop();
    var f = $("msFab"); if (f) { f.classList.remove("live"); f.setAttribute("aria-label", "تسجيل"); }
    var d = $("msDock"); if (d) d.classList.remove("live");
    unlock(); if (!keepBub) { var b = $("msBub"); if (b) b.className = ""; }
  }
  function syncBar() {
    var d = $("msDock"), m = G.tjState && G.tjState.mode, m0 = $("tjModes"), vis = !!(m0 && m0.offsetParent) && (m === "review" || m === "tasmee");
    if (d) d.classList.toggle("on", vis);
    if (!vis && st.on) stop();
  }
  /* --- الترحيب: الروبوت يحيّي المستخدم برسالة تحفيزية --- */
  var MSG = {
    m: ["«خيركم من تعلّم القرآن وعلّمه» — خطوة اليوم تقرّبك من الإتقان.", "القليل الدائم خيرٌ من الكثير المنقطع، فاثبت على وردك.", "كل كلمة تُتقنها اليوم تبقى معك غدًا بإذن الله.", "أنت أقوى مما تظن، وبدايتك اليوم هي نصف الطريق.", "الماهر بالقرآن مع السفرة الكرام البررة، فاجتهد."],
    f: ["«خيركم من تعلّم القرآن وعلّمه» — خطوة اليوم تقرّبكِ من الإتقان.", "القليل الدائم خيرٌ من الكثير المنقطع، فاثبتي على وردكِ.", "كل كلمة تُتقنينها اليوم تبقى معكِ غدًا بإذن الله.", "أنتِ أقوى مما تظنين، وبدايتكِ اليوم هي نصف الطريق.", "الماهر بالقرآن مع السفرة الكرام البررة، فاجتهدي."]
  };
  function welcome() {
    try { if (sessionStorage.getItem("msWel")) return true; } catch (e) {}
    var g = gender(); if (!g || document.querySelector(".tjg:not(.hide)") || !document.body) return false;
    var p = persona(), pr = profile(), nm = pr && pr.n ? " يا " + String(pr.n).replace(/[<>&"']/g, "") : "", ms = MSG[g], w = document.createElement("div");
    w.id = "msWel"; w.setAttribute("role", "status");
    w.innerHTML = robot(p.c, g === "f", 58) + '<div style="flex:1"><b>أهلًا بك' + nm + "! أنا " + p.n + "، مسمّعك الآلي 🤖</b><p>" + ms[Math.floor(Math.random() * ms.length)] + '</p></div><button type="button" aria-label="إغلاق">×</button>';
    document.body.appendChild(w);
    var off = function () { if (w.parentNode) w.parentNode.removeChild(w); };
    w.onclick = off; setTimeout(off, 11000);
    try { sessionStorage.setItem("msWel", "1"); } catch (e) {}
    return true;
  }

  /* --- بطاقة المسمّع الآلي داخل الإعدادات: فحص الحزمة وتنزيلها --- */
  function openSettings() {
    var b = $("setBtn") && $("setBtn").offsetParent ? $("setBtn") : ($("setBtn2") || $("setBtn")); if (b) b.click();
    setTimeout(function () { var c = $("msSec"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "center" }); refresh(); }, 200);
  }
  var HELP = "<ol style='margin:6px 0;padding-inline-start:20px;font-size:13px;line-height:1.9'><li>افتح إعدادات الهاتف ← النظام (أو الإدارة العامة) ← اللغة ولوحة المفاتيح.</li><li>لوحة المفاتيح على الشاشة ← Gboard ← الكتابة بالصوت.</li><li>التعرّف على الكلام دون إنترنت ← اختر «العربية» ونزّلها وأنت على واي فاي.</li><li>عد إلى التطبيق وجرّب المسمّع.</li></ol><p class='sub' style='font-size:12px'>تختلف التسميات من هاتف لآخر، وبعض المتصفحات لا تستخدم هذه الحزمة دون إنترنت. إن لم تنجح فاستخدم Chrome المحدَّث.</p>";
  function refresh() {
    var t = $("msSt"), bt = $("msInst"), hp = $("msHelp"); if (!t) return;
    bt.classList.add("hide"); hp.classList.add("hide");
    if (G.MusammiEngine) { t.textContent = "✓ المحرك المحلي مدمج في التطبيق، يعمل دون إنترنت."; return; }
    var SR = G.SpeechRecognition;
    if (!SR || !SR.available) {
      if (G.webkitSpeechRecognition) { t.textContent = "متصفحك لا يتيح تنزيل الحزمة من داخل التطبيق. نزّلها من إعدادات هاتفك:"; hp.classList.remove("hide"); }
      else t.textContent = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome المحدَّث.";
      return;
    }
    SR.available({ langs: ["ar-SA"], processLocally: true }).then(function (s) {
      if (s === "available") t.textContent = "✓ حزمة العربية مثبتة: المسمّع يعمل دون إنترنت.";
      else if (s === "downloadable") { t.textContent = "حزمة العربية غير مثبتة. نزّلها مرة واحدة وأنت متصل بالإنترنت (يُفضَّل واي فاي)، وبعدها يعمل المسمّع دون إنترنت."; bt.classList.remove("hide"); bt.disabled = false; bt.textContent = "تنزيل حزمة العربية للتعرّف الصوتي"; }
      else if (s === "downloading") { t.textContent = "جارٍ تنزيل الحزمة… لا تغلق الصفحة."; poll(0); }
      else { t.textContent = "هذا الجهاز لا يوفّر حزمة عربية للتعرّف المحلي. جرّب الخطوات التالية:"; hp.classList.remove("hide"); }
    }, function () { t.textContent = "تعذّر فحص الحزمة."; hp.classList.remove("hide"); });
  }
  function poll(n) {
    G.SpeechRecognition.available({ langs: ["ar-SA"], processLocally: true }).then(function (s) {
      if (s !== "downloading" || n > 90) refresh(); else setTimeout(function () { poll(n + 1); }, 2000);
    }, refresh);
  }
  function install() {
    var t = $("msSt"), bt = $("msInst"), fail = function () { t.textContent = "تعذّر التنزيل. تأكد من الاتصال بالإنترنت وأعد المحاولة."; bt.disabled = false; bt.textContent = "أعد المحاولة"; };
    bt.disabled = true; bt.textContent = "جارٍ التنزيل… لا تغلق الصفحة"; t.textContent = "جارٍ تنزيل حزمة العربية…";
    G.SpeechRecognition.install({ langs: ["ar-SA"], processLocally: true }).then(function (ok) { if (!ok) return fail(); poll(0); }, fail);
  }
  function mountSettings() {
    if ($("msSec")) return true;
    var off = $("offSec") || $("stgLang"), host = off && off.closest(".stg-sec") ? off.closest(".stg-sec") : off;
    if (!host || !host.parentNode) return false;
    var sec = document.createElement("div"); sec.className = "stg-sec"; sec.id = "msSec";
    sec.innerHTML = "<label>المسمّع الآلي (التسميع بالصوت)</label><p class='sub' id='msSt'>جارٍ الفحص…</p>" +
      "<button type='button' id='msInst' class='p hide' style='width:100%'></button><div id='msHelp' class='hide'>" + HELP + "</div>" +
      "<label style='display:flex;gap:6px;align-items:center;font-weight:400;margin-top:10px'><input type='checkbox' id='msOnline2'> السماح بالتعرّف عبر الإنترنت عند عدم توفر الحزمة (يُرسل الصوت إلى Google)</label>";
    host.parentNode.insertBefore(sec, host.nextSibling);
    var ck = $("msOnline2"); ck.checked = allowOnline();
    ck.onchange = function () { try { localStorage.setItem("msOnline", this.checked ? "1" : "0"); } catch (e) {} };
    $("msInst").onclick = install;
    ["setBtn", "setBtn2"].forEach(function (i) { var x = $(i); if (x) x.addEventListener("click", function () { setTimeout(function () { var c = $("msOnline2"); if (c) c.checked = allowOnline(); refresh(); }, 50); }); });
    return true; /* الفحص يجري فقط عند فتح الإعدادات */
  }
  function init() {
    if (!$("tjModes") || $("msFab")) return;
    mountSettings();
    css();
    var d = document.createElement("div"); d.id = "msDock";
    d.innerHTML = '<div id="msRobot"></div><span id="msNm"></span><button id="msFab" type="button" aria-label="تسجيل"><i></i></button>';
    document.body.appendChild(d);
    var b = document.createElement("div"); b.id = "msBub"; b.setAttribute("aria-live", "polite"); document.body.appendChild(b);
    var paint = function () { var q = persona(); $("msRobot").innerHTML = robot(q.c, q.g === "f", 50); $("msNm").textContent = q.n; };
    paint();
    $("msFab").onclick = function () { st.on ? stop() : start(); };
    $("msRobot").onclick = function () { var q = persona(); bub("أنا " + q.n + "، مسمّعك الآلي. اضغط الدائرة الحمراء وابدأ القراءة.", false, 3500); };
    var o = G.tjRenderPage; G.tjRenderPage = function () { var r = o.apply(this, arguments); resetPage(); return r; };
    setInterval(function () { syncBar(); var q = persona(); if ($("msNm").textContent !== q.n) paint(); }, 700); syncBar();
    var n = 0, iv = setInterval(function () { if (welcome() || ++n > 90) clearInterval(iv); }, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
