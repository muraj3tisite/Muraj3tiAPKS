/* اختبار المحفوظ.
   يقول صوتٌ «أكمل من قوله تعالى»، ثم تُتلى آية بصوت الشيخ محمد أيوب، ثم تبدأ فرصة القارئ ليكمل ما بعدها.
   إن أكمل صحيحًا تظهر الآية، ويتابع الآيات التالية إلى العدد المحدّد، ثم تأتي آية جديدة، وهكذا.
   الآيات تُختار عشوائيًا من الصفحات التي حدّدها المستخدم أنها محفوظة (S.a إلى S.b).
   يحتاج الإنترنت: الصوت من everyayah.com والتعرّف الصوتي من المتصفح. */
(function (G) {
  "use strict";
  var M = G.Musammi;
  if (!M) return;
  var $ = function (i) { return document.getElementById(i); };
  var AUDIO = "https://everyayah.com/data/Muhammad_Ayyoub_128kbps/";   /* ملفات SSSAAA.mp3 */
  var PHRASE = "أكمل من قوله تعالى";
  var TOL = .75;

  var CFG = { n: 5, c: 3 };   /* عدد الاختبارات (٥–١٠)، وعدد الآيات المطلوب إكمالها في كل اختبار (١–٥) */
  try { var sv = JSON.parse(localStorage.getItem("ikCfg") || "null"); if (sv && sv.n >= 5 && sv.n <= 10 && sv.c >= 1 && sv.c <= 5) CFG = { n: sv.n, c: sv.c }; } catch (e) {}
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

  /* اختيار آيات الأسئلة: كل سؤال آية يتبعها (حتى c) آيات من السورة نفسها داخل المحفوظ */
  function pick(n, c, R) {
    var out = [], used = {}, tries = 0, k, len, j, clash;
    while (out.length < n && tries < 900) {
      tries++;
      k = R.lo + Math.floor(Math.random() * (R.hi - R.lo + 1));
      len = 0; while (len < c && k + len + 1 <= R.hi && D.s[k + len + 1] === D.s[k]) len++;
      if (len < 1 || (tries < 500 && len < c)) continue;        /* نفضّل السلسلة الكاملة أولًا */
      clash = false; for (j = k; j <= k + len; j++) if (used[j]) clash = true;
      if (clash && tries < 700) continue;                        /* ثم نسمح بالتداخل إن ضاق المحفوظ */
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

  /* ===== المطابقة: كلمات الآية بالترتيب، مع تسامح بسيط مع أخطاء التعرّف ===== */
  function allowed(n) { return n < 8 ? 0 : (n < 16 ? 1 : 2); }   /* تسامح مع خطأ التعرّف في الآيات الطويلة فقط */
  function align(E, S, muq) {
    var n = E.length, p = 0, i = 0, miss = 0, q, ok;
    while (i < S.length && p < n) {
      if (p === 0 && muq) {
        if (M.wsim(E[0], S[i]) >= TOL) { p = 1; i++; continue; }
        ok = true; for (q = 0; q < muq.length; q++) if (!M.nameOk(muq[q], S[i + q])) { ok = false; break; }
        if (ok) { p = 1; i += muq.length; continue; }
        i++; continue;
      }
      if (M.wsim(E[p], S[i]) >= TOL) { p++; i++; continue; }
      /* كلمة بدل كلمة: التالية تطابق ما بعدها */
      if (S[i + 1] !== undefined && p + 1 < n && M.wsim(E[p + 1], S[i + 1]) >= TOL) { miss++; p++; i++; continue; }
      /* كلمة ناقصة: ما نُطق يطابق الكلمة التي بعدها */
      if (p + 1 < n && M.wsim(E[p + 1], S[i]) >= TOL && (S[i + 1] === undefined || p + 2 >= n || M.wsim(E[p + 2], S[i + 1]) >= TOL)) { miss++; p += 2; i++; continue; }
      i++;   /* كلام زائد أو ضجيج */
    }
    return { p: Math.min(p, n), miss: miss };
  }

  /* ===== التعرّف الصوتي (عبر الإنترنت) ===== */
  function toks(s) { var n = M.norm(s); return n ? n.split(" ") : []; }
  function listen(E, muq, onProg, onErr) {
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(), fin = [], itx = [], active = true;
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    try { if ("processLocally" in r) r.processLocally = false; } catch (e) {}
    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], best = [], bs = -1, k, tk, sc;
        for (k = 0; k < res.length; k++) { tk = toks(res[k].transcript); sc = align(E, fin.concat(tk), muq).p; if (sc > bs) { bs = sc; best = tk; } }
        if (res.isFinal) { fin = fin.concat(best); itx = []; } else itx = best;
      }
      onProg(fin.concat(itx));
    };
    r.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "network" || e.error === "language-not-supported") { active = false; onErr(e.error); } };
    r.onend = function () { if (active) setTimeout(function () { if (active) { try { r.start(); } catch (e) {} } }, 200); };
    try { r.start(); } catch (e) { return null; }
    return { stop: function () { active = false; try { r.abort(); } catch (e) {} } };
  }

  /* ===== الصوت: عبارة الطلب (نطق المتصفح) وتلاوة الشيخ محمد أيوب ===== */
  var AU = null;
  function say(t) {
    return new Promise(function (res) {
      var ss = G.speechSynthesis; if (!ss || typeof G.SpeechSynthesisUtterance === "undefined") return res(false);
      var vs = ss.getVoices ? ss.getVoices() : [];
      if (vs.length && !vs.some(function (v) { return /^ar/i.test(v.lang); })) return res(false);   /* لا صوت عربي في الجهاز */
      var u = new G.SpeechSynthesisUtterance(t), d = false, f = function () { if (!d) { d = true; res(true); } };
      u.lang = "ar-SA"; u.rate = .9; u.onend = f; u.onerror = f; setTimeout(f, 6000);
      try { ss.cancel(); ss.speak(u); } catch (e) { f(); }
    });
  }
  function play(k) {
    return new Promise(function (res) {
      var d = false, f = function (v) { if (!d) { d = true; res(v); } };
      AU.onended = function () { f(true); }; AU.onerror = function () { f(false); };
      AU.src = AUDIO + pad3(D.s[k]) + pad3(D.a[k]) + ".mp3";
      var p = AU.play(); if (p && p.catch) p.catch(function () { f(false); });
      setTimeout(function () { f(false); }, 120000);
    });
  }
  function silence() { try { if (AU) { AU.onended = null; AU.onerror = null; AU.pause(); } } catch (e) {} try { G.speechSynthesis && G.speechSynthesis.cancel(); } catch (e) {} }

  /* ===== الجلسة ===== */
  var SID = 0, T = null, CUR = null;
  var dead = function (sid) { return sid !== SID || !T; };

  var CSS = "#t-test .ik-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}" +
    "#t-test .ik-st{font-weight:700;margin:12px 0 4px;min-height:1.8em}" +
    "#t-test .ik-ay{font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:26px;line-height:2.6;text-align:justify;min-height:3em;padding:6px 4px}" +
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
    var R = D && memRange(), seg1 = "", seg2 = "", i, cl = ["آية", "آيتان", "٣ آيات", "٤ آيات", "٥ آيات"];
    for (i = 5; i <= 10; i++) seg1 += '<button data-n="' + i + '" aria-pressed="' + (CFG.n === i) + '">' + AR(i) + "</button>";
    for (i = 1; i <= 5; i++) seg2 += '<button data-c="' + i + '" aria-pressed="' + (CFG.c === i) + '">' + cl[i - 1] + "</button>";
    el.innerHTML = '<div class="card"><h2>اختبار محفوظي</h2>' +
      '<p class="sub">يقول لك الصوت «' + PHRASE + '» ثم تُتلى آية بصوت الشيخ محمد أيوب. ' + gn("أكمل", "أكملي") + ' ما بعدها من حفظك، فإن أصبتَ ظهرت الآية وتابعتَ الآيات التالية، ثم تأتي آية جديدة.</p>' +
      (msg ? '<p class="warn" role="alert">' + esc(msg) + "</p>" : "") +
      (R ? '<p class="sub" style="margin-top:8px">من محفوظك: الصفحات ' + AR(R.a) + " إلى " + AR(R.b) + ".</p>"
         : '<p class="warn">حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي» ليُختار الاختبار من محفوظك.</p>') +
      '<label>عدد الاختبارات</label><div class="seg" id="ikN">' + seg1 + "</div>" +
      '<label>عدد الآيات المطلوب إكمالها في كل اختبار</label><div class="seg" id="ikC">' + seg2 + "</div>" +
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

  function words(P, upto, all, ok) {
    return P.disp.map(function (w) { var on = all || w.b <= upto; return '<span class="ikw' + (on ? " on" : "") + (all && !ok && w.a >= upto ? " x" : "") + '">' + esc(w.raw) + "</span>"; }).join(" ");
  }

  /* فرصة القارئ لإكمال آية: تُرجع true إن أكملها صحيحة */
  function chance(sid, key, label) {
    return new Promise(function (resolve) {
      var P = prep(key), n = P.E.length, allow = allowed(n), start = Date.now(), lim = Math.min(70000, 12000 + 1500 * n),
        lastLen = 0, lastT = Date.now(), done = false, rec = null, iv = null, cur = { p: 0, miss: 0 };
      var box = $("ikAy"); box.className = "ik-ay"; box.innerHTML = words(P, 0, false, true);
      setSt("🎤 " + label);
      function finish(ok) {
        if (done) return; done = true; clearInterval(iv); if (rec) rec.stop(); CUR = null;
        if (!dead(sid)) { box.className = "ik-ay " + (ok ? "ok" : "bad"); box.innerHTML = words(P, cur.p, true, ok); }
        resolve(ok);
      }
      CUR = { finish: finish };
      rec = listen(P.E, P.muq, function (S) {
        if (done) return;
        cur = align(P.E, S, P.muq);
        box.innerHTML = words(P, cur.p, false, true);
        if (S.length !== lastLen) { lastLen = S.length; lastT = Date.now(); }
        if (cur.p >= n) finish(cur.miss <= allow);
      }, function (err) {
        T && (T.fatal = err === "not-allowed" || err === "service-not-allowed" ? "اسمح للموقع باستخدام الميكروفون ثم أعد المحاولة."
          : "تعذّر التعرّف الصوتي. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.");
        finish(false);
      });
      if (!rec) { T && (T.fatal = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome أو Edge أو Safari."); return finish(false); }
      iv = setInterval(function () {
        var el = Date.now() - start; setBar("ikTm", 100 - el / lim * 100);
        if (el > lim || (lastLen > 0 && Date.now() - lastT > 5500)) finish(cur.p >= n && cur.miss <= allow);
      }, 250);
    });
  }

  async function runTest(sid, i) {
    var pr = T.prompts[i], passed = 0, failedAt = -1, d, k, ok;
    $("ikNo").textContent = "الاختبار " + AR(i + 1) + " من " + AR(T.prompts.length);
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i);
    setBar("ikPg", i / T.prompts.length * 100); setBar("ikTm", 0);
    $("ikAy").className = "ik-ay"; $("ikAy").innerHTML = "";
    setSt("🔊 " + PHRASE + "…");
    await say(PHRASE); if (dead(sid)) return;
    setSt("🎧 " + gn("استمع", "استمعي") + " إلى الآية…");
    var heard = await play(pr.k); if (dead(sid)) return;
    if (!heard) {   /* تعذّر الصوت: نعرض نص الآية ليستمر الاختبار */
      setSt("تعذّر تشغيل الصوت، هذه هي الآية:");
      $("ikAy").className = "ik-ay"; $("ikAy").innerHTML = words(prep(keyOf(pr.k)), 0, true, true);
      await wait(4500); if (dead(sid)) return;
    }
    for (d = 1; d <= pr.len; d++) {
      k = pr.k + d;
      ok = await chance(sid, keyOf(k), pr.len > 1 ? gn("أكمل", "أكملي") + " الآية التي بعدها (" + AR(d) + " من " + AR(pr.len) + ")" : gn("أكمل", "أكملي") + " الآية التي بعدها");
      if (dead(sid) || T.fatal) return;
      if (!ok) { failedAt = k; break; }
      passed++; setSt("✓ أحسنت"); await wait(1100); if (dead(sid)) return;
    }
    var pass = passed === pr.len;
    T.res.push({ k: pr.k, len: pr.len, done: passed, ok: pass });
    if (pass) { T.score++; setSt("✓ " + gn("أحسنتَ", "أحسنتِ") + "! " + gn("أتممتَ", "أتممتِ") + " الاختبار"); }
    else {
      setSt("✗ هذه هي الآية الصحيحة، " + gn("استمع", "استمعي") + " إليها");
      await play(failedAt); if (dead(sid)) return;
    }
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i + 1);
    await wait(1500);
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
    try { if (G.speechSynthesis && G.SpeechSynthesisUtterance) G.speechSynthesis.speak(new G.SpeechSynthesisUtterance("")); } catch (e) {}
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
    if (b.dataset.c) { CFG.c = +b.dataset.c; saveCfg(); [].forEach.call($("ikC").children, function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.id === "ikGo" || b.id === "ikAgain") return start();
    if (b.id === "ikBack") return renderSetup();
    if (b.id === "ikSk") { if (CUR) CUR.finish(false); return; }
    if (b.id === "ikQt") { endSession(); return renderSetup(); }
  });

  G.Ikhtibar = {
    open: function () { if (!D) D = buildMap(); if (!T) renderSetup(D ? "" : "تعذّر تحميل بيانات المصحف."); },
    leave: function () { if (T) { endSession(); renderSetup(); } },
    _t: { align: align, prep: prep, pick: pick, buildMap: function () { D = buildMap(); return D; }, memRange: memRange, setText: function (q) { Q = q; }, pageOf: pageOf, keyOf: keyOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
