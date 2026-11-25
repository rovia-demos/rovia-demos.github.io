/* ==========================================================================
   Rovia : interactions du site
   ========================================================================== */
(function () {
  "use strict";
  window.ROVIA_READY = true;

  var C = window.ROVIA || {};
  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

  /* 1. Réglages (assets/js/config.js) injectés dans la page --------------- */
  $$("[data-rovia]").forEach(function (el) {
    var v = C[el.getAttribute("data-rovia")];
    if (v !== undefined && v !== null && v !== "") el.textContent = v;
  });

  $$("[data-rovia-price]").forEach(function (el) {
    var v = C[el.getAttribute("data-rovia-price")];
    if (typeof v === "number") el.textContent = new Intl.NumberFormat("fr-FR").format(v).replace(/\u202f/g, "\u00a0") + "\u00a0€";
  });

  if (C.email) {
    $$("[data-rovia-email]").forEach(function (a) {
      a.href = "mailto:" + C.email;
      if (a.textContent.indexOf("@") > -1) a.textContent = C.email;
    });
  }

  var year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* 2. En-tête, menu mobile, bouton fixe ----------------------------------- */
  var header = $("[data-header]");
  var toggle = $("[data-menu-toggle]");
  var menu = $("[data-menu]");
  var mobileCta = $("[data-mobile-cta]");
  var menuOpen = false;

  // Fond de l'en-tête dès qu'on quitte le haut de page (sans écouter le défilement).
  var topSentinel = document.createElement("div");
  topSentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none";
  document.body.prepend(topSentinel);

  function setMenu(open) {
    if (!menu || !toggle || open === menuOpen) return;
    menuOpen = open;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".menu-toggle__label").textContent = open ? "Fermer" : "Menu";
    html.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    updateMobileCta();
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!menuOpen); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuOpen) { setMenu(false); toggle.focus(); }
  });
  // Seule la largeur compte : la barre d'adresse du téléphone ne change que la hauteur.
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    html.style.setProperty("--vh", window.innerHeight / 100 + "px");
    if (lastW > 900) setMenu(false);
  });

  // Le bouton fixe n'apparaît qu'une fois les boutons du haut dépassés, et se cache sur le formulaire et le pied de page.
  var actionsAbove = true, endVisible = false;
  function updateMobileCta() {
    if (mobileCta) mobileCta.classList.toggle("is-visible", !actionsAbove && !endVisible && !menuOpen);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      if (header) header.classList.toggle("is-scrolled", !en[0].isIntersecting);
    }).observe(topSentinel);

    var heroActions = $("[data-hero-actions]");
    if (heroActions) new IntersectionObserver(function (en) {
      actionsAbove = en[0].isIntersecting || en[0].boundingClientRect.top > 0;
      updateMobileCta();
    }).observe(heroActions);

    var ends = [$("#contact"), $(".site-footer")].filter(Boolean);
    var endState = new Map();
    var endIO = new IntersectionObserver(function (en) {
      en.forEach(function (x) { endState.set(x.target, x.isIntersecting); });
      endVisible = Array.from(endState.values()).some(Boolean);
      updateMobileCta();
    });
    ends.forEach(function (el) { endIO.observe(el); });

    /* 3. Apparition douce des blocs ---------------------------------------- */
    if (!reduced) {
      var revealIO = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          x.target.classList.add("is-in");
          revealIO.unobserve(x.target);
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      $$("[data-reveal], [data-step-card]").forEach(function (el) { revealIO.observe(el); });
    }
  } else {
    html.classList.remove("js-anim");
  }

  // Joue une fonction en boucle seulement quand l'élément est à l'écran.
  function whenVisible(el, onShow, onHide) {
    if (!("IntersectionObserver" in window)) return onShow();
    new IntersectionObserver(function (en) { en[0].isIntersecting ? onShow() : onHide(); }, { threshold: 0.25 }).observe(el);
  }

  /* 4. Notifications d'exemple du haut de page ---------------------------- */
  (function initToasts() {
    var wrap = $("[data-toasts]");
    if (!wrap || reduced) return;
    var toasts = $$(".toast", wrap), i = 0, timer = null;
    function next() {
      toasts[i].classList.remove("is-active");
      i = (i + 1) % toasts.length;
      toasts[i].classList.add("is-active");
    }
    whenVisible(wrap, function () { if (!timer) timer = setInterval(next, 3400); },
      function () { clearInterval(timer); timer = null; });
  })();

  /* 5. « Ce que votre site fait pour vous » : onglets + parcours animé --- */
  (function initJobs() {
    var panel = $(".jobs__panel");
    if (!panel) return;
    var buttons = $$("[data-job]", panel);
    var items = $$("[data-step]", panel);
    var current = 0, timer = null, paused = false, lights = [];

    function setActive(n) {
      current = n;
      buttons.forEach(function (b, k) {
        b.classList.toggle("is-active", k === n);
        b.setAttribute("aria-pressed", String(k === n));
      });
      lights.forEach(clearTimeout); lights = [];
      var delay = 0;
      items.forEach(function (el) {
        var s = +el.getAttribute("data-step");
        if (s < n || reduced) { el.classList.toggle("is-lit", s <= n); return; }
        el.classList.remove("is-lit");
        if (s === n) {
          lights.push(setTimeout(function () { el.classList.add("is-lit"); }, delay));
          delay += 450;
        }
      });
      // Relance la barre de progression de l'onglet actif.
      panel.classList.remove("is-playing");
      void panel.offsetWidth;
      if (timer) panel.classList.add("is-playing");
    }
    function start() {
      if (reduced || timer || paused) return;
      timer = setInterval(function () { setActive((current + 1) % buttons.length); }, 5500);
      panel.classList.add("is-playing");
    }
    function stop() { clearInterval(timer); timer = null; panel.classList.remove("is-playing"); }

    buttons.forEach(function (b, k) { b.addEventListener("click", function () { stop(); setActive(k); start(); }); });
    panel.addEventListener("pointerenter", function () { paused = true; stop(); });
    panel.addEventListener("pointerleave", function () { paused = false; start(); });
    panel.addEventListener("focusin", function () { paused = true; stop(); });
    panel.addEventListener("focusout", function () { paused = false; start(); });

    setActive(0);
    whenVisible(panel, function () { setActive(current); start(); }, stop);
  })();

  // Les liens du menu ferment le menu.
  if (menu) menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });

  /* 4. Formulaire (Web3Forms) ---------------------------------------------- */
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
        fail("Le formulaire n’est pas encore activé. Écrivez-moi à " + email + ".");
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
          fail("L’envoi n’a pas fonctionné. Réessayez, ou écrivez-moi directement à " + email + ".");
        });
    });
  })();
})();
