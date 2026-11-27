/* ميزات المرحلة الأولى: التعافي من الانقطاع + المراجعة المتكيّفة
   1) سلسلة الأيام بيوم سماح واحد أسبوعيًا   2) وضع «اليوم المزدحم» (١٠ دقائق)
   3) خطة عودة خفيفة بعد انقطاع يومين فأكثر  4) عودة أسرع للصفحات الضعيفة (تكرار متباعد)
   5) خريطة حرارية للمصحف.
   لا يكتب شيئًا في مفتاح بيانات التطبيق (muraja3a1) ولا يغيّر S. يحفظ بياناته في مفتاح مستقل: mfx1.
   يُستدعى من index.html عبر MFX.onSave و MFX.onRender، وكل استدعاء داخل try/catch حتى لا يتعطل التطبيق أبدًا. */
(function (G) {
  "use strict";
  var KEY = "mfx1", A = null;
  function load() {
    var o = null; try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!o || typeof o !== "object") o = {};
    o.h = o.h || {}; o.seen = o.seen || {}; o.busy = o.busy || {}; o.busyDone = o.busyDone || {}; o.cb = o.cb || null; o.hide = o.hide || ""; o.fin = o.fin || "";
    return o;
  }
  var M = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} }
  function $(i) { return document.getElementById(i); }
  function ar(n) { return A && A.AR ? A.AR(n) : String(n); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ===== التاريخ ===== */
  function dk(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function pd(k) { var a = String(k).split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addD(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function diff(a, b) { return Math.round((a - b) / 864e5); }
  function wk(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5 + 5) / 7); }   /* أسبوع يبدأ السبت */

  /* ===== ١) السلسلة بيوم سماح أسبوعي ===== */
  function isDone(S, d) { var k = dk(d), l = S.log[k]; return !!((l && l.all) || M.busyDone[k]); }
  function earliest(S) {
    var m = null, k, d;
    for (k in S.log) { d = pd(k); if (!isNaN(d) && (!m || d < m)) m = d; }
    for (k in M.busyDone) { d = pd(k); if (!isNaN(d) && (!m || d < m)) m = d; }
    return m;
  }
  function streak(S) {
    var res = { n: 0, grace: 0 }, min = earliest(S), c = today(), used = {}, pend = 0;
    if (!min) return res;
    if (!isDone(S, c)) c = addD(c, -1);            /* اليوم لم ينتهِ بعد: لا يُحسب عليه */
    while (c >= min) {
      if (isDone(S, c)) { res.n++; res.grace += pend; pend = 0; }
      else { var w = wk(c); if (used[w]) break; used[w] = 1; pend++; }   /* يوم سماح واحد لكل أسبوع */
      c = addD(c, -1);
    }
    return res;
  }

  /* ===== ٤) الصفحات الضعيفة: تكرار متباعد من نتائج التسميع الفعلية (S.tas) ===== */
  function sync(S) {
    if (!S || !S.tas) return;
    var ch = 0, p, t, sig, h;
    for (p in S.tas) {
      t = S.tas[p]; if (!t) continue; sig = t.d + "|" + (t.ok ? 1 : 0);
      if (M.seen[p] === sig) continue;
      h = M.h[p] = M.h[p] || [];
      if (h.length && h[h.length - 1][0] === t.d) h[h.length - 1][1] = t.ok ? 1 : 0; else h.push([t.d, t.ok ? 1 : 0]);
      if (h.length > 8) h.shift();
      M.seen[p] = sig; ch = 1;
    }
    if (ch) store();
  }
  function info(p) {
    var h = M.h[p], bad = 0, i, k;
    if (!h || !h.length) return null;
    for (i = 0; i < h.length; i++) if (!h[i][1]) bad++;
    if (!bad) return { st: "ok", due: null, bad: 0 };
    var last = h[h.length - 1], d = pd(last[0]);
    if (!last[1]) return { st: "weak", due: addD(d, 1), bad: bad };
    k = 0; for (i = h.length - 1; i >= 0 && h[i][1]; i--) k++;
    if (k >= 4) return { st: "ok", due: null, bad: bad };            /* أتقنها: تتخرج من قائمة الضعف */
    return { st: "mid", due: addD(d, Math.pow(2, k)), bad: bad };     /* ٢، ٤، ٨ أيام */
  }
  function memo(S) { var o = {}; for (var i = 0; i < S.N; i++) o[A.pg(i)] = 1; return o; }
  function dueList(S) {
    var m = memo(S), t = today(), L = [], p, f;
    for (p in M.h) {
      if (!m[p]) continue; f = info(p);
      if (f && f.due && f.due <= t) L.push({ p: +p, st: f.st, bad: f.bad, due: f.due });
    }
    L.sort(function (a, b) { return (a.st === b.st ? 0 : a.st === "weak" ? -1 : 1) || b.bad - a.bad || a.due - b.due; });
    return L;
  }

  /* ===== ٣) خطة العودة بعد الانقطاع ===== */
  function offer(S) {
    if (!(S.N > 0)) return null;
    var W = S.win > 0 ? S.win : 60, cyc = Math.max(1, Math.ceil(S.N / W));
    if (cyc < 2) return null;                       /* مراجعة شاملة يوميًا: لا شيء يفوت بالانقطاع */
    var t = today(), lastD = null, k, d;
    for (k in S.log) { var l = S.log[k]; if (!(l && (l["new"] || l.old || l.rec || l.all))) continue; d = pd(k); if (d < t && (!lastD || d > lastD)) lastD = d; }
    for (k in M.busyDone) { d = pd(k); if (d < t && (!lastD || d > lastD)) lastD = d; }
    if (!lastD) return null;
    var gap = diff(t, lastD) - 1;
    if (gap < 2) return null;                       /* يوم واحد يغطيه السماح */
    var base = A.dayIdx(), seen = {}, sl = [], i;
    for (i = 1; i <= Math.min(gap, 14); i++) {
      var di = base - i; if (di < 0) break;
      var s = ((di % cyc) + cyc) % cyc; if (!seen[s]) { seen[s] = 1; sl.push(s); }
    }
    sl.sort(function (a, b) { return a - b; });
    var rg = [];
    sl.forEach(function (s) { var a = s * W, b = Math.min(S.N, (s + 1) * W); if (a >= b) return; var q = rg[rg.length - 1]; if (q && q[1] === a) q[1] = b; else rg.push([a, b]); });
    var tot = 0; rg.forEach(function (r) { tot += r[1] - r[0]; });
    if (!tot) return null;
    var c = Math.max(5, Math.min(20, Math.ceil(tot / 7))), items = [];
    rg.forEach(function (r) {
      for (var i = r[0]; i < r[1]; i += c) {
        var j = Math.min(r[1], i + c), p1 = A.pg(i), p2 = A.pg(j - 1);
        items.push({ lo: Math.min(p1, p2), hi: Math.max(p1, p2), l: A.lbl(i, j), n: j - i, done: 0 });
      }
    });
    return { gap: gap, pages: tot, items: items.slice(0, 14) };
  }

  /* ===== ٢) اليوم المزدحم: ثلاث صفحات (نحو ١٠ دقائق) هي الأهم ===== */
  function busyPages(S, P, due) {
    var out = [], seen = {};
    function add(p, why) { if (out.length < 3 && p >= 1 && p <= 604 && !seen[p]) { seen[p] = 1; out.push({ p: p, why: why }); } }
    if (due[0]) add(due[0].p, "صفحة ضعيفة تحتاج عودة");
    add(A.pg(S.N - 1), "أحدث ما حفظت");
    add(A.pg(S.N - 2), "من حفظك القريب");
    if (due[1]) add(due[1].p, "صفحة ضعيفة تحتاج عودة");
    add(A.pg(P.old[0]), "من مراجعة اليوم");
    return out;
  }

  /* ===== الواجهة ===== */
  var CSS = "#tasks.mfx-busy>:not(#mfxTasks){display:none}" +
    ".mfx-b,.mfx-w,.mfx-cb{border:1px solid var(--acc,#3f7cf0);border-radius:14px;padding:10px 12px;margin:0 0 12px;background:var(--acc2,transparent)}" +
    ".mfx-b b,.mfx-w b,.mfx-cb b{display:block;margin-bottom:4px}" +
    ".mfx-b small,.mfx-w small,.mfx-cb small{display:block;color:var(--mut,#94a3b8);font-weight:400;line-height:1.7}" +
    ".mfx-r{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:8px 0}" +
    ".mfx-r .mfx-bt{display:flex;gap:6px}.mfx-ok{color:var(--ok,#22c55e);font-weight:800;margin:8px 0}" +
    ".mfx-h summary{cursor:pointer;font-size:18px;font-weight:700}.mfx-g{margin-top:10px}" +
    ".mfx-j{display:flex;gap:2px;align-items:center;margin-bottom:2px}" +
    ".mfx-j i{flex:none;width:22px;font-style:normal;font-size:10px;color:var(--mut,#94a3b8);text-align:center}" +
    ".mfx-c{flex:1 1 0;min-width:0;height:13px;padding:0;margin:0;border:0;border-radius:3px;cursor:pointer;min-height:0}" +
    ".s-ok{background:#22c55e}.s-mid{background:#eab308}.s-weak{background:#ef4444}.s-unk{background:#64748b}.s-no{background:rgba(148,163,184,.18);cursor:default}" +
    ".mfx-lg{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;margin-top:8px}.mfx-lg span{display:inline-flex;gap:5px;align-items:center}" +
    ".mfx-lg i{width:11px;height:11px;border-radius:3px;display:inline-block}";
  function css() { if ($("mfxCss")) return; var s = document.createElement("style"); s.id = "mfxCss"; s.textContent = CSS; document.head.appendChild(s); }
  function bt(a, t, c) { return '<button type="button" data-mfx="' + a + '"' + (c ? ' class="' + c + '"' : "") + ">" + t + "</button>"; }
  function rd(lo, hi, m, t) { return '<button type="button" data-rd="' + lo + "," + hi + "," + m + '">' + t + "</button>"; }

  function tasksHtml(S, P, dn, t) {
    var h = "", key = dk(t), due = dueList(S), busy = !!M.busy[key], i;
    if (busy) {
      h += '<div class="mfx-b"><b>وضع اليوم المزدحم: ١٠ دقائق فقط</b><small>راجع هذه الصفحات فقط. يُحسب اليوم ضمن أيامك المتتالية، ولا تتراكم عليك مهام.</small>';
      busyPages(S, P, due).forEach(function (x) {
        h += '<div class="mfx-r"><span>صفحة ' + ar(x.p) + "<small>" + x.why + '</small></span><span class="mfx-bt">' + rd(x.p, x.p, "review", "راجع") + rd(x.p, x.p, "tasmee", "سمّع") + "</span></div>";
      });
      h += M.busyDone[key] ? '<p class="mfx-ok">✓ حُسب اليوم ضمن سلسلتك. تقبّل الله منك.</p>' : bt("busyDone", "أتممت اليوم المختصر", "p");
      return h + " " + bt("busyOff", "العودة إلى الخطة الكاملة") + "</div>";
    }
    if (due.length) {
      h += '<div class="mfx-w"><b>صفحات تحتاج عودة اليوم</b><small>تعود إليك أسرع لأنك أخطأت فيها أو لأن موعد مراجعتها المتباعدة حان.</small>';
      due.slice(0, 3).forEach(function (x) {
        h += '<div class="mfx-r"><span>صفحة ' + ar(x.p) + "<small>" + (x.st === "weak" ? "أخطأت فيها آخر مرة" : "مراجعة متباعدة") + '</small></span><span class="mfx-bt">' + rd(x.p, x.p, "tasmee", "سمّع") + "</span></div>";
      });
      h += "</div>";
    }
    if (M.cb && M.cb.items) {
      var nx = null, left = 0;
      M.cb.items.forEach(function (x) { if (!x.done) { left++; if (!nx) nx = x; } });
      if (!nx) M.cb = null;
      else if (M.cb.doneDay === key) h += '<div class="mfx-cb"><p class="mfx-ok">✓ أتممت مراجعة العودة لليوم. المتبقي ' + ar(left) + " من خطة العودة، وتكملها غدًا.</p></div>";
      else h += '<div class="mfx-cb"><b>خطة العودة — اليوم</b><small>' + esc(nx.l) + " (" + ar(nx.n) + " صفحة، نحو " + ar(nx.n * 3) + ' دقيقة). المتبقي من الخطة بعد اليوم: ' + ar(left - 1) + ' يوم.</small><div class="mfx-r"><span class="mfx-bt">' + rd(nx.lo, nx.hi, "review", "راجع") + rd(nx.lo, nx.hi, "tasmee", "سمّع") + "</span><span class=\"mfx-bt\">" + bt("cbDone", "أتممتها", "p") + bt("cbCancel", "إلغاء الخطة") + "</span></div></div>";
    } else if (M.hide !== key) {
      var o = offer(S);
      if (o) h += '<div class="mfx-cb"><b>أهلًا بعودتك 🌿</b><small>فاتك ' + ar(o.gap) + " أيام. لا تراجع كل ما فاتك دفعة واحدة؛ نوزّع نحو " + ar(o.pages) + " صفحة على " + ar(o.items.length) + ' أيام بمقدار خفيف، بجانب خطتك المعتادة.</small><div class="mfx-r"><span class="mfx-bt">' + bt("cbStart", "ابدأ خطة العودة", "p") + bt("cbHide", "ليس الآن") + "</span></div></div>";
    }
    if (!(dn && dn.all)) h += '<div class="mfx-r">' + bt("busyOn", "يوم مزدحم؟ اختصر خطة اليوم إلى ١٠ دقائق") + "</div>";
    return h;
  }

  function heatHtml(S, open) {
    var m = memo(S), j, c, p, st, h = "<details" + (open ? " open" : "") + '><summary>خريطة حفظي الحرارية</summary><div class="mfx-lg">' +
      '<span><i class="s-ok"></i>متقنة</span><span><i class="s-mid"></i>تحتاج تثبيتًا</span><span><i class="s-weak"></i>ضعيفة</span><span><i class="s-unk"></i>محفوظة ولم تُسمَّع بعد</span><span><i class="s-no"></i>لم تُحفظ</span></div><div class="mfx-g">';
    for (j = 1; j <= 30; j++) {
      h += '<div class="mfx-j"><i>' + ar(j) + "</i>";
      for (p = (j === 1 ? 1 : 20 * j - 18); p <= (j === 30 ? 604 : 20 * j + 1); p++) {
        var f = m[p] ? info(p) : null;
        st = !m[p] ? "no" : !f ? "unk" : f.st;
        h += '<button type="button" class="mfx-c s-' + st + '"' + (m[p] ? ' data-mfx="open" data-p="' + p + '"' : " disabled") + ' aria-label="صفحة ' + ar(p) + '" title="صفحة ' + ar(p) + '"></button>';
      }
      h += "</div>";
    }
    return h + '</div><p class="sub">اضغط أي صفحة محفوظة لتسميعها. الأرقام الجانبية هي أجزاء المصحف.</p></details>';
  }

  function onSave(S) { sync(S); }

  function onRender(S, P, T, dn, k, api) {
    A = api; sync(S); css();
    var t = today(), st = streak(S), el = $("sS");
    if (el) el.textContent = ar(st.n);
    var g = $("mfxGrace");
    if (!g) {
      var stats = document.querySelector("#t-today .stats");
      if (stats && stats.parentNode) { g = document.createElement("p"); g.id = "mfxGrace"; g.className = "sub"; stats.parentNode.insertBefore(g, stats.nextSibling); }
    }
    if (g) g.textContent = st.grace ? "🛡 حُفظت سلسلتك بـ" + (st.grace === 1 ? "يوم سماح" : ar(st.grace) + " أيام سماح") + " (يُسمح بيوم واحد كل أسبوع)." : "";
    var tk = $("tasks");
    if (tk) {
      var old = $("mfxTasks"); if (old) old.remove();
      var box = document.createElement("div"); box.id = "mfxTasks";
      var busy = S.N > 0 && !!M.busy[dk(t)];
      box.innerHTML = S.N > 0 ? tasksHtml(S, P, dn, t) : "";
      tk.appendChild(box);
      if (tk.classList) tk.classList.toggle("mfx-busy", busy);
      if (busy) { var te = $("timeEst"); if (te) te.textContent = "الوقت التقريبي: " + ar(10) + " دقائق (وضع اليوم المزدحم)."; }
    }
    var hc = $("mfxHeat");
    if (!hc) {
      var oq = $("openQ");
      if (oq && oq.parentNode && oq.parentNode.parentNode) { hc = document.createElement("div"); hc.id = "mfxHeat"; hc.className = "card mfx-h"; oq.parentNode.parentNode.insertBefore(hc, oq.parentNode); }
    }
    if (hc) { var was = !!(hc.querySelector && hc.querySelector("details") && hc.querySelector("details").open); hc.innerHTML = S.N > 0 ? heatHtml(S, was) : ""; }
  }

  if (typeof document !== "undefined") document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-mfx]"); if (!b) return;
    var a = b.getAttribute("data-mfx"), key = dk(today());
    try {
      if (a === "open") { var p = +b.getAttribute("data-p"); if (p && A && A.go) A.go(p, p, "tasmee"); return; }
      if (a === "busyOn") M.busy[key] = 1;
      else if (a === "busyOff") delete M.busy[key];
      else if (a === "busyDone") M.busyDone[key] = 1;
      else if (a === "cbHide") M.hide = key;
      else if (a === "cbCancel") M.cb = null;
      else if (a === "cbStart") { var o = offer(S0()); if (o) M.cb = { items: o.items, doneDay: "", start: key }; }
      else if (a === "cbDone" && M.cb) { for (var i = 0; i < M.cb.items.length; i++) if (!M.cb.items[i].done) { M.cb.items[i].done = 1; break; } M.cb.doneDay = key; }
      else return;
      store(); if (A && A.render) A.render();
    } catch (x) {}
  });
  function S0() { return A && A.S ? A.S() : null; }

  G.MFX = { onSave: onSave, onRender: onRender, _t: { streak: streak, info: info, offer: offer, busyPages: busyPages, dueList: dueList, sync: sync, M: function () { return M; }, setA: function (a) { A = a; }, dk: dk, today: today, addD: addD } };
})(typeof window !== "undefined" ? window : globalThis);
