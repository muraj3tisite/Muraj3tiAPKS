/* الروبوت اللطيف: الاسم الافتراضي «المسمّع الآلي»، والمستخدم هو من يختار له اسمًا (لكل جنس اسمه).
   عند اختيار الجنس (من الحساب أو من «خريطتي») تظهر رسالة ترحيب من الروبوت يطلب فيها اسمًا.
   يظهر في شاشة الترحيب برسالة تحفيزية، ويظهر فوق زر المسمّع الآلي (musammi.js). */
(function (G) {
  "use strict";
  var DEF = "المسمّع الآلي";
  function lsg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  /* الاسم الذي وضعه المستخدم (أو فارغ) واسم العرض */
  function custom(g) { return String(lsg("mrbN_" + (g || who().g)) || "").trim(); }
  function nm(g) { return custom(g) || DEF; }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* جنس المستخدم من ملفه الشخصي (وإلا من شخصية الخريطة، وإلا ذكر) */
  function who() {
    var p = null;
    try { p = G.MPROFILE && G.MPROFILE(); } catch (e) {}
    if (p && (p.g === "f" || p.g === "m")) return { g: p.g, n: p.n || "" };
    try { if (G.S && G.S.ch === "girl") return { g: "f", n: "" }; } catch (e) {}
    return { g: "m", n: "" };
  }

  /* ===== الرسم ===== */
  function svg(g, size, cls) {
    var f = g === "f",
      body = f ? "#e85d9e" : "#3f7cf0", dark = f ? "#b83278" : "#2556b8", glow = f ? "#fbcfe8" : "#c7dcff";
    return '<svg class="rb ' + (cls || "") + '" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' +
      '<line x1="50" y1="10" x2="50" y2="24" stroke="' + dark + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<circle class="rb-ant" cx="50" cy="8" r="5.5" fill="#fbbf24"/>' +
      '<rect x="31" y="84" width="38" height="14" rx="7" fill="' + dark + '"/>' +
      '<rect x="5" y="46" width="10" height="21" rx="5" fill="' + dark + '"/><rect x="85" y="46" width="10" height="21" rx="5" fill="' + dark + '"/>' +
      '<rect x="12" y="22" width="76" height="66" rx="27" fill="' + body + '"/>' +
      '<path d="M22 32 Q50 20 78 32" stroke="' + glow + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>' +
      '<rect x="21" y="33" width="58" height="44" rx="19" fill="#0f1d3d"/>' +
      '<g class="rb-eyes"><ellipse cx="38" cy="51" rx="6.2" ry="7.4" fill="#67e8f9"/><ellipse cx="62" cy="51" rx="6.2" ry="7.4" fill="#67e8f9"/>' +
      '<circle cx="40" cy="48.5" r="2" fill="#fff"/><circle cx="64" cy="48.5" r="2" fill="#fff"/></g>' +
      (f ? '<g stroke="#67e8f9" stroke-width="2" stroke-linecap="round"><line x1="31" y1="45" x2="28" y2="42"/><line x1="33" y1="42.5" x2="31" y2="38.5"/><line x1="69" y1="45" x2="72" y2="42"/><line x1="67" y1="42.5" x2="69" y2="38.5"/></g>' : "") +
      '<circle cx="29" cy="63" r="4" fill="#fb7185" opacity=".55"/><circle cx="71" cy="63" r="4" fill="#fb7185" opacity=".55"/>' +
      '<path class="rb-m" d="M42 63 Q50 71 58 63" stroke="#67e8f9" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      (f ? '<g><path d="M27 20 L11 11 L11 30 Z" fill="#ff5fa8"/><path d="M27 20 L43 11 L43 30 Z" fill="#ff5fa8"/><circle cx="27" cy="20" r="4.2" fill="#c2185b"/></g>' : "") +
      "</svg>";
  }

  var CSS = ".rb{display:block;overflow:visible}" +
    ".rb-eyes{transform-box:fill-box;transform-origin:center;animation:rbBlink 4.2s infinite}" +
    ".rb-ant{transform-box:fill-box;transform-origin:center;animation:rbAnt 1.6s ease-in-out infinite alternate}" +
    ".rb-live .rb-ant{fill:#ef4444;animation-duration:.55s}" +
    ".rb-err{animation:rbShake .45s}" +
    ".rb-float{animation:rbFloat 3.2s ease-in-out infinite}" +
    "@keyframes rbBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}" +
    "@keyframes rbAnt{from{transform:scale(.8);opacity:.7}to{transform:scale(1.15);opacity:1}}" +
    "@keyframes rbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px) rotate(-6deg)}50%{transform:translateX(5px) rotate(6deg)}80%{transform:translateX(-3px)}}" +
    "@keyframes rbFloat{50%{transform:translateY(-4px)}}" +
    "@media(prefers-reduced-motion:reduce){.rb-eyes,.rb-ant,.rb-err,.rb-float{animation:none}}" +
    ".rg{display:flex;gap:14px;align-items:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}" +
    ".rg>svg{flex:none}.rg-t{min-width:0}" +
    ".rg h2{margin:0 0 2px;font-size:19px}" +
    ".rg-who{margin:0 0 8px;font-size:13px;color:var(--mut)}" +
    ".rg-msg{margin:0;font-weight:600;line-height:1.7;background:var(--acc2);border:1px solid var(--acc);border-radius:14px;padding:8px 12px}" +
    ".rg-hint{margin:6px 0 0;font-size:12px;color:var(--mut)}" +
    ".rn{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translate(-50%,-140%);width:min(460px,calc(100% - 20px));box-sizing:border-box;z-index:200;display:flex;gap:10px;align-items:center;background:var(--card);color:var(--ink);border:2px solid var(--acc);border-radius:18px;padding:10px 14px;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:transform .5s cubic-bezier(.22,1.25,.36,1),opacity .3s;opacity:0;cursor:pointer}" +
    ".rn.on{transform:translate(-50%,0);opacity:1}" +
    ".rn svg{flex:none}.rn-t{min-width:0;font-size:14px;line-height:1.7}.rn-t b{display:block;font-size:15px}" +
    ".rn-two{display:flex;flex:none;margin-inline-end:-10px}.rn-two svg+svg{margin-inline-start:-14px}";

  function injectCss() {
    if (document.getElementById("rbCss")) return;
    var s = document.createElement("style"); s.id = "rbCss"; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ===== الرسائل التحفيزية (مذكّر، مؤنّث) ===== */
  var MSG = [
    ["صفحة تراجعها اليوم بثبات خيرٌ من عشر صفحات تتركها غدًا. ابدأ بالقليل الدائم.", "صفحة تراجعينها اليوم بثبات خيرٌ من عشر صفحات تتركينها غدًا. ابدئي بالقليل الدائم."],
    ["قال ﷺ: «الماهر بالقرآن مع السفرة الكرام البررة». كل مراجعة تقرّبك من هذه المنزلة.", "قال ﷺ: «الماهر بالقرآن مع السفرة الكرام البررة». كل مراجعة تقرّبك من هذه المنزلة."],
    ["قال ﷺ: «والذي يقرأ القرآن ويتتعتع فيه وهو عليه شاقّ له أجران». حتى تعثّرك مأجور، فلا تيأس.", "قال ﷺ: «والذي يقرأ القرآن ويتتعتع فيه وهو عليه شاقّ له أجران». حتى تعثّرك مأجور، فلا تيأسي."],
    ["المراجعة هي التي تحوّل الحفظ إلى رسوخ. أنت تبني شيئًا يبقى معك عمرك كله.", "المراجعة هي التي تحوّل الحفظ إلى رسوخ. أنتِ تبنين شيئًا يبقى معك عمرك كله."],
    ["قال ﷺ: «تعاهدوا القرآن». والتعاهد اليومي الخفيف أقوى من الهمّة الكبيرة المنقطعة.", "قال ﷺ: «تعاهدوا القرآن». والتعاهد اليومي الخفيف أقوى من الهمّة الكبيرة المنقطعة."],
    ["كل آية تثبّتها اليوم ستكون نورًا لك غدًا. استعن بالله ولا تعجز، وابدأ الآن.", "كل آية تثبّتينها اليوم ستكون نورًا لك غدًا. استعيني بالله ولا تعجزي، وابدئي الآن."],
    ["لا تقارن سرعتك بغيرك. المهم أن تمضي كل يوم خطوة، فالمداومة هي سرّ الحُفّاظ.", "لا تقارني سرعتك بغيرك. المهم أن تمضي كل يوم خطوة، فالمداومة هي سرّ الحافظات."],
    ["أنا هنا أسمعك وأتابعك كلمةً كلمة. ثق بنفسك، وقل بسم الله وانطلق!", "أنا هنا أسمعك وأتابعك كلمةً كلمة. ثقي بنفسك، وقولي بسم الله وانطلقي!"],
    ["من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة. طريقك مبارك، فواصل.", "من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة. طريقك مبارك، فواصلي."],
    ["قال ﷺ: «خيركم من تعلّم القرآن وعلّمه». وأنت في صفّ الخيرين بإذن الله.", "قال ﷺ: «خيركم من تعلّم القرآن وعلّمه». وأنتِ في صفّ الخيّرات بإذن الله."]
  ];

  var tap = 0;
  function dayNo() { var d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }

  function greet() {
    var el = document.getElementById("robotGreet"); if (!el) return;
    var w = who(), f = w.g === "f", h = new Date().getHours(),
      hi = h >= 4 && h < 12 ? "صباح الخير" : (h >= 18 || h < 4 ? "مساء الخير" : "أهلًا بك"),
      m = MSG[(dayNo() + tap) % MSG.length][f ? 1 : 0];
    el.className = "card rg"; el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", "رسالة من " + nm(w.g) + ". اضغط لرسالة أخرى");
    el.innerHTML = svg(w.g, 84, "rb-float") +
      '<div class="rg-t"><h2>' + hi + (w.n ? " يا " + esc(w.n) : "") + '</h2>' +
      '<p class="rg-who">أنا <b>' + esc(nm(w.g)) + "</b>، " + (f ? "رفيقتك" : "رفيقك") + " في المراجعة والتسميع</p>" +
      '<p class="rg-msg">' + m + '</p><p class="rg-hint">اضغط لرسالة أخرى</p></div>';
  }


  /* ===== إشعار الترحيب: عند أول دخول للتطبيق فقط ===== */
  var nt = null;
  function seen() { return lsg("mrbSeen") === "1"; }
  function mark() { lss("mrbSeen", "1"); }
  function hideNote() { if (!nt) return; var n = nt; nt = null; n.classList.remove("on"); setTimeout(function () { n.remove(); }, 600); }
  function notify() {
    if (!document.body || nt || seen()) return;
    injectCss();
    var html = '<span class="rn-two">' + svg("m", 52, "") + svg("f", 52, "") + '</span><div class="rn-t"><b>أهلًا بك في مراجعتي!</b>سيرافقك «' + DEF + '» في المراجعة والتسميع.</div>';
    nt = document.createElement("div"); nt.className = "rn"; nt.setAttribute("role", "status"); nt.innerHTML = html;
    nt.addEventListener("click", hideNote);
    document.body.appendChild(nt);
    mark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (nt) nt.classList.add("on"); }); });
    var me = nt; setTimeout(function () { if (nt === me) hideNote(); }, 4000);
  }

  /* ===== رسالة الترحيب واختيار اسم الروبوت: تظهر مرة لكل جنس، أول ما يحدّده المستخدم ===== */
  function setName(g, n) {
    n = String(n || "").replace(/\s+/g, " ").trim().slice(0, 20);
    lss("mrbN_" + g, n);
    greet(); try { document.dispatchEvent(new Event("mrobot")); } catch (e) {}
  }
  function ask(explicit) {
    if (!document.body) return;
    var hasProf = false; try { hasProf = !!(G.MPROFILE && G.MPROFILE()); } catch (e) {}
    if (!explicit && !hasProf) return;                       /* لم يحدّد جنسه بعد */
    var w = who(), g = w.g, f = g === "f";
    if (lsg("mrbQ_" + g) === "1" || document.getElementById("rbAsk")) return;
    var onb = document.getElementById("onb"); if (onb && !onb.classList.contains("hide")) return;
    injectCss();
    var d = document.createElement("div"); d.id = "rbAsk"; d.className = "tjg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "rbAskT");
    d.innerHTML = '<div class="tjg-box" style="max-width:420px"><div class="onb-hero">' + svg(g, 96, "rb-float") +
      '<h2 id="rbAskT">أهلًا بك' + (w.n ? " يا " + esc(w.n) : "") + '! 👋</h2>' +
      '<p class="sub">أنا روبوتك الذي ' + (f ? "سيسمّع لكِ" : "سيسمّع لك") + ' ويرافقك في المراجعة. ' + (f ? "اختاري" : "اختر") + ' لي اسمًا يعجبك، أو ' + (f ? "اتركيه" : "اتركه") + ' كما هو.</p></div>' +
      '<label for="rbAskN">اسم الروبوت</label><input id="rbAskN" class="fld" type="text" maxlength="20" autocomplete="off" placeholder="' + DEF + '">' +
      '<p id="rbAskE" class="auth-err hide" role="alert"></p>' +
      '<button type="button" id="rbAskGo" class="p" style="width:100%;margin-top:14px">حفظ الاسم</button>' +
      '<div class="row" style="justify-content:center"><button type="button" id="rbAskDef" class="auth-lnk">أبقِ الاسم «' + DEF + '»</button></div></div>';
    document.body.appendChild(d); document.body.style.overflow = "hidden";
    var inp = d.querySelector("#rbAskN"), er = d.querySelector("#rbAskE");
    function close() { d.remove(); if (!document.querySelector(".tjg:not(.hide)")) document.body.style.overflow = ""; }
    function save(def) {
      var n = def ? "" : inp.value.replace(/\s+/g, " ").trim();
      if (!def && n.length < 2) { er.textContent = "الاسم حرفان على الأقل"; er.classList.remove("hide"); return; }
      lss("mrbQ_" + g, "1"); setName(g, n); close();
    }
    d.querySelector("#rbAskGo").onclick = function () { save(false); };
    d.querySelector("#rbAskDef").onclick = function () { save(true); };
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(false); } });
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 80);
  }
  /* عند تغيير الجنس (مثلًا من «خريطتي» دون حساب): حدّث البطاقة والزر فورًا */
  function refresh() { greet(); try { document.dispatchEvent(new Event("mrobot")); } catch (e) {} ask(true); }

  function init() {
    injectCss(); greet(); setTimeout(notify, 700); setTimeout(function () { ask(false); }, 1500);
    var el = document.getElementById("robotGreet"); if (!el || el._rb) return; el._rb = 1;
    var next = function () { tap++; greet(); };
    el.addEventListener("click", next);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } });
  }

  G.MRobot = { svg: svg, who: who, name: function (g) { return nm(g); }, custom: custom, setName: setName, DEF: DEF, ask: ask, greet: greet, refresh: refresh, notify: notify, css: injectCss };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
