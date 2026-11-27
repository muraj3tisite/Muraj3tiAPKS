/* اختبار المحفوظ.
   يقول صوتٌ «أكمل من قوله تعالى»، ثم تُتلى آية بصوت الشيخ محمد صديق المنشاوي (مرتّل)، ثم تبدأ فرصة القارئ ليكمل ما بعدها.
   الآية المطلوبة تظهر كلمةً كلمة بحركة المسمّع الآلي نفسها كلما نطقها القارئ صحيحة، والخطأ يُكشف بالأحمر مع صافرة قصيرة.
   المطابقة صارمة بالأسلوب نفسه الذي يعتمده المسمّع الآلي (كلمة بكلمة وبالترتيب، ولا يُقبل حذف ولا تبديل).
   الآيات تُختار عشوائيًا من الصفحات التي حدّدها المستخدم أنها محفوظة (S.a إلى S.b).
   عبارة «أكمل من قوله تعالى»: إن وُجد الملف audio/akmil.mp3 (تسجيل بصوت حقيقي) يُشغَّل هو، وإلا يُستعمل أفضل صوت عربي في الجهاز.
   يحتاج الإنترنت: الصوت من everyayah.com والتعرّف الصوتي من المتصفح. */
(function (G) {
  "use strict";
  var M = G.Musammi;
  if (!M) return;
  var $ = function (i) { return document.getElementById(i); };
  var AUDIO = "https://everyayah.com/data/Minshawy_Murattal_128kbps/";   /* ملفات SSSAAA.mp3 — المنشاوي مرتّل */
  var PHRASE = "أكمل من قوله تعالى";
  var PHRASE_V = "أَكْمِلْ مِنْ قَوْلِهِ تَعَالَى";                     /* مشكولة ليُحسن الجهاز نطقها */
  var PHRASE_FILE = "audio/akmil.mp3";
  var TOL = .75, STOL = .5;

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

  /* ===== المطابقة الصارمة: الأسلوب نفسه الذي يعتمده المسمّع الآلي، لكن الموضع معلوم (أول الآية) =====
     كل كلمة متوقعة لا بد أن تُنطق بالترتيب. التعرّف قد يشوّه نطقها (يُقبل بتسامح ضيق إن تلتها الكلمة الصحيحة)،
     وقد يدمج كلمتين أو يفصلهما (يُقبل)، أما الحذف والتبديل فيُحسبان خطأً.
     الخطأ لا يُحكم به إلا بعد ثبوته (ثلاث كلمات أو سكوت أو تحديثين متتاليين) حتى لا يظلم القارئ تعثّرُ التعرّف. */
  function sk(w) { return String(w || "").replace(/^ال(?=..)/, "").replace(/ا/g, ""); }
  function track(E, muq) {
    var W = E.map(function (t, i) { return i === 0 && muq ? { t: t, names: muq } : { t: t }; }), n = W.length;
    var tr = { pos: 0, j: 0, miss: 0, errs: [], fail: false, started: false, erred: false, sus: "", allow: 0 };
    function wm(a, b) { return !!a && !!b && M.wsim(a, b) >= TOL; }
    function soft(a, b) { return !!a && !!b && sk(a).length >= 3 && M.wsim(a, b) >= STOL; }
    /* هل تُطابق الكلمة المتوقعة في الموضع p الكلمات المنطوقة من T[j]؟ */
    function at(p, T, j) {
      var w = W[p]; if (!w || j >= T.length) return null;
      if (w.names) {
        if (wm(w.t, T[j])) return { tok: 1, adv: 1 };
        var nn = w.names.length; if (T.length - j < nn) return null;
        for (var i = 0; i < nn; i++) if (!M.nameOk(w.names[i], T[j + i])) return null;
        return { tok: nn, adv: 1 };
      }
      if (wm(w.t, T[j])) return { tok: 1, adv: 1 };
      if (T[j + 1]) { var c = T[j] + T[j + 1]; if (c.length >= 6 && M.wsim(w.t, c) >= .85) return { tok: 2, adv: 1 }; }
      var nx = W[p + 1];
      if (nx && !nx.names && (w.t + nx.t).length >= 8 && M.wsim(w.t + nx.t, T[j]) >= .88) return { tok: 1, adv: 2 };
      return null;
    }
    function seq(p, T, s, lim) {
      var m = 0, j = s, q = p, r;
      while (q < n && j < T.length && m < lim && (r = at(q, T, j))) { j += r.tok; q += r.adv; m++; }
      return m;
    }
    /* بعد خطأ: إن نطق القارئ كلمة صحيحة من الكلمات التالية (حتى ٦) وتلتها الصحيحة، فما بينهما حُذف أو أُخطئ فيه */
    function resync(T, j, final) {
      for (var k = 1; k <= 6; k++) {
        var p = tr.pos + k, x = W[p]; if (!x) break;
        if (x.names || sk(x.t).length < 3) continue;
        var r = at(p, T, j); if (!r) continue;
        if (T[j + r.tok] !== undefined) { if (p + r.adv < n && !at(p + r.adv, T, j + r.tok)) continue; }
        else if (!final || sk(x.t).length < 4) continue;
        return { p: p, r: r };
      }
      return null;
    }
    /* أيّ بدائل التعرّف أوفق لموضع القارئ (تقلّل الأخطاء الكاذبة) */
    tr.score = function (T, finLen) { return seq(tr.pos, T, Math.min(tr.j, finLen), 99); };
    tr.step = function (T, fc, finLen, final, quiet) {
      if (tr.fail || tr.pos >= n) return;
      if (tr.j > T.length) tr.j = T.length;
      var guard = 400, avail, stable, r, r2, rs, w, key, q, pre;
      while (guard-- > 0 && tr.pos < n && !tr.fail) {
        avail = T.length - tr.j; stable = final ? avail : avail - 1;   /* آخر كلمة في النتيجة المؤقتة قد تتغيّر */
        if (stable <= 0) break;
        w = W[tr.pos];
        r = at(tr.pos, T, tr.j);
        if (r) { tr.pos += r.adv; tr.j += r.tok; tr.started = true; tr.erred = false; continue; }
        /* الحروف المقطّعة: إن نُطق بعضها فقط وما نُطق صحيح فننتظر الباقي */
        if (w.names && avail < w.names.length) {
          pre = true; for (q = 0; q < avail; q++) if (!M.nameOk(w.names[q], T[tr.j + q])) { pre = false; break; }
          if (pre) break;
        }
        /* تكرار الكلمة السابقة (تردّد) لا يُعدّ خطأً */
        if (tr.pos > 0 && wm(W[tr.pos - 1].t, T[tr.j])) { tr.j++; continue; }
        /* ضجيج قبل بدء القراءة */
        if (!tr.started && tr.pos === 0 && at(0, T, tr.j + 1)) { tr.j++; continue; }
        /* تساهل: كلمة يشوّهها التعرّف وتليها الكلمة التالية الصحيحة */
        if (!w.names && soft(w.t, T[tr.j])) {
          if (T[tr.j + 1] === undefined && !final) break;
          r2 = at(tr.pos + 1, T, tr.j + 1);
          if (r2) { tr.pos++; tr.j++; tr.started = true; tr.erred = false; continue; }
        }
        if (!tr.started && avail < 3) break;           /* لم يبدأ بعد: لا نحكم على كلمة أو كلمتين (قد تكون ضجيجًا) */
        if (!final && avail < 3) break;
        if (quiet && avail < 2) break;
        if ((tr.j < finLen ? (fc[tr.j] || 1) : 1) < .5) { tr.j++; continue; }   /* كلام غير مؤكَّد: نتجاوزه بصمت */
        if (!final) { key = tr.pos + "|" + T[tr.j]; if (tr.sus !== key) { tr.sus = key; break; } }
        rs = resync(T, tr.j, final);
        if (rs) {
          tr.errs.push([tr.pos, rs.p]); tr.miss += rs.p - tr.pos;
          tr.pos = rs.p + rs.r.adv; tr.j += rs.r.tok; tr.started = true; tr.erred = false;
          if (tr.miss > tr.allow) tr.fail = true;
          continue;
        }
        if (!tr.erred) { tr.erred = true; tr.errs.push([tr.pos, tr.pos + 1]); tr.miss++; if (tr.miss > tr.allow) tr.fail = true; }
        tr.j++;
      }
    };
    return tr;
  }
  /* واجهة قديمة للاختبارات الآلية: تُرجع {p: كلمات صحيحة، miss: الأخطاء} */
  function align(E, S, muq) {
    var tr = track(E, muq); tr.allow = 1e9; tr.step(S, [], S.length, true, false);
    return { p: Math.min(tr.pos, E.length), miss: tr.miss };
  }

  /* ===== التعرّف الصوتي (عبر الإنترنت) ===== */
  function toks(s) { var n = M.norm(s); return n ? n.split(" ") : []; }
  function listen(TR, onUpd, onErr) {
    var SR = G.SpeechRecognition || G.webkitSpeechRecognition; if (!SR) return null;
    var r = new SR(), fin = [], fc = [], itx = [], active = true, tm = null;
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    try { if ("processLocally" in r) r.processLocally = false; } catch (e) {}
    function run(final, quiet) { if (!active) return; TR.step(fin.concat(itx), fc, fin.length, final, quiet); onUpd(fin.length + itx.length); }
    r.onresult = function (e) {
      var isFin = false;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], b = null, bs = -1, k, tk, s;
        for (k = 0; k < res.length; k++) {
          tk = toks(res[k].transcript); s = TR.score(fin.concat(tk), fin.length);
          if (s > bs) { bs = s; b = { tk: tk, c: res[k].confidence }; }
        }
        if (!b) continue;
        if (res.isFinal) { var c = b.c > 0 ? b.c : 1; b.tk.forEach(function () { fc.push(c); }); fin = fin.concat(b.tk); itx = []; isFin = true; }
        else { itx = b.tk; isFin = false; }
      }
      run(isFin, false);
      clearTimeout(tm); tm = setTimeout(function () { run(true, true); }, 1000);
    };
    r.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "network" || e.error === "language-not-supported") { active = false; onErr(e.error); } };
    r.onend = function () {
      if (!active) return;
      if (itx.length) { itx = []; if (TR.j > fin.length) TR.j = fin.length; }
      setTimeout(function () { if (active) { try { r.start(); } catch (e) {} } }, 200);
    };
    try { r.start(); } catch (e) { return null; }
    return { stop: function () { active = false; clearTimeout(tm); try { r.abort(); } catch (e) {} } };
  }

  /* ===== الصوت: عبارة الطلب، وتلاوة الشيخ المنشاوي ===== */
  var AU = null, PL = null;
  function playUrl(u) {
    return new Promise(function (res) {
      var d = false, f = function (v) { if (!d) { d = true; if (PL === ctl) PL = null; res(v); } }, ctl = { f: f };
      PL = ctl;
      AU.onended = function () { f(true); }; AU.onerror = function () { f(false); };
      AU.src = u;
      var p = AU.play(); if (p && p.catch) p.catch(function () { f(false); });
      setTimeout(function () { f(false); }, 120000);
    });
  }
  /* تلاوة الآية: إن تعذّر التحميل نعيد المحاولة مرة واحدة */
  function play(k, sid) {
    var u = AUDIO + pad3(D.s[k]) + pad3(D.a[k]) + ".mp3";
    return playUrl(u).then(function (ok) { return ok || dead(sid) ? ok : playUrl(u); });
  }

  /* عبارة «أكمل من قوله تعالى»: التسجيل الحقيقي (audio/akmil.mp3) أولًا، وإلا نطق الجهاز بأفضل صوت عربي رجالي */
  var PU = null, PUtried = false;
  function loadPhrase() {
    if (PUtried) return Promise.resolve(PU);
    PUtried = true;
    return fetch(PHRASE_FILE).then(function (r) {
      if (!r.ok || /text\/html/i.test(r.headers.get("content-type") || "")) throw 0;
      return r.blob();
    }).then(function (b) { PU = URL.createObjectURL(b); return PU; }).catch(function () { return null; });
  }
  var VOICE = null;
  function pickVoice() {
    var ss = G.speechSynthesis; if (!ss || !ss.getVoices) return null;
    var vs = ss.getVoices().filter(function (v) { return /^ar/i.test(v.lang); }); if (!vs.length) return null;
    var best = null, bs = -99;
    vs.forEach(function (v) {
      var s = 0, nm = v.name || "";
      if (/naayf|hamed|majed|maged|shakir|tarik|fahd|omar|ahmed|male/i.test(nm) && !/female/i.test(nm)) s += 3;
      if (/zariyah|salma|laila|hoda|fatima|amira|noura|reem|female/i.test(nm)) s -= 3;
      if (/natural|neural|online|enhanced|premium/i.test(nm)) s += 2;
      if (/google/i.test(nm)) s += 1;
      if (/ar-SA/i.test(v.lang)) s += 1;
      if (s > bs) { bs = s; best = v; }
    });
    return best;
  }
  try { if (G.speechSynthesis && G.speechSynthesis.addEventListener) G.speechSynthesis.addEventListener("voiceschanged", function () { VOICE = pickVoice(); }); } catch (e) {}
  function tts() {
    return new Promise(function (res) {
      var ss = G.speechSynthesis; if (!ss || typeof G.SpeechSynthesisUtterance === "undefined") return res(false);
      if (!VOICE) VOICE = pickVoice();
      if (!VOICE) return res(false);                       /* لا صوت عربي في الجهاز */
      var u = new G.SpeechSynthesisUtterance(PHRASE_V), d = false, f = function () { if (!d) { d = true; res(true); } };
      u.voice = VOICE; u.lang = VOICE.lang || "ar-SA"; u.rate = .78; u.pitch = .78; u.volume = 1; u.onend = f; u.onerror = f; setTimeout(f, 7000);
      try { ss.cancel(); ss.speak(u); } catch (e) { f(); }
    });
  }
  async function sayPhrase(sid) {
    var u = await loadPhrase(); if (dead(sid)) return;
    if (u && await playUrl(u)) return;
    if (dead(sid)) return;
    await tts();
  }
  function silence() {
    try { if (PL) { var p = PL; PL = null; p.f(false); } } catch (e) {}
    try { if (AU) { AU.onended = null; AU.onerror = null; AU.pause(); } } catch (e) {}
    try { G.speechSynthesis && G.speechSynthesis.cancel(); } catch (e) {}
  }
  /* صافرة قصيرة عند الخطأ (كالمسمّع الآلي) + اهتزاز الروبوت */
  function beep() {
    var r = $("ikRb"); if (r) { r.classList.remove("rb-err"); void r.offsetWidth; r.classList.add("rb-err"); }
    var a = G.MusammiAC && G.MusammiAC(); if (!a) return;
    try {
      var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(140, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .34);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .36);
    } catch (e) {}
  }

  /* ===== الجلسة ===== */
  var SID = 0, T = null, CUR = null;
  var dead = function (sid) { return sid !== SID || !T; };

  var CSS = [
    "#t-test .ik-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}",
    "#t-test .ik-hd{display:flex;align-items:center;gap:12px;margin:12px 0 10px}",
    "#t-test .ik-rb{flex:none;border-radius:26px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.25))}",
    "#t-test .ik-hd[data-mode=listen] .ik-rb{animation:ikRing 1.3s ease-out infinite}",
    "#t-test .ik-hd[data-mode=listen] .rb-ant{fill:#ef4444;animation-duration:.55s}",
    "#t-test .ik-st{flex:1;min-width:0;font-weight:700;margin:0;min-height:1.8em;line-height:1.8}",
    "#t-test .ik-eq{display:none;flex:none;gap:3px;align-items:flex-end;height:24px}",
    "#t-test .ik-hd[data-mode=say] .ik-eq,#t-test .ik-hd[data-mode=play] .ik-eq{display:flex}",
    "#t-test .ik-eq i{width:4px;height:100%;border-radius:3px;background:var(--acc);transform-origin:bottom;animation:ikEq .9s ease-in-out infinite}",
    "#t-test .ik-eq i:nth-child(2){animation-delay:.15s}#t-test .ik-eq i:nth-child(3){animation-delay:.3s}#t-test .ik-eq i:nth-child(4){animation-delay:.45s}#t-test .ik-eq i:nth-child(5){animation-delay:.6s}",
    "#t-test .ik-stage{display:flex;align-items:center;min-height:7.5em;padding:12px 10px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(180deg,var(--card),var(--acc2));transition:box-shadow .45s,border-color .45s}",
    "#t-test .ik-stage.ok{border-color:var(--ok);box-shadow:0 0 0 3px rgba(34,160,90,.18),0 8px 26px rgba(34,160,90,.22)}",
    "#t-test .ik-stage.bad{border-color:#d93025;box-shadow:0 0 0 3px rgba(217,48,37,.15)}",
    "#t-test .ik-ay{width:100%;font-family:'Amiri Quran','Amiri','Noto Naskh Arabic',serif;font-size:clamp(23px,6vw,30px);line-height:2.5;text-align:center}",
    /* الكلمات مخفية حتى تُنطق، ثم تظهر بالحركة نفسها التي في المسمّع الآلي */
    "#t-test .ikw{position:relative;display:inline-block;margin:0 3px;padding:0 4px;border-radius:.3em;opacity:0;transition:color .5s}",
    "#t-test .ikw.on{opacity:1;animation:ikIn .6s cubic-bezier(.22,1.25,.36,1) both}",
    "#t-test .ikw.cur::after{content:'';position:absolute;inset:-2px;border-radius:.3em;pointer-events:none;animation:ikCur 1.1s ease-out forwards}",
    "#t-test .ik-stage.ok .ikw.on{color:var(--ok)}",
    "#t-test .ikw.x{color:#d93025!important;background:rgba(217,48,37,.16);box-shadow:0 0 0 1.5px rgba(217,48,37,.6)}",
    "#t-test .ikw.m{color:#c2410c;border-bottom:2px dashed rgba(217,48,37,.5);border-radius:0}",
    "@keyframes ikIn{0%{opacity:0;transform:translateY(7px) scale(.82);filter:blur(3px)}55%{opacity:1;filter:blur(0) drop-shadow(0 0 7px rgba(212,160,23,.75))}100%{opacity:1;transform:none;filter:none}}",
    "@keyframes ikCur{0%{background:rgba(212,160,23,.55);box-shadow:0 0 0 2px rgba(212,160,23,1)}100%{background:rgba(212,160,23,0);box-shadow:0 0 0 2px rgba(212,160,23,0)}}",
    "@keyframes ikEq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}",
    "@keyframes ikRing{0%{box-shadow:0 0 0 0 rgba(217,48,37,.5)}100%{box-shadow:0 0 0 16px rgba(217,48,37,0)}}",
    "@media(prefers-reduced-motion:reduce){#t-test .ikw.on,#t-test .ikw.cur::after,#t-test .ik-eq i,#t-test .ik-hd[data-mode=listen] .ik-rb{animation:none}}",
    "#t-test .ik-tm{margin-top:10px;height:8px}",
    "#t-test .ik-row{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}",
    "#t-test .ik-row:last-child{border-bottom:0}",
    "#t-test .ik-no{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;background:var(--ok)}",
    "#t-test .ik-row.bad .ik-no{background:#d93025}",
    "#t-test .ik-big{font-size:44px;font-weight:800;text-align:center;line-height:1.3;margin:6px 0}"
  ].join("");
  function css() {
    if (G.MRobot && G.MRobot.css) G.MRobot.css();
    if ($("ikCss")) return; var s = document.createElement("style"); s.id = "ikCss"; s.textContent = CSS; document.head.appendChild(s);
  }

  var root = function () { return $("t-test"); };
  function setSt(mode, t) {
    var e = $("ikSt"); if (e) e.textContent = t || "";
    var h = $("ikHd"); if (h) h.setAttribute("data-mode", mode || "");
  }
  function setBar(id, pct) { var e = $(id); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + "%"; }
  function live(on) { var r = $("ikRb"); if (r) r.classList.toggle("rb-live", !!on); }

  /* ===== عرض الآية كلمةً كلمة ===== */
  var ELS = [];
  function flash(e, c) { e.classList.remove(c); void e.offsetWidth; e.classList.add(c); }
  function clearStage() { var b = $("ikAy"), s = $("ikStage"); ELS = []; if (b) b.innerHTML = ""; if (s) s.className = "ik-stage"; }
  function mount(P) {
    var b = $("ikAy"), s = $("ikStage"); if (!b) return;
    if (s) s.className = "ik-stage";
    b.innerHTML = P.disp.map(function (w, i) { return '<span class="ikw" data-i="' + i + '">' + esc(w.raw) + "</span>"; }).join(" ");
    ELS = [].slice.call(b.children);
  }
  function mapE(P, a, b) { var out = []; P.disp.forEach(function (w, i) { if (w.a < b && w.b > a) out.push(i); }); return out; }
  /* تُظهَر الكلمات المنطوقة صحيحًا (حتى upto) مرةً واحدة فقط، فلا تُعاد حركتها، وتُكشف الأخطاء بالأحمر */
  function paint(P, upto, errs) {
    var last = -1;
    P.disp.forEach(function (w, i) { var e = ELS[i]; if (e && w.b <= upto && !e.classList.contains("on")) { e.classList.add("on"); last = i; } });
    (errs || []).forEach(function (r) { mapE(P, r[0], r[1]).forEach(function (i) { var e = ELS[i]; if (e) e.classList.add("on", "x"); }); });
    if (last >= 0) flash(ELS[last], "cur");
  }
  function showAll(P) { P.disp.forEach(function (w, i) { var e = ELS[i]; if (e) { e.style.animationDelay = i * 40 + "ms"; e.classList.add("on"); } }); }
  /* النهاية: النجاح يكشف الآية كلها بموجة خضراء، والفشل يكشف الباقي بإطار الخطأ */
  function reveal(P, TR, ok) {
    var s = $("ikStage"); if (s) s.className = "ik-stage " + (ok ? "ok" : "bad");
    var bad = {}; TR.errs.forEach(function (r) { mapE(P, r[0], r[1]).forEach(function (i) { bad[i] = 1; }); });
    P.disp.forEach(function (w, i) {
      var e = ELS[i]; if (!e) return;
      if (bad[i]) { e.classList.add("on", "x"); return; }
      if (!e.classList.contains("on")) { e.style.animationDelay = i * (ok ? 35 : 20) + "ms"; e.classList.add("on"); if (!ok) e.classList.add("m"); }
    });
  }

  function renderSetup(msg) {
    css(); var el = root(); if (!el) return;
    var R = D && memRange(), seg1 = "", seg2 = "", i, cl = ["آية", "آيتان", "٣ آيات", "٤ آيات", "٥ آيات"];
    for (i = 5; i <= 10; i++) seg1 += '<button data-n="' + i + '" aria-pressed="' + (CFG.n === i) + '">' + AR(i) + "</button>";
    for (i = 1; i <= 5; i++) seg2 += '<button data-c="' + i + '" aria-pressed="' + (CFG.c === i) + '">' + cl[i - 1] + "</button>";
    el.innerHTML = '<div class="card"><h2>اختبار محفوظي</h2>' +
      '<p class="sub">يقول لك الصوت «' + PHRASE + '» ثم تُتلى آية بصوت الشيخ محمد صديق المنشاوي. ' + gn("أكمل", "أكملي") + ' ما بعدها من حفظك: تظهر كلماتها كلمةً كلمة كلما نطقتَها صحيحة، والخطأ يُكشف بالأحمر. فإن أصبتَ تابعتَ الآيات التالية، ثم تأتي آية جديدة.</p>' +
      (msg ? '<p class="warn" role="alert">' + esc(msg) + "</p>" : "") +
      (R ? '<p class="sub" style="margin-top:8px">من محفوظك: الصفحات ' + AR(R.a) + " إلى " + AR(R.b) + ".</p>"
         : '<p class="warn">حدّد حفظك أولًا من «اليوم ← تعديل موضع حفظي» ليُختار الاختبار من محفوظك.</p>') +
      '<label>عدد الاختبارات</label><div class="seg" id="ikN">' + seg1 + "</div>" +
      '<label>عدد الآيات المطلوب إكمالها في كل اختبار</label><div class="seg" id="ikC">' + seg2 + "</div>" +
      '<div class="row"><button class="p" id="ikGo"' + (R ? "" : " disabled") + ">ابدأ الاختبار</button></div>" +
      '<p class="sub" style="margin-top:10px">يحتاج اتصالًا بالإنترنت وإذن الميكروفون. اقرأ بوضوح وبترتيب الكلمات، فالمطابقة دقيقة.</p></div>';
  }

  function renderRun() {
    css();
    var rb = ""; try { rb = G.MRobot ? G.MRobot.svg(G.MRobot.who().g, 56, "") : ""; } catch (e) {}
    root().innerHTML = '<div class="card"><div class="ik-top"><b id="ikNo"></b><span class="sub" id="ikSc"></span></div>' +
      '<div class="bar"><i id="ikPg" style="width:0"></i></div>' +
      '<div class="ik-hd" id="ikHd" data-mode=""><div class="ik-rb" id="ikRb">' + rb + '</div><p class="ik-st" id="ikSt" role="status" aria-live="polite"></p>' +
      '<div class="ik-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>' +
      '<div class="ik-stage" id="ikStage"><div class="ik-ay" id="ikAy" dir="rtl"></div></div>' +
      '<div class="bar ik-tm"><i id="ikTm" style="width:0"></i></div>' +
      '<div class="row"><button id="ikSk">لا أعرف</button><button id="ikQt">إنهاء الاختبار</button></div></div>';
  }

  /* فرصة القارئ لإكمال آية: تُرجع true إن أكملها صحيحة */
  function chance(sid, key, label) {
    return new Promise(function (resolve) {
      var P = prep(key), n = P.E.length, TR = track(P.E, P.muq), start = Date.now(), lim = Math.min(90000, 15000 + 1800 * n),
        lastLen = 0, lastT = Date.now(), done = false, frozen = false, rec = null, iv = null, ft = null, shown = 0;
      TR.allow = Math.floor(n / 45);          /* الآيات القصيرة والمتوسطة: لا خطأ مسموح. الطويلة جدًّا فيها هامش لأخطاء التعرّف */
      mount(P); setSt("listen", "🎤 " + label); live(true);
      function finish(ok) {
        if (done) return; done = true; clearInterval(iv); clearTimeout(ft); if (rec) rec.stop(); CUR = null; live(false);
        if (!dead(sid)) reveal(P, TR, ok);
        resolve(ok);
      }
      CUR = { finish: finish };
      rec = listen(TR, function (len) {
        if (done || frozen) return;
        if (len !== lastLen) { lastLen = len; lastT = Date.now(); }
        paint(P, TR.pos, TR.errs);
        if (TR.errs.length > shown) { shown = TR.errs.length; beep(); }
        if (TR.fail) { frozen = true; ft = setTimeout(function () { finish(false); }, 1300); return; }   /* نمهل لحظة ليرى القارئ الكلمة الخطأ */
        if (TR.pos >= n) finish(true);
      }, function (err) {
        T && (T.fatal = err === "not-allowed" || err === "service-not-allowed" ? "اسمح للموقع باستخدام الميكروفون ثم أعد المحاولة."
          : "تعذّر التعرّف الصوتي. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.");
        finish(false);
      });
      if (!rec) { T && (T.fatal = "هذا المتصفح لا يدعم التعرّف الصوتي. استخدم Chrome أو Edge أو Safari."); return finish(false); }
      iv = setInterval(function () {
        var el = Date.now() - start; setBar("ikTm", 100 - el / lim * 100);
        if (frozen) return;
        if (el > lim || (lastLen > 0 && Date.now() - lastT > 6000)) finish(TR.pos >= n && !TR.fail);
      }, 250);
    });
  }

  async function runTest(sid, i) {
    var pr = T.prompts[i], passed = 0, failedAt = -1, d, k, ok;
    $("ikNo").textContent = "الاختبار " + AR(i + 1) + " من " + AR(T.prompts.length);
    $("ikSc").textContent = "الصحيح: " + AR(T.score) + " من " + AR(i);
    setBar("ikPg", i / T.prompts.length * 100); setBar("ikTm", 0);
    clearStage();
    setSt("say", "🔊 " + PHRASE + "…");
    await sayPhrase(sid); if (dead(sid)) return;
    await wait(250); if (dead(sid)) return;
    setSt("play", "🎧 " + gn("استمع", "استمعي") + " إلى الآية…");
    var heard = await play(pr.k, sid); if (dead(sid)) return;
    if (!heard) {   /* تعذّر الصوت: نعرض نص الآية ليستمر الاختبار */
      setSt("", "تعذّر تشغيل الصوت، هذه هي الآية:");
      var P0 = prep(keyOf(pr.k)); mount(P0); showAll(P0);
      await wait(4500); if (dead(sid)) return;
    }
    await wait(400); if (dead(sid)) return;   /* ينطفئ صدى التلاوة قبل أن يبدأ الميكروفون */
    for (d = 1; d <= pr.len; d++) {
      k = pr.k + d;
      ok = await chance(sid, keyOf(k), pr.len > 1 ? gn("أكمل", "أكملي") + " الآية التي بعدها (" + AR(d) + " من " + AR(pr.len) + ")" : gn("أكمل", "أكملي") + " الآية التي بعدها");
      if (dead(sid) || T.fatal) return;
      if (!ok) { failedAt = k; break; }
      passed++; setSt("ok", "✓ أحسنت"); await wait(1300); if (dead(sid)) return;
    }
    var pass = passed === pr.len;
    T.res.push({ k: pr.k, len: pr.len, done: passed, ok: pass });
    if (pass) { T.score++; setSt("ok", "✓ " + gn("أحسنتَ", "أحسنتِ") + "! " + gn("أتممتَ", "أتممتِ") + " الاختبار"); }
    else {
      setSt("play", "✗ هذه هي الآية الصحيحة، " + gn("استمع", "استمعي") + " إليها");
      await wait(900); if (dead(sid)) return;
      await play(failedAt, sid); if (dead(sid)) return;
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
    try { G.MusammiAC && G.MusammiAC(); } catch (e) {}   /* تهيئة صوت الصافرة داخل النقرة */
    loadPhrase();                                        /* تحميل التسجيل الحقيقي مسبقًا إن وُجد */
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
    _t: { align: align, track: track, prep: prep, pick: pick, buildMap: function () { D = buildMap(); return D; }, memRange: memRange, setText: function (q) { Q = q; }, pageOf: pageOf, keyOf: keyOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
