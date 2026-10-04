/* ==========================================================================
   Rovia : interactions du site
   ========================================================================== */
(function () {
  "use strict";

  var C = window.ROVIA || {};
  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------------
     1. Réglages (assets/js/config.js) injectés dans la page
     ------------------------------------------------------------------------ */
  function euros(n) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
  }

  $$("[data-rovia]").forEach(function (el) {
    var v = C[el.getAttribute("data-rovia")];
    if (v !== undefined && v !== null && v !== "") el.textContent = v;
  });

  $$("[data-rovia-price]").forEach(function (el) {
    var key = el.getAttribute("data-rovia-price");
    if (!(key in C)) return;
    var v = C[key];
    var from = el.parentElement.querySelector(".plan__from");
    if (v === null || v === "") {
      el.textContent = "Sur devis";
      el.classList.add("plan__amount--text");
      if (from) from.innerHTML = "&nbsp;";
    } else {
      el.textContent = euros(v);
      el.classList.remove("plan__amount--text");
      if (from) from.textContent = "à partir de";
    }
  });

  if (C.email) {
    $$("[data-rovia-email]").forEach(function (a) {
      a.href = "mailto:" + C.email;
      if (a.textContent.indexOf("@") > -1) a.textContent = C.email;
    });
  }

  var year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------------
     2. Défilement fluide (Lenis)
     ------------------------------------------------------------------------ */
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    if (hasGSAP) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }

  /* ------------------------------------------------------------------------
     3. En-tête, menu mobile, bouton fixe
     ------------------------------------------------------------------------ */
  var header = $("[data-header]");
  var toggle = $("[data-menu-toggle]");
  var menu = $("[data-menu]");
  var mobileCta = $("[data-mobile-cta]");
  var menuOpen = false;
  var lastY = 0;

  function onScroll(y) {
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 24);
    if (!menuOpen) {
      if (y > window.innerHeight * 0.9 && y > lastY + 6) header.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 160) header.classList.remove("is-hidden");
    }
    lastY = y;
  }
  if (lenis) lenis.on("scroll", function (e) { onScroll(e.scroll); });
  else {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { onScroll(window.scrollY); ticking = false; });
    }, { passive: true });
  }
  onScroll(window.scrollY);

  function setMenu(open) {
    if (!menu || !toggle || open === menuOpen) return;
    menuOpen = open;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".menu-toggle__label").textContent = open ? "Fermer" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    header.classList.remove("is-hidden");
    updateMobileCta();
    if (open && hasGSAP && !reduced) {
      window.gsap.fromTo($$("li", menu), { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.05 });
      window.gsap.fromTo($(".mobile-menu__foot", menu), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: 0.25 });
    }
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!menuOpen); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuOpen) { setMenu(false); toggle.focus(); }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) setMenu(false); });

  var heroInView = true, contactInView = false;
  function updateMobileCta() {
    if (mobileCta) mobileCta.classList.toggle("is-visible", !heroInView && !contactInView && !menuOpen);
  }
  if ("IntersectionObserver" in window) {
    var heroEl = $("[data-hero]");
    if (heroEl) new IntersectionObserver(function (en) { heroInView = en[0].isIntersecting; updateMobileCta(); }).observe(heroEl);
    // Le bouton fixe se cache sur le comparateur, le formulaire et le pied de page.
    var ends = [$("[data-ba]"), $("#contact"), $(".site-footer")].filter(Boolean);
    var endState = new Map();
    var endIO = new IntersectionObserver(function (en) {
      en.forEach(function (x) { endState.set(x.target, x.isIntersecting); });
      contactInView = Array.from(endState.values()).some(Boolean);
      updateMobileCta();
    });
    ends.forEach(function (el) { endIO.observe(el); });
  }

  /* Liens d'ancre : défilement fluide + fermeture du menu */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    if (history.replaceState) history.replaceState(null, "", id === "#top" ? location.pathname : id);
    if (id !== "#top") {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });

  /* ------------------------------------------------------------------------
     4. Animations d'apparition (GSAP + ScrollTrigger)
     ------------------------------------------------------------------------ */
  // Découpe un titre en mots (en gardant les balises internes et les espaces insécables).
  function splitWords(el) {
    if (!el || el.getAttribute("data-split-done")) return [];
    var words = [[]];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \t\n\r]+$/.test(part)) { if (words[words.length - 1].length) words.push([]); }
          else words[words.length - 1].push(document.createTextNode(part));
        });
      } else {
        words[words.length - 1].push(node);
      }
    });
    el.textContent = "";
    var inners = [];
    words.filter(function (w) { return w.length; }).forEach(function (w, i) {
      if (i) el.appendChild(document.createTextNode(" "));
      var outer = document.createElement("span");
      outer.className = "split-w";
      var inner = document.createElement("span");
      w.forEach(function (n) { inner.appendChild(n); });
      outer.appendChild(inner);
      el.appendChild(outer);
      inners.push(inner);
    });
    el.setAttribute("data-split-done", "1");
    return inners;
  }

  function countUp(el) {
    var m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    var end = parseInt(m[1], 10), rest = m[2], o = { v: 0 };
    window.gsap.to(o, {
      v: end, duration: 1.4, ease: "power2.out",
      onUpdate: function () { el.textContent = Math.round(o.v) + rest; }
    });
  }

  function heroIntro() {
    var gsap = window.gsap;
    var words = splitWords($("[data-hero-title]"));
    var items = $$("[data-hero-item]");
    gsap.set(words, { yPercent: 115 });
    gsap.set(items, { autoAlpha: 0, y: 26 });
    gsap.set(".hero__scroll", { autoAlpha: 0 });
    html.classList.remove("js-anim");

    var tl = gsap.timeline({ delay: 0.1 });
    tl.to(items[0], { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0)
      .to(words, { yPercent: 0, duration: 1.25, ease: "expo.out", stagger: 0.055 }, 0.1)
      .to(items.slice(1), { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.1 }, 0.55)
      .to(".hero__scroll", { autoAlpha: 1, duration: 1 }, 1.3);

    var line = $(".hero__line path");
    if (line && getComputedStyle($(".hero__line")).display !== "none") {
      var len = line.getTotalLength();
      gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.4, ease: "power2.inOut", delay: 0.4 });
    }
  }

  if (hasGSAP && !reduced) {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    heroIntro();

    $$("[data-split]").forEach(function (el) {
      var words = splitWords(el);
      gsap.set(words, { yPercent: 115 });
      ST.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.045 }); }
      });
    });

    gsap.set("[data-reveal]", { autoAlpha: 0, y: 34 });
    ST.batch("[data-reveal]", {
      start: "top 90%", once: true,
      onEnter: function (batch) {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12, overwrite: true });
        batch.forEach(function (el) {
          var t = el.querySelector(".step__time span");
          if (t) countUp(t);
        });
      }
    });

    var rail = $("[data-rail]");
    if (rail) {
      gsap.fromTo(rail, { scaleX: 0 }, {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: ".steps__list", start: "top 85%", end: "bottom 65%", scrub: 0.6 }
      });
    }

    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      $$("[data-parallax]").forEach(function (el) {
        gsap.fromTo(el, { y: 0 }, {
          y: parseFloat(el.getAttribute("data-parallax")) || -30, ease: "none",
          scrollTrigger: { trigger: el.closest("[data-work]"), start: "top bottom", end: "bottom top", scrub: true }
        });
      });
      gsap.fromTo(".footer__word", { yPercent: 60 }, {
        yPercent: 0, ease: "none",
        scrollTrigger: { trigger: ".site-footer", start: "top bottom", end: "bottom bottom", scrub: true }
      });
    });

    window.addEventListener("load", function () { ST.refresh(); });
  } else {
    html.classList.remove("js-anim");
  }

  /* ------------------------------------------------------------------------
     5. Comparateur avant / après
     ------------------------------------------------------------------------ */
  (function initCompare() {
    var stage = $("[data-ba]");
    if (!stage) return;
    var handle = $("[data-ba-handle]", stage);
    var canvases = $$(".ba-canvas", stage);
    var phoneMQ = window.matchMedia("(max-width: 639px)");
    var pos = 50, touched = false, hint = null;

    function layout() {
      var phone = phoneMQ.matches;
      stage.classList.toggle("is-phone", phone);
      canvases.forEach(function (c) {
        var screen = c.parentElement;
        var sw = screen.clientWidth, sh = screen.clientHeight;
        if (!sw || !sh) return;
        var v = phone ? c.getAttribute("data-vw-phone") : c.getAttribute("data-vw");
        var vw = v === "auto" ? sw : parseFloat(v);
        var s = sw / vw;
        c.style.width = vw + "px";
        c.style.height = sh / s + "px";
        c.style.transform = "scale(" + s + ")";
      });
    }

    function set(p) {
      pos = Math.max(0, Math.min(100, p));
      stage.style.setProperty("--pos", pos + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
      handle.setAttribute("aria-valuetext", Math.round(100 - pos) + " % du nouveau site visible");
      stage.classList.toggle("hide-before", pos < 13);
      stage.classList.toggle("hide-after", pos > 87);
    }

    function stopHint() {
      touched = true;
      if (hint) { hint.kill(); hint = null; }
    }

    function fromEvent(e) {
      var r = stage.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }

    var dragging = false, decided = false, sx = 0, sy = 0, moved = false, type = "mouse";
    stage.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;
      dragging = true; moved = false; decided = e.pointerType === "mouse";
      type = e.pointerType; sx = e.clientX; sy = e.clientY;
      stopHint();
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      if (type === "mouse") { fromEvent(e); stage.classList.add("is-dragging"); e.preventDefault(); }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      if (!decided) {
        var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dy > 8 && dy > dx) { dragging = false; return; }
        if (dx < 6) return;
        decided = true;
        stage.classList.add("is-dragging");
      }
      moved = true;
      fromEvent(e);
    });
    function end(e) {
      if (!dragging) return;
      if (e.type === "pointerup" && type !== "mouse" && !moved) fromEvent(e);
      dragging = false;
      stage.classList.remove("is-dragging");
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 4;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(pos - step);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") set(pos + step);
      else if (e.key === "Home") set(0);
      else if (e.key === "End") set(100);
      else return;
      e.preventDefault();
      stopHint();
    });

    // Petit mouvement d'invitation quand le comparateur apparaît.
    if (!reduced && hasGSAP && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        if (touched) return;
        var o = { p: pos };
        hint = window.gsap.timeline({ delay: 0.5, onUpdate: function () { set(o.p); } })
          .to(o, { p: 72, duration: 0.9, ease: "power2.inOut" })
          .to(o, { p: 30, duration: 1.1, ease: "power2.inOut" })
          .to(o, { p: 50, duration: 0.8, ease: "power2.inOut" });
      }, { threshold: 0.6 });
      io.observe(stage);
    }

    set(50);
    layout();
    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(stage);
    else window.addEventListener("resize", layout);
  })();

  /* ------------------------------------------------------------------------
     6. Réalisations : défilement de la capture au survol
     ------------------------------------------------------------------------ */
  function measureShot(view) {
    var img = view.querySelector("img");
    if (!img || !img.complete || !img.naturalWidth) return;
    var shift = img.getBoundingClientRect().height - view.getBoundingClientRect().height;
    view.style.setProperty("--shot-scroll", (shift > 0 ? -shift : 0) + "px");
  }
  $$("[data-scroll-shot]").forEach(function (view) {
    var img = view.querySelector("img");
    if (!img) return;
    img.addEventListener("load", function () { measureShot(view); });
    img.addEventListener("error", function () { view.classList.add("is-missing"); });
    measureShot(view);
  });
  window.addEventListener("resize", function () { $$("[data-scroll-shot]").forEach(measureShot); });
  $$(".phone__view img").forEach(function (img) {
    img.addEventListener("error", function () { img.parentElement.classList.add("is-missing"); });
  });

  /* ------------------------------------------------------------------------
     7. FAQ : ouverture animée
     ------------------------------------------------------------------------ */
  $$(".qa").forEach(function (d) {
    var summary = $("summary", d), body = $(".qa__body", d);
    if (!summary || !body || reduced || !body.animate) return;
    var anim = null;
    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      if (d.open) {
        d.classList.add("is-closing");
        anim = body.animate([{ height: body.offsetHeight + "px" }, { height: "0px" }], { duration: 380, easing: "cubic-bezier(.65,0,.35,1)" });
        anim.onfinish = function () { d.open = false; d.classList.remove("is-closing"); anim = null; };
      } else {
        d.open = true;
        anim = body.animate([{ height: "0px" }, { height: body.offsetHeight + "px" }], { duration: 440, easing: "cubic-bezier(.2,.75,.1,1)" });
        anim.onfinish = function () { anim = null; };
      }
    });
  });

  /* ------------------------------------------------------------------------
     8. Formulaire (Web3Forms)
     ------------------------------------------------------------------------ */
  (function initForm() {
    var form = $("[data-form]");
    if (!form) return;
    var key = $("[data-form-key]", form);
    var status = $("[data-form-status]", form);
    var done = $("[data-form-done]");
    var submit = $("[type=submit]", form);
    var email = C.email || "flavio@roviaagency.com";
    key.value = C.web3formsKey || "";

    function fail(msg) {
      status.textContent = msg;
      status.classList.add("is-error");
      submit.disabled = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.elements.botcheck && form.elements.botcheck.checked) return;
      if (!key.value) {
        fail("Le formulaire n’est pas encore activé. Écrivez-nous à " + email + ".");
        return;
      }
      submit.disabled = true;
      status.classList.remove("is-error");
      status.textContent = "Envoi en cours…";

      var data = new FormData(form);
      data.delete("redirect");
      fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.success) throw new Error("refus");
          form.hidden = true;
          done.hidden = false;
          done.focus();
        })
        .catch(function () {
          fail("L’envoi n’a pas fonctionné. Réessayez, ou écrivez-nous directement à " + email + ".");
        });
    });
  })();

  /* ------------------------------------------------------------------------
     9. Boutons aimantés (ordinateur uniquement)
     ------------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        b.style.transform = "translate(" + x * 0.16 + "px," + y * 0.28 + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
})();
