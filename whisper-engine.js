/* محرك Whisper للتسميع الآلي: يعمل داخل المتصفح (WASM) على كل الأجهزة الحديثة، ولا يُرسل الصوت لأي خادم.
   يُنزَّل النموذج مرة واحدة من الإنترنت ثم يُحفظ في ذاكرة المتصفح، فيعمل بعدها دون اتصال.
   يُحمَّل هذا الملف عند الحاجة فقط من musammi.js، ويوفّر window.MusammiWhisper. */
(function (G) {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";
  var DEF_MODEL = "onnx-community/whisper-base";   /* بديل أسرع وأخف: onnx-community/whisper-tiny */
  var FLAG = "msWhisper";
  var pipe = null, loading = null;
  /* نحفظ ملفات المكتبة (و wasm) صراحةً في مخزن دائم، حتى لو لم يكن عامل الخدمة قد اعترضها وقت التنزيل */
  function persistLibs() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      var urls = performance.getEntriesByType("resource").map(function (e) { return e.name; }).filter(function (u) { return u.indexOf("https://cdn.jsdelivr.net/") === 0; });
      urls.push(LIB);
      caches.open("mext-v1").then(function (c) {
        urls.forEach(function (u) { c.match(u).then(function (m) { if (!m) fetch(u, { mode: "cors" }).then(function (r) { if (r.ok) c.put(u, r); }).catch(function () {}); }); });
      });
    } catch (e) {}
  }

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function model() { return ls("msWModel") || DEF_MODEL; }
  function installed() { return ls(FLAG) === model(); }

  /* تنزيل/تحميل النموذج. onProgress(نسبة مئوية 0..100) */
  function load(onProgress) {
    if (pipe) return Promise.resolve(pipe);
    if (loading) return loading;
    var files = {};
    var cb = function (p) {
      if (!p || !p.file) return;
      if (p.status === "progress" && p.total) files[p.file] = { l: p.loaded || 0, t: p.total };
      else if (p.status === "done" && files[p.file]) files[p.file].l = files[p.file].t;
      var L = 0, T = 0, k; for (k in files) { L += files[k].l; T += files[k].t; }
      if (T && onProgress) onProgress(Math.min(99, Math.round(L / T * 100)));
    };
    loading = import(LIB).then(function (T) {
      if (T.env) { T.env.allowLocalModels = false; }
      return T.pipeline("automatic-speech-recognition", model(), { dtype: "q8", device: "wasm", progress_callback: cb });
    }).then(function (p) { pipe = p; loading = null; ls(FLAG, model()); persistLibs(); if (onProgress) onProgress(100); return p; },
      function (e) { loading = null; throw e; });
    return loading;
  }

  /* ===== التقاط الصوت وتقطيعه عند السكتات ===== */
  function resample(a, from, to) {
    if (from === to) return a;
    var n = Math.round(a.length * to / from), o = new Float32Array(n), r = from / to, i, x, j, f;
    for (i = 0; i < n; i++) { x = i * r; j = Math.floor(x); f = x - j; o[i] = a[j] * (1 - f) + (a[j + 1] === undefined ? a[j] : a[j + 1]) * f; }
    return o;
  }
  function rms(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }

  function capture(onChunk, onFail, stat) {
    var ctx, stream, src, proc, stopped = false, rate = 16000, own = false;
    stat = stat || {};
    var pre = [], buf = [], speaking = false, silence = 0, dur = 0, floor = 0.004;
    function flush() {
      var n = 0, i, a, o, k = 0;
      for (i = 0; i < buf.length; i++) n += buf[i].length;
      a = new Float32Array(n); for (i = 0; i < buf.length; i++) { a.set(buf[i], k); k += buf[i].length; }
      buf = []; speaking = false; silence = 0; dur = 0;
      if (n / rate >= 0.45) { stat.chunks = (stat.chunks || 0) + 1; onChunk(resample(a, rate, 16000)); }
    }
    function frame(d) {
      var lv = rms(d), fd = d.length / rate, thr = Math.max(0.01, floor * 2.5);
      if (lv > (stat.level || 0)) stat.level = lv;
      if (!speaking) {
        floor = floor * 0.96 + lv * 0.04;
        pre.push(d); if (pre.length > 4) pre.shift();
        if (lv > thr) { speaking = true; buf = pre.slice(); dur = buf.length * fd; silence = 0; pre = []; }
        return;
      }
      buf.push(d); dur += fd;
      if (lv > thr) silence = 0; else silence += fd;
      if ((silence >= 0.5 && dur >= 0.6) || dur >= 6.5) flush();
    }
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (s) {
      if (stopped) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      var AC = G.AudioContext || G.webkitAudioContext;
      /* نستخدم سياق الصوت الذي فُتح عند لمسة المستخدم (ضروري في iPhone وإلا يبقى «معلّقًا» ولا يصل صوت) */
      ctx = (G.MusammiAC && G.MusammiAC()) || (own = true, new AC()); rate = ctx.sampleRate;
      if (ctx.state === "suspended") ctx.resume();
      stat.state = ctx.state;
      src = ctx.createMediaStreamSource(s);
      proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = function (e) { if (!stopped) frame(new Float32Array(e.inputBuffer.getChannelData(0))); };
      src.connect(proc); proc.connect(ctx.destination);
    }, function () { onFail("not-allowed"); });
    return { stop: function () {
      stopped = true; try { if (speaking) flush(); } catch (e) {}
      try { proc && proc.disconnect(); src && src.disconnect(); } catch (e) {}
      try { stream && stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (own && ctx) ctx.close(); } catch (e) {}
    } };
  }

  /* ===== واجهة المحرك التي يتوقعها musammi.js ===== */
  var HALLU = /(اشترك|اشتركوا|ترجمة|نانسي|شكرا لمشاهدتكم|شكرا على المشاهدة|subscribe)/i;
  function engine() {
    var cap = null, queue = [], busy = false, cbText = null, active = false, stat = { chunks: 0, level: 0 };
    function pump() {
      if (busy || !queue.length || !pipe || !active) return;
      busy = true;
      var a = queue.shift();
      pipe(a, { language: "arabic", task: "transcribe" }).then(function (o) {
        busy = false;
        var t = o && (Array.isArray(o) ? o[0] && o[0].text : o.text);
        t = String(t || "").trim();
        if (eng.onInfo) eng.onInfo("text", t || "(لا شيء)");
        if (active && t && !HALLU.test(t)) cbText(t, true);
        pump();
      }, function (e) { busy = false; if (eng.onInfo) eng.onInfo("error", String((e && e.message) || e).slice(0, 120)); pump(); });
    }
    var eng = {
      name: "whisper", stat: stat, onInfo: null,
      ready: function (done, progress) {
        load(progress).then(function () { done(true); }, function (e) {
          var d = " [" + String((e && e.message) || e).slice(0, 90) + "]";
          done(false, (navigator.onLine ? "تعذّر تحميل محرك Whisper. أعد المحاولة بعد قليل." : "محرك Whisper غير محفوظ بالكامل لهذا المتصفح. اتصل بالإنترنت وأعد تنزيله من الإعدادات، ثم اضغط «فحص جاهزية العمل دون إنترنت».") + d);
        });
      },
      start: function (cb, onEnd) {
        cbText = cb; active = true; queue = [];
        cap = capture(function (a) { queue.push(a); if (queue.length > 3) queue.shift(); pump(); }, function (why) { active = false; onEnd(why); }, stat);
      },
      stop: function () { active = false; queue = []; if (cap) cap.stop(); cap = null; }
    };
    return eng;
  }

  /* اختبار شامل: يسجّل بضع ثوانٍ ويُرجع حالة الصوت والمستوى والنص الذي فهمه المحرك أو الخطأ */
  function test(sec, done) {
    var r = { level: 0, state: "", secs: sec, text: "", ms: 0, err: "" }, frames = [], stream, ctx, src, proc, own = false, rate = 16000;
    var fin = function () {
      try { proc && proc.disconnect(); src && src.disconnect(); stream && stream.getTracks().forEach(function (t) { t.stop(); }); if (own && ctx) ctx.close(); } catch (e) {}
      var n = 0, i, k = 0, a; for (i = 0; i < frames.length; i++) n += frames[i].length;
      a = new Float32Array(n); for (i = 0; i < frames.length; i++) { a.set(frames[i], k); k += frames[i].length; }
      if (r.level < 0.003) { r.err = "الميكروفون لا يلتقط صوتًا (المستوى شبه صفر)"; return done(r); }
      var t0 = Date.now();
      load().then(function (p) { return p(resample(a, rate, 16000), { language: "arabic", task: "transcribe" }); }).then(function (o) {
        r.ms = Date.now() - t0; r.text = String((o && (Array.isArray(o) ? o[0] && o[0].text : o.text)) || "").trim(); done(r);
      }, function (e) { r.err = "فشل التحليل: " + String((e && e.message) || e).slice(0, 120); done(r); });
    };
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (s) {
      stream = s; var AC = G.AudioContext || G.webkitAudioContext;
      ctx = (G.MusammiAC && G.MusammiAC()) || (own = true, new AC()); rate = ctx.sampleRate; if (ctx.state === "suspended") ctx.resume(); r.state = ctx.state;
      src = ctx.createMediaStreamSource(s); proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = function (e) { var d = new Float32Array(e.inputBuffer.getChannelData(0)); frames.push(d); var l = rms(d); if (l > r.level) r.level = l; };
      src.connect(proc); proc.connect(ctx.destination);
      setTimeout(fin, sec * 1000);
    }, function () { r.err = "تعذّر الوصول إلى الميكروفون (الإذن مرفوض)"; done(r); });
  }

  /* فحص ما حُفظ للعمل دون إنترنت */
  function check() {
    var r = { sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), lib: false, libs: 0, model: 0, flag: installed() };
    return caches.match(LIB).then(function (m) { r.lib = !!m; return caches.has("mext-v1"); })
      .then(function (h) { return h ? caches.open("mext-v1").then(function (c) { return c.keys(); }).then(function (k) { r.libs = k.length; }) : 0; })
      .then(function () { return caches.keys(); })
      .then(function (ks) { var k = ks.filter(function (x) { return /transformers/i.test(x); })[0]; return k ? caches.open(k).then(function (c) { return c.keys(); }).then(function (a) { r.model = a.length; }) : 0; })
      .then(function () { return r; }, function () { return r; });
  }

  G.MusammiWhisper = { test: test, check: check, engine: engine, load: load, installed: installed, model: model };
})(typeof window !== "undefined" ? window : globalThis);
