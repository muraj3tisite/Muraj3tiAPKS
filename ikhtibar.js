/* اختبار المحفوظ.
   تُتلى عبارة «أكمل من قوله تعالى» بتسجيل حقيقي (audio/akmil.mp3)، ثم آية بصوت الشيخ محمد أيوب،
   ثم تبدأ فرصة القارئ: يكمل متواصلًا عدة آيات (٢ أو ٣ أو ٥ أو ١٠ أو حتى نهاية الصفحة) وتظهر كل آية حين يتمّها.
   إن أتمّ الكل صحيحًا نجح الاختبار وجاءت آية جديدة، وإلا ظهر الصحيح وبُيّن موضع الخطأ.
   الآيات تُختار عشوائيًا من الصفحات المحفوظة (S.a إلى S.b). يحتاج الإنترنت: الصوت من everyayah.com والتعرّف من المتصفح. */
(function (G) {
  "use strict";
  var M = G.Musammi;
  if (!M) return;
  var $ = function (i) { return document.getElementById(i); };
  var AUDIO = "https://everyayah.com/data/Muhammad_Ayyoub_128kbps/";   /* ملفات SSSAAA.mp3 */
  var PHRASE = "أكمل من قوله تعالى", PHRASE_AUDIO = "audio/akmil.mp3";   /* تسجيل حقيقي يضعه صاحب التطبيق */
  var TOL = .75;

  var CS = [2, 3, 5, 10, 0];   /* عدد الآيات المطلوب إكمالها في الاختبار الواحد؛ ٠ = حتى نهاية الصفحة */
  var CFG = { n: 5, c: 5 };   /* عدد الاختبارات (٥–١٠) */
  try { var sv = JSON.parse(localStorage.getItem("ikCfg") || "null"); if (sv && sv.n >= 5 && sv.n <= 10 && CS.indexOf(sv.c) >= 0) CFG = { n: sv.n, c: sv.c }; } catch (e) {}
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
    return { V: V, pst: pst, as: as, ae: ae, s: sN, a: aN };
  }
  /* الآيات الواقعة كاملةً داخل صفحات المحفوظ */
  function memRange() {
    var S = G.S; if (!S || !D) return null;
    var a = Math.max(1, S.a | 0), b = Math.min(604, S.b | 0); if (!(b >= a)) return null;
    var ws = D.pst[a - 1], we = D.pst[b], lo = -1, hi = -1;
    for (var k = 0; k < D.as.length; k++) if (D.as[k] >= ws && D.ae[k] <= we) { if (lo < 0) lo = k; hi = k; }
    return lo < 0 ? null : { lo: lo, hi: hi, a: a, b: b };
  }
  function pageOf(k) { for (var p = 0; p < 604; p++) if (D.pst[p] <= D.as[k] && D.as[k] < D.pst[p + 1]) return p + 1; return 0; }
  function keyOf(k) { return D.s[k] + ":" + D.a[k]; }
  function sName(s) { return String(D.V.NM[s - 1] || "").replace(/^سُورَةُ\s*/, "") || ("سورة " + AR(s)); }
  var pad3 = function (n) { return ("00" + n).slice(-3); };

  /* طول السلسلة بعد آية السؤال: عدد محدّد، أو حتى نهاية صفحة آية السؤال (بحدٍّ أقصى ٢٠)، داخل السورة والمحفوظ */
  function chainLen(k, c, R) {
    var len = 0, end;
    if (c > 0) { while (len < c && k + len + 1 <= R.hi && D.s[k + len + 1] === D.s[k]) len++; return len; }
    end = D.pst[pageOf(k)];
    while (len < 20 && k + len + 1 <= R.hi && D.s[k + len + 1] === D.s[k] && D.ae[k + len + 1] <= end) len++;
    return len;
  }
  function pick(n, c, R) {
    var out = [], used = {}, tries = 0, k, len, j, clash, need = c > 0 ? c : 2;
    while (out.length < n && tries < 900) {
      tries++;
      k = R.lo + Math.floor(Math.random() * (R.hi - R.lo + 1));
      len = chainLen(k, c, R);
      if (len < 1 || (tries < 500 && len < need)) continue;      /* نفضّل السلسلة الكاملة أولًا */
      clash = false; for (j = k; j <= k + len; j++) if (used[j]) clash = true;
      if (clash && tries < 700) continue;                         /* ثم نسمح بالتداخل إن ضاق المحفوظ */
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
        if (/:1$/.test(k) && k !== "1:1" && k !== "9:1") { var w = M.norm(t).split(" "); if (M.isBsm(w) && w.length > 4) t = t.trim().split(/\s+/).slice(4).join(" "); }
        Q[k] = t;
      });
      cb(true);
    }).catch(function () { cb(false); });
  }
  /* الآية: كلمات العرض + الكلمات المتوقعة (مطبَّعة) + الحروف المقطّعة إن بدأت بها */
  function prep(key) {
    var raw = String(Q[key] || "").trim().split(/\s+/), disp = [], E = [];
    raw.forEach(function (w) {
      var n = M.norm(w);
      if (!n) { if (disp.length) disp[disp.length - 1].raw += " " + w; return; }   /* علامات الوقف تلتصق بما قبلها */
      var tk = n.split(" ").filter(Boolean), it = { raw: w, a: E.length };
      tk.forEach(function (t) { E.push(t); }); it.b = E.length; disp.push(it);
    });
    var muq = null;
    if ((/:1$/.test(key) || key === "42:2") && E.length && M.muqOf) { var m = M.muqOf(E[0]); if (m) { E[0] = m; muq = m.split(""); } }
    return { disp: disp, E: E, muq: muq };
  }

  /* ===== سلسلة الآيات المطلوبة: كلمات متوقعة متصلة، وحدود كل آية ===== */
  function sk(w) { w = w.replace(/^ال(?=..)/, ""); return w.replace(/ا/g, ""); }
  function prepChain(ks) {
    var ch = { ks: ks, keys: [], ay: [], E: [], muqAt: {}, disp: [] };
    ks.forEach(function (k, j) {
      var key = keyOf(k), P = prep(key), base = ch.E.length;
      P.E.forEach(function (t) { ch.E.push(t); });
      if (P.muq) ch.muqAt[base] = P.muq;
      P.disp.forEach(function (w) { ch.disp.push({ raw: w.raw, a: w.a + base, b: w.b + base, ay: j }); });
      ch.keys.push(key); ch.ay.push({ start: base, end: ch.E.length, n: D.a[k] });
    });
    return ch;
  }
  /* المطابقة: كلمات الآيات بالترتيب، مع تسامح بسيط مع أخطاء التعرّف */
  function allowed(n) { return n < 8 ? 0 : (n < 16 ? 1 : 2); }   /* تسامح في الآيات الطويلة فقط */
  function align(E, S, muqAt) {
    var n = E.length, p = 0, i = 0, miss = [], q, ok, mq;
    muqAt = muqAt || {};
    while (i < S.length && p < n) {
      mq = muqAt[p];
      if (mq) {
        if (M.wsim(E[p], S[i]) >= TOL) { p++; i++; continue; }
        ok = true; for (q = 0; q < mq.length; q++) if (!M.nameOk(mq[q], S[i + q])) { ok = false; break; }
        if (ok) { p++; i += mq.length; continue; }
        i++; continue;
      }
      if (M.wsim(E[p], S[i]) >= TOL) { p++; i++; continue; }
      /* كلمة بدل كلمة: التالية تطابق ما بعدها */
      if (S[i + 1] !== undefined && p + 1 < n && M.wsim(E[p + 1], S[i + 1]) >= TOL) { miss.push(p); p++; i++; continue; }
      /* كلمة ناقصة: ما نُطق يطابق الكلمة التي بعدها */
      if (p + 1 < n && M.wsim(E[p + 1], S[i]) >= TOL && (S[i + 1] === undefined || p + 2 >= n || M.wsim(E[p + 2], S[i + 1]) >= TOL)) { miss.push(p); p += 2; i++; continue; }
      i++;   /* كلام زائد أو ضجيج */
    }
    return { p: Math.min(p, n), miss: miss.length, missAt: miss };
  }
  /* إن أعاد القارئ آية السؤال أولًا (عادة شائعة) نتجاوز ما أعاده */
  function stripLead(S, P0, E, muqAt) {
    if (!S.length || !P0 || !P0.length || (muqAt && muqAt[0])) return S;
    if (M.wsim(E[0], S[0]) >= TOL) return S;
    var i = 0, p = 0;
    while (i < S.length && p < P0.length && M.wsim(P0[p], S[i]) >= TOL) { p++; i++; }
    return (p >= 2 || (p >= 1 && P0.length === 1)) ? S.slice(i) : S;
  }
  /* هل كل آية ضمن تسامحها؟ */
  function ayOK(ch, r) {
    return ch.ay.every(function (A) { return r.missAt.filter(function (q) { return q >= A.start && q < A.end; }).length <= allowed(A.end - A.start); });
  }
  function failAy(ch, r) {
    for (var j = 0; j < ch.ay.length; j++) {
      var A = ch.ay[j];
      if (A.end > r.p || r.missAt.filter(function (q) { return q >= A.start && q < A.end; }).length > allowed(A.end - A.start)) return j;
    }
    return ch.ay.length - 1;
  }

  /* ===== تعرّف الآية من كلام القارئ (على القرآن كله) ===== */
  var IDX = null;
  function buildIdx() {
    IDX = { inv: {}, len: {} };
    Object.keys(Q).forEach(function (key) {
      var seen = {}, c = 0;
      M.norm(Q[key]).split(" ").filter(Boolean).forEach(function (t) { var x = sk(t); if (!x || seen[x]) return; seen[x] = 1; c++; (IDX.inv[x] = IDX.inv[x] || []).push(key); });
      IDX.len[key] = c;
    });
  }
  function identify(S) {
    if (!Q || S.length < 3) return null;
    if (!IDX) buildIdx();
    var seen = {}, tot = 0, W = {}, best = null, bs = 0, N = Object.keys(IDX.len).length;
    S.forEach(function (t) {
      var x = sk(t), L = IDX.inv[x]; if (!x || seen[x] || !L) return; seen[x] = 1;
      var w = Math.log(N / L.length); tot += w;
      L.forEach(function (k) { W[k] = (W[k] || 0) + w; });
    });
    if (!tot) return null;
    Object.keys(W).forEach(function (k) { var cov = W[k] / tot; if (cov > bs && W[k] / (IDX.len[k] || 1) > .45) { bs = cov; best = k; } });
    return bs >= .6 ? { key: best, score: bs } : null;
  }

  /* ===== التعرّف الصوتي (عبر الإنترنت): نختار من بدائل التعرّف الأوفق للمطلوب ===== */
  function toks(s) { var n = M.norm(s); return n ? n.split(" ") : []; }
  function listen(score, onProg, onErr) {
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(), fin = [], itx = [], active = true;
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 5;
    try { if ("processLocally" in r) r.processLocally = false; } catch (e) {}
    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], best = [], bs = -1, k, tk, sc;
        for (k = 0; k < res.length; k++) { tk = toks(res[k].transcript); sc = score(fin.concat(tk)); if (sc > bs) { bs = sc; best = tk; } }
        if (res.isFinal) { fin = fin.concat(best); itx = []; } else itx = best;
      }
      onProg(fin.concat(itx));
    };
    r.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "network" || e.error === "language-not-supported") { active = false; onErr(e.error); } };
    r.onend = function () { if (active) setTimeout(function () { if (active) { try { r.start(); } catch (e) {} } }, 200); };
    try { r.start(); } catch (e) { return null; }
    return { stop: function () { active = false; try { r.abort(); } catch (e) {} } };
  }

  /* ===== الصوت: عبارة «أكمل من قوله تعالى» (تسجيل حقيقي) وتلاوة الشيخ محمد أيوب ===== */
  var AU = null;
  function playSrc(src, maxMs) {
    return new Promise(function (res) {
      var d = false, f = function (v) { if (!d) { d = true; res(v); } };
      AU.onended = function () { f(true); }; AU.onerror = function () { f(false); };
      AU.src = src;
      var p = AU.play(); if (p && p.catch) p.catch(function () { f(false); });
      setTimeout(function () { f(false); }, maxMs);
    });
  }
  var playPhrase = function () { return playSrc(PHRASE_AUDIO, 10000); };   /* إن لم يوجد الملف يستمر الاختبار بالنص فقط */
  var play = function (k) { return playSrc(AUDIO + pad3(D.s[k]) + pad3(D.a[k]) + ".mp3", 120000); };
  function silence() { try { if (AU) { AU.onended = null; AU.onerror = null; AU.pause(); } } catch (e) {} }

  /* ===== الجلسة ===== */
  var SID = 0, T = null, CUR = null;
  var dead = function (sid) { return sid !== SID || !T; };

  var CSS = "#t-test .ik-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}" +
    "#t-test .ik-st{font-weight:700;margin:12px 0 4px;min-height:1.8em}" +
    "#t-test .ik-ay{font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:26px;line-height:2.6;text-align:justify;min-height:3em;padding:6px 4px}" +
    "#t-test .ikn{color:var(--mut);font-size:.8em;margin-inline-start:2px}" +
    "#t-test .ikw{display:inline-block;margin:0 3px;padding:0 6px;border-radius:8px;transition:background .25s,color .25s}" +
    "#t-test .ikw:not(.on){color:transparent;background:var(--acc2);text-shadow:none;user-select:none}" +
    "#t-test .ik-ay.ok .ikw.on{color:var(--ok)}" +
    "#t-test .ik-ay.bad .ikw.on.x{color:#d93025;background:rgba(217,48,37,.14)}" +
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
    var R = D && memRange(), seg1 = "", seg2 = "", i, cl = { 2: "آيتان", 3: "٣ آيات", 5: "٥ آيات", 10: "١٠ آيات", 0: "إلى نهاية الصفحة" };
    for (i = 5; i <= 10; i++) seg1 += '<button data-n="' + i + '" aria-pressed="' + (CFG.n === i) + '">' + AR(i) + "</button>";
    CS.forEach(function (c) { seg2 += '<button data-c="' + c + '" aria-pressed="' + (CFG.c === c) + '">' + cl[c] + "</button>"; });
    el.innerHTML = '<div class="card"><h2>اختبار محفوظي</h2>' +
      '<p class="sub">يقول لك الصوت «' + PHRASE + '» ثم تُتلى آية بصوت الشيخ محمد أيوب. ' + gn("أكمل", "أكملي") + ' ما بعدها من حفظك متواصلًا إلى العدد المحدّد، وتظهر كل آية حين تتمّها. ثم تأتي آية جديدة.</p>' +
      (msg ? '<p class="warn" role="alert">' + esc(msg) + "</p>" : "") +
      (R ? '<p class="sub" style="margin-top:8px">من محفوظك: الصفحات ' + AR(R.a) + " إلى " + AR(R.b) + ".</p>"
         : '<p class="warn">حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي» ليُختار الاختبار من محفوظك.</p>') +
      '<label>عدد الاختبارات</label><div class="seg" id="ikN">' + seg1 + "</div>" +
      '<label>المطلوب إكماله بعد الآية المسموعة</label><div class="seg" id="ikC">' + seg2 + "</div>" +
      '<div class="row"><button class="p" id="ikGo"' + (R ? "" : " disabled") + ">ابدأ الاختبار</button></div>" +
      '<p class="sub" style="margin-top:10px">يحتاج اتصالًا بالإنترنت وإذن الميكروفون. اقرأ بصوت واضح وهادئ وقريب من الجهاز.</p></div>';
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

  /* عرض السلسلة: كل آية تظهر كلماتها بقدر ما أُتمّ منها، ورقم الآية يظهر حين تكتمل */
  function renderChain(ch, p, bad, all, ok) {
    return ch.ay.map(function (A, j) {
      var inner = ch.disp.filter(function (w) { return w.ay === j; }).map(function (w) {
        var on = all || w.b <= p, x = false, q;
        if (all && !ok) { x = w.a >= p; for (q = w.a; q < w.b; q++) if (bad[q]) x = true; }
        return '<span class="ikw' + (on ? " on" : "") + (x ? " x" : "") + '">' + esc(w.raw) + "</span>";
      }).join(" ");
      return inner + ((all || p >= A.end) ? ' <span class="ikn">﴿' + AR(A.n) + "﴾</span>" : "");
    }).join(" ");
  }

  /* فرصة القارئ: يكمل متواصلًا سلسلة الآيات. تُرجع {ok, p, heard} */
  function chance(sid, ch, P0, label) {
    return new Promise(function (resolve) {
      var N = ch.E.length, start = Date.now(), lim = Math.min(300000, 15000 + 1800 * N), lastLen = 0, lastT = Date.now(),
        done = false, rec = null, iv = null, cur = { p: 0, miss: 0, missAt: [] }, heard = [], box = $("ikAy");
      var ev = function (S) { return align(ch.E, stripLead(S, P0, ch.E, ch.muqAt), ch.muqAt); };
      var good = function (r) { return r.p >= N && ayOK(ch, r); };
      box.className = "ik-ay"; box.innerHTML = renderChain(ch, 0, {}, false, true);
      setSt("🎤 " + label);
      function finish(ok) {
        if (done) return; done = true; clearInterval(iv); if (rec) rec.stop(); CUR = null;
        if (!dead(sid)) {
          var bad = {}; cur.missAt.forEach(function (q) { bad[q] = 1; });
          box.className = "ik-ay " + (ok ? "ok" : "bad"); box.innerHTML = renderChain(ch, cur.p, bad, true, ok);
        }
        resolve({ ok: ok, p: cur.p, r: cur, heard: heard });
      }
      CUR = { finish: finish };
      rec = listen(function (S) { return ev(S).p; }, function (S) {
        if (done) return;
        heard = S; cur = ev(S);
        box.innerHTML = renderChain(ch, cur.p, {}, false, true);
        if (S.length !== lastLen) { lastLen = S.length; lastT = Date.now(); }
        if (cur.p >= N) finish(good(cur));
      }, function (err) {
        if (T) T.fatal = (err === "not-allowed" || err === "service-not-allowed") ? "اسمح للموقع باستخدام الميكروفون ثم أعد المحاولة." : "تعذّر التعرّف الصوتي. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.";
        finish(false);
      });
      if (!rec) { if (T) T.fatal = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome أو Edge أو Safari."; return finish(false); }
      iv = setInterval(function () {
        var el = Date.now() - start; setBar("ikTm", 100 - el / lim * 100);
        if (el > lim || (lastLen > 0 && Date.now() - lastT > 6000)) finish(good(cur));
      }, 250);
    });
  }

  async function runTest(sid, i) {
    var pr = T.prompts[i], ks = [], j, res, P0;
    for (j = 1; j <= pr.len; j++) ks.push(pr.k + j);
    var ch = prepChain(ks); P0 = prep(keyOf(pr.k)).E;
    $("ikNo").textContent = "الاختبار " + AR(i + 1) + " من " + AR(T.prompts.length);
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i);
    setBar("ikPg", i / T.prompts.length * 100); setBar("ikTm", 0);
    $("ikAy").className = "ik-ay"; $("ikAy").innerHTML = "";
    setSt("🔊 " + PHRASE + "…");
    await playPhrase(); if (dead(sid)) return;
    setSt("🎧 " + gn("استمع", "استمعي") + " إلى الآية…");
    var heardP = await play(pr.k); if (dead(sid)) return;
    if (!heardP) {   /* تعذّر الصوت: نعرض نص آية السؤال ليستمر الاختبار */
      var pp = prepChain([pr.k]);
      setSt("تعذّر تشغيل الصوت. هذه هي الآية:");
      $("ikAy").innerHTML = renderChain(pp, 0, {}, true, true);
      await wait(5000); if (dead(sid)) return;
    }
    res = await chance(sid, ch, P0, gn("أكمل", "أكملي") + " الآيات التي بعدها" + (pr.len > 1 ? " (" + AR(pr.len) + " آيات)" : ""));
    if (dead(sid) || T.fatal) return;
    var doneAy = ch.ay.filter(function (A) { return A.end <= res.p; }).length;
    T.res.push({ k: pr.k, len: pr.len, done: res.ok ? pr.len : Math.min(doneAy, pr.len), ok: res.ok });
    if (res.ok) { T.score++; setSt("✓ " + gn("أحسنتَ", "أحسنتِ") + "! " + gn("أتممتَ", "أتممتِ") + " الاختبار"); }
    else {
      var fj = failAy(ch, res.r), id = identify(res.heard), msg;
      if (!res.heard.length) msg = "لم أسمع صوتك.";
      else if (id && ch.keys.indexOf(id.key) < 0) { var pa = id.key.split(":"); msg = "ما " + gn("قرأتَه", "قرأتِه") + " يشبه: سورة " + sName(+pa[0]) + "، الآية " + AR(pa[1]) + "."; }
      else msg = "توقّفتَ أو أخطأتَ في الآية " + AR(ch.ay[fj].n) + ".";
      setSt("✗ " + msg + " " + gn("استمع", "استمعي") + " إلى الصحيح");
      await play(ks[fj]); if (dead(sid)) return;
    }
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i + 1);
    await wait(1800);
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
    loadText(function (ok) {
      if (!ok) return renderSetup("ملف النص غير موجود: ضع data/quran-text.json.");
      var pr = pick(CFG.n, CFG.c, R);
      if (!pr.length) return renderSetup("محفوظك قليل لإجراء اختبار. أضف صفحات أكثر ثم أعد المحاولة.");
      T = { prompts: pr, res: [], score: 0, fatal: "" };
      renderRun(); runSession();
    });
  }

  /* ===== الأحداث ===== */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#t-test button"); if (!b) return;
    if (b.dataset.n) { CFG.n = +b.dataset.n; saveCfg(); [].forEach.call($("ikN").children, function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.dataset.c !== undefined) { CFG.c = +b.dataset.c; saveCfg(); [].forEach.call($("ikC").children, function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.id === "ikGo" || b.id === "ikAgain") return start();
    if (b.id === "ikBack") return renderSetup();
    if (b.id === "ikSk") { if (CUR) CUR.finish(false); return; }
    if (b.id === "ikQt") { endSession(); return renderSetup(); }
  });

  G.Ikhtibar = {
    open: function () { if (!D) D = buildMap(); if (!T) renderSetup(D ? "" : "تعذّر تحميل بيانات المصحف."); },
    leave: function () { if (T) { endSession(); renderSetup(); } },
    _t: { align: align, prep: prep, prepChain: prepChain, stripLead: stripLead, ayOK: ayOK, identify: identify, setIdx: function () { IDX = null; }, chainLen: chainLen, pick: pick, buildMap: function () { D = buildMap(); return D; }, memRange: memRange, setText: function (q) { Q = q; }, pageOf: pageOf, keyOf: keyOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
