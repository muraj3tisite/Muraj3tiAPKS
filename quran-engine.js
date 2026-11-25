/* محرك التلاوة للتسميع الآلي: نموذج FastConformer مدرَّب على تلاوة القرآن (من مشروع Tilawa)، يعمل داخل المتصفح (WASM)
   ولا يُرسل الصوت لأي خادم. يُنزَّل النموذج مرة واحدة من الإنترنت ثم يُحفظ في ذاكرة المتصفح، فيعمل بعدها دون اتصال.
   يُحمَّل هذا الملف عند الحاجة فقط من musammi.js، ويوفّر window.MusammiQuran بالواجهة نفسها التي كان يوفّرها محرك Whisper. */
(function (G) {
  "use strict";

  /* ===== الإعداد: مستودع النموذج على Hugging Face (يحوي الملفين fastconformer_full_mixed.onnx و vocab.json).
     النموذج: NVIDIA FastConformer عبر مشروع Tilawa، بترخيص CC-BY-4.0 (يلزم ذكر المصدر). =====
     لتغيير المستودع دون تعديل الملف: localStorage.msQuranBase = "الرابط/" */
  var BASE = "https://huggingface.co/acibZ/tilawa-quran-onnx/resolve/main/";
  var MODEL_FILE = "fastconformer_full_mixed.onnx", VOCAB_FILE = "vocab.json";
  var ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/";
  var CACHE = "mquran-v1";   /* مخزن دائم للنموذج: لا يُمسح عند تحديث التطبيق */
  var FLAG = "msQuran";

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function base() { var b = ls("msQuranBase") || BASE; return /\/$/.test(b) ? b : b + "/"; }
  function model() { return MODEL_FILE; }
  function installed() { return ls(FLAG) === MODEL_FILE; }
  function msg(e) { return String((e && e.message) || e).slice(0, 140); }

  /* ===== مكتبة التشغيل onnxruntime-web (UMD من jsdelivr، يحفظها عامل الخدمة للعمل دون إنترنت) ===== */
  var ortP = null;
  function loadOrt() {
    if (G.ort) return Promise.resolve(G.ort);
    if (ortP) return ortP;
    var names = ["ort.wasm.min.js", "ort.min.js"];
    ortP = new Promise(function (res, rej) {
      (function next(i) {
        if (i >= names.length) { ortP = null; return rej(new Error("تعذّر تحميل مكتبة التشغيل")); }
        var s = document.createElement("script"); s.src = ORT + names[i];
        s.onload = function () {
          if (!G.ort) { s.remove(); return next(i + 1); }
          try { G.ort.env.wasm.wasmPaths = ORT; G.ort.env.wasm.numThreads = 1; } catch (e) {}
          res(G.ort);
        };
        s.onerror = function () { s.remove(); next(i + 1); };
        document.head.appendChild(s);
      })(0);
    });
    return ortP;
  }
  /* نحفظ ملفات المكتبة صراحةً في مخزن دائم، حتى لو لم يكن عامل الخدمة قد اعترضها وقت التنزيل */
  function persistLibs() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      var urls = performance.getEntriesByType("resource").map(function (e) { return e.name; }).filter(function (u) { return u.indexOf("https://cdn.jsdelivr.net/") === 0 && u.indexOf("onnxruntime-web") > 0; });
      caches.open("mext-v1").then(function (c) {
        urls.forEach(function (u) { c.match(u).then(function (m) { if (!m) fetch(u, { mode: "cors" }).then(function (r) { if (r.ok) c.put(u, r); }).catch(function () {}); }); });
      });
    } catch (e) {}
  }

  /* ===== تنزيل الملفات مع نسبة التقدّم، وحفظها في مخزن دائم ===== */
  function download(url, onP) {
    return fetch(url, { mode: "cors" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " — تأكد من رابط النموذج");
      var total = +r.headers.get("content-length") || 0;
      if (!r.body || !r.body.getReader) return r.arrayBuffer();
      var rd = r.body.getReader(), out = new Uint8Array(total || 1 << 20), got = 0;
      return (function pump() {
        return rd.read().then(function (x) {
          if (x.done) return out.buffer.slice(0, got);
          if (got + x.value.length > out.length) { var n = new Uint8Array(Math.max(out.length * 2, got + x.value.length)); n.set(out.subarray(0, got)); out = n; }
          out.set(x.value, got); got += x.value.length;
          if (onP && total) onP(got, total);
          return pump();
        });
      })();
    });
  }
  /* يُرجع {buf, stored}: من المخزن إن وُجد، وإلا يُنزَّل ويُحفظ */
  function getFile(url, type, onP) {
    return caches.open(CACHE).then(function (c) {
      return c.match(url).then(function (m) {
        if (m) return m.arrayBuffer().then(function (b) { return { buf: b, stored: true }; });
        return download(url, onP).then(function (b) {
          return c.put(url, new Response(b, { headers: { "content-type": type } })).then(function () { return { buf: b, stored: true }; }, function () { return { buf: b, stored: false }; });
        });
      });
    }, function () { return download(url, onP).then(function (b) { return { buf: b, stored: false }; }); });
  }

  /* ===== المفردات (BPE عربي) وفكّ ترميز CTC ===== */
  function parseVocab(j) {
    var p = [], k;
    if (j && !Array.isArray(j) && typeof j === "object") {
      if (Array.isArray(j.vocab) || (j.vocab && typeof j.vocab === "object")) return parseVocab(j.vocab);
      if (Array.isArray(j.tokens) || (j.tokens && typeof j.tokens === "object")) return parseVocab(j.tokens);
      if (Array.isArray(j.pieces)) return parseVocab(j.pieces);
      var keys = Object.keys(j), numKeys = keys.length && keys.every(function (x) { return /^\d+$/.test(x); });
      if (numKeys) keys.forEach(function (x) { p[+x] = String(j[x]); });
      else keys.forEach(function (x) { if (typeof j[x] === "number") p[j[x]] = x; });
    } else if (Array.isArray(j)) {
      j.forEach(function (x, i) { p[i] = typeof x === "string" ? x : (Array.isArray(x) ? String(x[0]) : String((x && (x.piece || x.token || x.text)) || "")); });
    }
    for (k = 0; k < p.length; k++) if (p[k] === undefined) p[k] = "";
    var blank = -1;
    for (k = 0; k < p.length; k++) if (/^(<blank>|<blk>|\[blank\]|<ctc_blank>)$/i.test(p[k])) { blank = k; break; }
    return { p: p, blank: blank };
  }
  function decode(o, vocab) {
    var dims = o.dims, V = dims[dims.length - 1], T = dims[dims.length - 2], d = o.data, blank = vocab.blank >= 0 ? vocab.blank : V - 1;
    var prev = -1, res = [], t, v, b, bi, best, x;
    for (t = 0; t < T; t++) {
      b = t * V; bi = 0; best = d[b];
      for (v = 1; v < V; v++) { x = d[b + v]; if (x > best) { best = x; bi = v; } }
      if (bi !== prev && bi !== blank) { x = vocab.p[bi] || ""; if (!/^<.*>$/.test(x)) res.push(x); }
      prev = bi;
    }
    return res.join("").replace(/\u2581/g, " ").replace(/\s+/g, " ").trim();
  }

  /* ===== تحميل النموذج وتشغيله ===== */
  var sess = null, loading = null;
  function load(onProgress) {
    if (sess) return Promise.resolve(sess);
    if (loading) return loading;
    var mu = base() + MODEL_FILE, vu = base() + VOCAB_FILE, stored = true;
    if (/YOUR_USER/.test(mu)) return Promise.reject(new Error("لم يُضبط رابط النموذج في quran-engine.js (BASE)"));
    var ort;
    loading = loadOrt().then(function (o) {
      ort = o; if (onProgress) onProgress(1);
      return getFile(vu, "application/json");
    }).then(function (vf) {
      stored = stored && vf.stored;
      var vocab = parseVocab(JSON.parse(new TextDecoder().decode(vf.buf)));
      return getFile(mu, "application/octet-stream", function (g, t) { if (onProgress) onProgress(Math.min(97, 1 + Math.round(g / t * 96))); }).then(function (mf) {
        stored = stored && mf.stored;
        return ort.InferenceSession.create(new Uint8Array(mf.buf), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      }).then(function (s) { return { s: s, v: vocab, ort: ort }; });
    }).then(function (x) {
      /* تجربة قصيرة على صمت: تكشف أي خلل في أسماء المدخلات قبل أن يبدأ المستخدم */
      return run(x, new Float32Array(16000)).then(function () { return x; }, function (e) {
        throw new Error(msg(e) + " [المدخلات: " + x.s.inputNames.join(",") + " | المخرجات: " + x.s.outputNames.join(",") + "]");
      });
    }).then(function (x) {
      sess = x; loading = null;
      if (stored) ls(FLAG, MODEL_FILE);
      persistLibs(); if (onProgress) onProgress(100);
      return x;
    }, function (e) { loading = null; throw e; });
    return loading;
  }
  /* تحليل مقطع صوتي (Float32 بمعدل 16 كيلوهرتز) إلى نص عربي */
  function run(x, audio) {
    var ort = x.ort, ins = x.s.inputNames, feeds = {}, n = audio.length;
    var a = ins.indexOf("audio_signal") >= 0 ? "audio_signal" : ins[0], l = ins.indexOf("length") >= 0 ? "length" : ins[1];
    feeds[a] = new ort.Tensor("float32", audio, [1, n]);
    if (l) feeds[l] = new ort.Tensor("int64", BigInt64Array.from([BigInt(n)]), [1]);
    return x.s.run(feeds).then(function (r) { return decode(r[x.s.outputNames[0]], x.v); });
  }

  /* ===== التقاط الصوت وتقطيعه عند السكتات ===== */
  function resample(a, from, to) {
    if (from === to) return a;
    var n = Math.round(a.length * to / from), o = new Float32Array(n), r = from / to, i, p, j, f;
    for (i = 0; i < n; i++) { p = i * r; j = Math.floor(p); f = p - j; o[i] = a[j] * (1 - f) + (a[j + 1] === undefined ? a[j] : a[j + 1]) * f; }
    return o;
  }
  function rms(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }

  function capture(onChunk, onFail, stat) {
    var ctx, stream, src, proc, stopped = false, rate = 16000, own = false;
    stat = stat || {};
    var pre = [], buf = [], speaking = false, silence = 0, dur = 0, floor = 0.004;
    function flush() {
      var n = 0, i, a, k = 0;
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
  function engine() {
    var cap = null, queue = [], busy = false, cbText = null, active = false, stat = { chunks: 0, level: 0 };
    function pump() {
      if (busy || !queue.length || !sess || !active) return;
      busy = true;
      var a = queue.shift(), t0 = Date.now(), secs = a.length / 16000;
      run(sess, a).then(function (t) {
        busy = false;
        var ms = Date.now() - t0;
        if (eng.onInfo) { eng.onInfo("text", t || "(لا شيء)"); if (ms > secs * 1500) eng.onInfo("slow", Math.round(ms / 100) / 10); }
        if (active && t) cbText(t, true);
        pump();
      }, function (e) { busy = false; if (eng.onInfo) eng.onInfo("error", msg(e)); pump(); });
    }
    var eng = {
      name: "quran", stat: stat, onInfo: null,
      ready: function (done, progress) {
        load(progress).then(function () { done(true); }, function (e) {
          done(false, (navigator.onLine ? "تعذّر تحميل محرك التلاوة. أعد المحاولة بعد قليل." : "محرك التلاوة غير محفوظ بالكامل لهذا المتصفح. اتصل بالإنترنت وأعد تنزيله من الإعدادات، ثم اضغط «فحص جاهزية العمل دون إنترنت».") + " [" + msg(e) + "]");
        });
      },
      start: function (cb, onEnd) {
        cbText = cb; active = true; queue = [];
        cap = capture(function (a) { queue.push(a); if (queue.length > 5) queue.shift(); pump(); }, function (why) { active = false; onEnd(why); }, stat);
      },
      stop: function () { active = false; queue = []; if (cap) cap.stop(); cap = null; }
    };
    return eng;
  }

  /* اختبار شامل: يسجّل بضع ثوانٍ ويُرجع حالة الصوت والمستوى والنص الذي فهمه المحرك وزمن التحليل أو الخطأ */
  function test(sec, done) {
    var r = { level: 0, state: "", secs: sec, text: "", ms: 0, err: "" }, frames = [], stream, ctx, src, proc, own = false, rate = 16000;
    var fin = function () {
      try { proc && proc.disconnect(); src && src.disconnect(); stream && stream.getTracks().forEach(function (t) { t.stop(); }); if (own && ctx) ctx.close(); } catch (e) {}
      var n = 0, i, k = 0, a; for (i = 0; i < frames.length; i++) n += frames[i].length;
      a = new Float32Array(n); for (i = 0; i < frames.length; i++) { a.set(frames[i], k); k += frames[i].length; }
      if (r.level < 0.003) { r.err = "الميكروفون لا يلتقط صوتًا (المستوى شبه صفر)"; return done(r); }
      load().then(function (x) { var t0 = Date.now(); return run(x, resample(a, rate, 16000)).then(function (t) { r.ms = Date.now() - t0; r.text = t; done(r); }); },
        function (e) { r.err = "فشل التحميل: " + msg(e); done(r); }).catch(function (e) { r.err = "فشل التحليل: " + msg(e); done(r); });
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
    return caches.open("mext-v1").then(function (c) { return c.keys(); }).then(function (k) {
      var u = k.map(function (x) { return x.url; }).filter(function (x) { return x.indexOf("onnxruntime-web") > 0; });
      r.libs = u.length; r.lib = u.some(function (x) { return /\/ort(\.wasm)?\.min\.js/.test(x); });
      return caches.open(CACHE);
    }).then(function (c) { return c.keys(); }).then(function (k) { r.model = k.length; }).then(function () { return r; }, function () { return r; });
  }

  G.MusammiQuran = { test: test, check: check, engine: engine, load: load, installed: installed, model: model, _t: { parseVocab: parseVocab, decode: decode } };
})(typeof window !== "undefined" ? window : globalThis);
