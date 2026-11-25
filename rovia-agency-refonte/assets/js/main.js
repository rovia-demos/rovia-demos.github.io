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
    if (typeof v === "number") el.textContent = new Intl.NumberFormat("fr-FR").format(v) + " €";
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
      $$("[data-reveal]").forEach(function (el) { revealIO.observe(el); });
    }
  } else {
    html.classList.remove("js-anim");
  }

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
