/* ==========================================================================
   Trait lumineux qui suit la souris dans le hero.
   Ordinateur uniquement : désactivé sur écran tactile, petit écran,
   et si l'utilisateur a demandé moins d'animations.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-trail]");
  if (!canvas || !canvas.getContext) return;

  var desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!desktop.matches || reduced.matches) return;

  var hero = canvas.closest("[data-hero]") || canvas.parentElement;
  var ctx = canvas.getContext("2d");
  document.documentElement.classList.add("has-trail");

  var BLUE = "35, 166, 255";
  var CORE = "190, 228, 255";
  var MAX_POINTS = 44;

  var w = 0, h = 0, dpr = 1;
  var points = [];
  var target = { x: 0, y: 0 };
  var head = { x: 0, y: 0 };
  var vel = { x: 0, y: 0 };
  var energy = 0;
  var pointerInside = false;
  var lastMove = 0;
  var running = false;
  var intro = null;

  function resize() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function localPoint(e) {
    var r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var p = localPoint(e);
    intro = null;
    if (!pointerInside && energy < 0.05) {
      head.x = p.x; head.y = p.y; vel.x = vel.y = 0; points.length = 0;
    }
    pointerInside = true;
    target.x = p.x; target.y = p.y;
    lastMove = performance.now();
    start();
  });
  hero.addEventListener("pointerleave", function () { pointerInside = false; });

  // Petit passage automatique au chargement, pour montrer l'effet sans bouger la souris.
  function playIntro() {
    var t0 = performance.now();
    var p0 = { x: w * 1.02, y: h * 0.18 };
    var p1 = { x: w * 0.62, y: h * 0.02 };
    var p2 = { x: w * 0.78, y: h * 0.95 };
    var p3 = { x: w * 0.4, y: h * 1.05 };
    head.x = p0.x; head.y = p0.y;
    intro = function (now) {
      var t = Math.min((now - t0) / 2600, 1);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var u = 1 - e;
      target.x = u * u * u * p0.x + 3 * u * u * e * p1.x + 3 * u * e * e * p2.x + e * e * e * p3.x;
      target.y = u * u * u * p0.y + 3 * u * u * e * p1.y + 3 * u * e * e * p2.y + e * e * e * p3.y;
      lastMove = now;
      if (t >= 1) intro = null;
    };
    start();
  }

  function frame(now) {
    if (intro) intro(now);

    // Ressort : la tête du trait suit la cible avec un peu d'inertie.
    vel.x = (vel.x + (target.x - head.x) * 0.16) * 0.74;
    vel.y = (vel.y + (target.y - head.y) * 0.16) * 0.74;
    head.x += vel.x; head.y += vel.y;

    points.unshift({ x: head.x, y: head.y });
    if (points.length > MAX_POINTS) points.pop();

    var idle = now - lastMove;
    var goal = intro ? 1 : pointerInside ? (idle < 900 ? 1 : 0.35) : 0;
    energy += (goal - energy) * 0.06;

    draw();

    if (!pointerInside && !intro && energy < 0.004) {
      running = false;
      ctx.clearRect(0, 0, w, h);
      points.length = 0;
      return;
    }
    requestAnimationFrame(frame);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var n = points.length;
    if (n < 3 || energy < 0.004) return;

    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (var pass = 0; pass < 3; pass++) {
      for (var i = 1; i < n - 1; i++) {
        var a = points[i - 1], b = points[i], c = points[i + 1];
        var f = 1 - i / n; // 1 à la tête, 0 en bout de traîne
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
        if (pass === 0) {
          ctx.strokeStyle = "rgba(" + BLUE + "," + (0.05 * f * energy) + ")";
          ctx.lineWidth = 34 * f + 6;
        } else if (pass === 1) {
          ctx.strokeStyle = "rgba(" + BLUE + "," + (0.22 * f * energy) + ")";
          ctx.lineWidth = 7 * f + 1.5;
        } else {
          ctx.strokeStyle = "rgba(" + CORE + "," + (0.9 * f * f * energy) + ")";
          ctx.lineWidth = 2 * f + 0.4;
        }
        ctx.stroke();
      }
    }

    var r = 150;
    var g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r);
    g.addColorStop(0, "rgba(" + BLUE + "," + (0.16 * energy) + ")");
    g.addColorStop(1, "rgba(" + BLUE + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(head.x - r, head.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = "source-over";
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { pointerInside = false; intro = null; }
  });

  if (document.readyState === "complete") setTimeout(playIntro, 700);
  else window.addEventListener("load", function () { setTimeout(playIntro, 700); });
})();
