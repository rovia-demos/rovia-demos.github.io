// Interactions du modèle artisans v4 (sans dépendance).
(() => {
  document.documentElement.classList.add("js");

  // En-tête : transparent sur le hero, opaque ensuite
  const hd = document.querySelector(".hd");
  const hero = document.querySelector(".hero");
  const onScroll = () =>
    hd.classList.toggle("solid", window.scrollY > 40 && !document.body.classList.contains("mo"));
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menu mobile
  const burger = document.querySelector(".burger");
  const mnav = document.getElementById("mnav");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    mnav.classList.toggle("open", open);
    document.body.classList.toggle("mo", open);
    document.body.style.overflow = open ? "hidden" : "";
    onScroll();
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  mnav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mnav.classList.contains("open")) setMenu(false); });

  // Formulaire : en démo, confirmation sans envoi. Sinon, envoi natif (Netlify Forms).
  const form = document.querySelector("form[name^=devis]");
  if (form && document.body.dataset.demo === "1") {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.closest(".form").classList.add("sent");
    });
  }

  // Barre d'appel mobile : masquée tant que le formulaire ou le pied de page est visible
  const sticky = document.querySelector(".sticky");
  const hideOn = [document.getElementById("devis"), document.querySelector(".ft")].filter(Boolean);
  if (sticky && "IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((x) => (x.isIntersecting ? seen.add(x.target) : seen.delete(x.target)));
      sticky.classList.toggle("off", seen.size > 0);
    });
    hideOn.forEach((el) => io.observe(el));
  }

  // Vidéo : pas de lecture si mouvement réduit ou économie de données
  const video = hero && hero.querySelector("video");
  if (video && (matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData))) {
    video.removeAttribute("autoplay");
    video.pause();
  }

  // Avant / après : on fait glisser la séparation (doigt, souris ou clavier)
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".ba-box").forEach((box) => {
    const range = box.querySelector("input");
    const set = (v) => { v = Math.max(0, Math.min(100, v)); box.style.setProperty("--pos", v + "%"); range.value = v; };
    const fromX = (x) => { const r = box.getBoundingClientRect(); set(((x - r.left) / r.width) * 100); };
    let drag = false;
    box.addEventListener("pointerdown", (e) => { drag = true; box.setPointerCapture(e.pointerId); fromX(e.clientX); });
    box.addEventListener("pointermove", (e) => { if (drag) fromX(e.clientX); });
    box.addEventListener("pointerup", () => (drag = false));
    box.addEventListener("pointercancel", () => (drag = false));
    range.addEventListener("input", () => set(+range.value));
    // Petit balayage à la première apparition, pour montrer que ça se déplace
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([x]) => {
        if (!x.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t) => {
          if (drag) return;
          const k = Math.min(1, (t - t0) / 1600);
          set(50 + 30 * Math.sin(k * Math.PI * 2) * (1 - k));
          if (k < 1) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 500);
      }, { threshold: 0.6 });
      io.observe(box);
    }
  });

  // Apparition au défilement, avec filet de sécurité pour que rien ne reste invisible
  const els = [...document.querySelectorAll(".rv")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("on"); io.unobserve(x.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    els.forEach((e) => io.observe(e));
  } else {
    els.forEach((e) => e.classList.add("on"));
  }
  setTimeout(() => els.forEach((e) => { if (e.getBoundingClientRect().top < innerHeight) e.classList.add("on"); }), 1500);
})();
