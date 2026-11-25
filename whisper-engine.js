/* محرك Whisper للتسميع الآلي: يعمل داخل المتصفح (WASM) على كل الأجهزة الحديثة، ولا يُرسل الصوت لأي خادم.
   يُنزَّل النموذج مرة واحدة من الإنترنت ثم يُحفظ في ذاكرة المتصفح، فيعمل بعدها دون اتصال.
   يُحمَّل هذا الملف عند الحاجة فقط من musammi.js، ويوفّر window.MusammiWhisper. */
(function (G) {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";
  var DEF_MODEL = "onnx-community/whisper-base";   /* بديل أسرع وأخف: onnx-community/whisper-tiny */
  var FLAG = "msWhisper";
  var pipe = null, loading = null;

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
    }).then(function (p) { pipe = p; loading = null; ls(FLAG, model()); if (onProgress) onProgress(100); return p; },
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

  function capture(onChunk, onFail) {
    var ctx, stream, src, proc, stopped = false, rate = 16000;
    var pre = [], buf = [], speaking = false, silence = 0, dur = 0, floor = 0.004;
    function flush() {
      var n = 0, i, a, o, k = 0;
      for (i = 0; i < buf.length; i++) n += buf[i].length;
      a = new Float32Array(n); for (i = 0; i < buf.length; i++) { a.set(buf[i], k); k += buf[i].length; }
      buf = []; speaking = false; silence = 0; dur = 0;
      if (n / rate >= 0.45) onChunk(resample(a, rate, 16000));
    }
    function frame(d) {
      var lv = rms(d), fd = d.length / rate, thr = Math.max(0.012, floor * 2.8);
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
      var AC = G.AudioContext || G.webkitAudioContext; ctx = new AC(); rate = ctx.sampleRate;
      if (ctx.state === "suspended") ctx.resume();
      src = ctx.createMediaStreamSource(s);
      proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = function (e) { if (!stopped) frame(new Float32Array(e.inputBuffer.getChannelData(0))); };
      src.connect(proc); proc.connect(ctx.destination);
    }, function () { onFail("not-allowed"); });
    return { stop: function () {
      stopped = true; try { if (speaking) flush(); } catch (e) {}
      try { proc && proc.disconnect(); src && src.disconnect(); } catch (e) {}
      try { stream && stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { ctx && ctx.close(); } catch (e) {}
    } };
  }

  /* ===== واجهة المحرك التي يتوقعها musammi.js ===== */
  var HALLU = /(اشترك|اشتركوا|ترجمة|نانسي|شكرا لمشاهدتكم|شكرا على المشاهدة|subscribe)/i;
  function engine() {
    var cap = null, queue = [], busy = false, cbText = null, active = false;
    function pump() {
      if (busy || !queue.length || !pipe || !active) return;
      busy = true;
      var a = queue.shift();
      pipe(a, { language: "arabic", task: "transcribe" }).then(function (o) {
        busy = false;
        var t = o && (Array.isArray(o) ? o[0] && o[0].text : o.text);
        t = String(t || "").trim();
        if (active && t && !HALLU.test(t)) cbText(t, true);
        pump();
      }, function () { busy = false; pump(); });
    }
    return {
      name: "whisper",
      ready: function (done, progress) {
        load(progress).then(function () { done(true); }, function () {
          done(false, navigator.onLine ? "تعذّر تحميل محرك Whisper. أعد المحاولة بعد قليل." : "محرك Whisper غير محمّل بعد. اتصل بالإنترنت لتنزيله مرة واحدة.");
        });
      },
      start: function (cb, onEnd) {
        cbText = cb; active = true; queue = [];
        cap = capture(function (a) { queue.push(a); if (queue.length > 3) queue.shift(); pump(); }, function (why) { active = false; onEnd(why); });
      },
      stop: function () { active = false; queue = []; if (cap) cap.stop(); cap = null; }
    };
  }

  G.MusammiWhisper = { engine: engine, load: load, installed: installed, model: model };
})(typeof window !== "undefined" ? window : globalThis);
