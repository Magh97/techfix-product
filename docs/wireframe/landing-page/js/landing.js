/* ============================================================
   landing.js — Interactividad de la landing (100% offline)
   Iconos Lucide inline · menú móvil · scroll reveal ·
   contadores de métricas · nav con sombra · FAQ nativo
   ============================================================ */
(() => {
  "use strict";

  /* ---------- Iconos SVG (estilo Lucide, inline) ---------- */
  const ICONS = {
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    store: '<path d="M4 3h16l1 4H3z"/><path d="M4 7v12h16V7"/><path d="M8 7v4a4 4 0 0 0 8 0V7"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    cart: '<path d="M3 3h2l2.7 12h10L21 6H6"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5 6.5-5s6.5 1.5 6.5 5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.8M21 20c0-2.6-1.6-4.4-4.2-5"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 22V13"/>',
    truck: '<path d="M3 6h12v9H3zM15 9h4l2 3v3h-6z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    banknote: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    chart: '<path d="M5 20v-6M12 20V6M19 20v-9"/><path d="M3 20h18"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.9-.9L3 20l1.1-3.6a8.3 8.3 0 0 1-.6-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "arrow-right": '<path d="M5 12h14M12 5l7 7-7 7"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v4"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
  };
  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  function injectIcons() {
    document.querySelectorAll("i[data-icon]").forEach((el) => {
      const name = el.dataset.icon;
      const path = ICONS[name] || "";
      if (!path) return;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = path;
      svg.appendChild(g);
      el.appendChild(svg);
    });
  }

  /* ---------- Navbar: sombra al hacer scroll + menú móvil ---------- */
  const nav = document.getElementById("nav");
  const navLinks = document.getElementById("navLinks");
  const menuBtn = document.getElementById("menuBtn");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  function closeMenu() {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML = "";
  }
  menuBtn.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.innerHTML = open ? iconMarkup("x") : iconMarkup("menu");
  });
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".l-nav")) closeMenu();
  });
  function iconMarkup(name) {
    const p = ICONS[name];
    return p ? `<svg ${ICON_ATTRS}>${p}</svg>` : "";
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = () => {
    const el = document.createElement("span");
    document.querySelectorAll(".l-section, .l-cta, .l-hero").forEach((s) => {
      s.classList.add("reveal");
      const children = s.querySelectorAll(":scope > .container > *");
      children.forEach((c, i) => { c.classList.add("reveal"); c.style.transitionDelay = Math.min(i * 60, 240) + "ms"; });
      if (s.classList.contains("l-hero")) s.classList.remove("reveal");
    });
  };
  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- Contadores de métricas ---------- */
  function initCounters() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        const target = parseInt(el.dataset.count, 10);
        if (reduced) { el.textContent = target; return; }
        const dur = 1100, start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---------- FAQ: expansión animada + cerrar los demás ---------- */
  function initFaq() {
    const details = Array.from(document.querySelectorAll("#faqList details"));
    if (!details.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const EASE = "cubic-bezier(.16, 1, .3, 1)";
    const timers = new WeakMap();
    const bodyOf = (d) => d.querySelector(".faq-body");

    function measureLater(b, fn) {
      requestAnimationFrame(() => requestAnimationFrame(() => fn(b.scrollHeight)));
    }

    function expand(d) {
      const b = bodyOf(d);
      if (reduced) return;
      if (timers.get(b)) clearTimeout(timers.get(b));
      measureLater(b, (h) => {
        b.style.overflow = "hidden";
        b.style.height = "0px";
        b.offsetHeight;
        b.style.transition = `height .34s ${EASE}`;
        b.style.height = h + "px";
        timers.set(b, setTimeout(() => { b.style.height = "auto"; b.style.overflow = ""; }, 420));
      });
    }

    function collapse(d) {
      const b = bodyOf(d);
      if (reduced) { d.open = false; b.style.height = ""; return; }
      if (timers.get(b)) clearTimeout(timers.get(b));
      b.style.overflow = "hidden";
      b.style.height = b.scrollHeight + "px";
      b.offsetHeight;
      b.style.transition = `height .28s ${EASE}`;
      b.style.height = "0px";
      timers.set(b, setTimeout(() => {
        d.open = false;
        b.style.height = "";
        b.style.overflow = "";
        b.style.transition = "";
      }, 330));
    }

    details.forEach((d) => {
      d.querySelector("summary").addEventListener("click", (e) => {
        if (d.open) {
          e.preventDefault();
          collapse(d);
        } else {
          e.preventDefault();
          details.forEach((o) => { if (o !== d && o.open) collapse(o); });
          d.open = true;
          expand(d);
        }
      });
    });
  }

  /* ---------- Toast (minimalista, por tipo) ---------- */
  const TOAST_ICONS = { success: "check-circle", error: "alert", info: "info" };
  function toast(title, msg, type = "success") {
    const t = TOAST_ICONS[type] ? type : "success";
    const root = document.getElementById("toastRoot");
    const el = document.createElement("div");
    el.className = "toast " + t;
    el.setAttribute("role", t === "error" ? "alert" : "status");
    el.innerHTML = `<i class="luc">${iconMarkup(TOAST_ICONS[t])}</i><div class="toast-text"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 200); }, 3800);
  }

  /* ---------- Formulario de contacto ---------- */
  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = (document.getElementById("cfNombre").value || "").trim();
      const tel = (document.getElementById("cfTel").value || "").trim();
      const msg = (document.getElementById("cfMsg").value || "").trim();
      if (!nombre || !tel || !msg) { toast("Faltan datos", "Completa nombre, teléfono y tu mensaje.", "error"); return; }
      toast("Mensaje enviado", "Gracias, te contactamos pronto (simulado).", "success");
      form.reset();
    });
  }

  function init() {
    injectIcons();
    closeMenu();
    onScroll();
    revealEls();
    initReveal();
    initCounters();
    initFaq();
    initContactForm();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { if (innerWidth > 768) closeMenu(); });
  }
  init();
})();
