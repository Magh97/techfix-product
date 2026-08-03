/* ============================================================
   app.js — Router SPA, vistas, flujos e interactividad
   100% offline · datos en memoria (data.js)
   ============================================================ */
(() => {
  "use strict";

  /* ---------------- Íconos SVG (estilo Lucide, inline) ---------------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    cart: '<path d="M3 3h2l2.7 12h10L21 6H6"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5 6.5-5s6.5 1.5 6.5 5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.8M21 20c0-2.6-1.6-4.4-4.2-5"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 22V13"/>',
    truck: '<path d="M3 6h12v9H3zM15 9h4l2 3v3h-6z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    banknote: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    dollar: '<path d="M12 3v18M15 6H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7"/>',
    chart: '<path d="M5 20v-6M12 20V6M19 20v-9"/><path d="M3 20h18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    'file-down': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 12v6M9 15l3 3 3-3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trendUp: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    trendDown: '<path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
    filter: '<path d="M22 3H2l8 9v7l4 2v-9z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    flag: '<path d="M4 22V4a2 2 0 0 1 2-2h12l-3 5 3 5H6"/>',
  };
  function icon(name, size = 18) {
    const p = ICONS[name];
    if (!p) return "";
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  /* ---------------- Estado ---------------- */
  DB.EGRESOS = DB.EGRESOS || [];
  const state = {
    user: null,
    role: "admin",
    theme: localStorage.getItem("wf-theme") || "light",
    cart: [],
    modalStack: 0,
  };
  const $ = (s) => document.querySelector(s);
  const viewEl = $("#view");
  const RETRASADAS = () => DB.ORDENES.filter((o) => folioRetraso(o)).length;
  const STOCK_BAJO = () => DB.PRODUCTS.filter((p) => p.isActive !== false && p.stock <= p.stockMin).length;
  const VENTAS_HOY = () => DB.VENTAS.filter((v) => v.fecha.slice(0, 10) === "2026-08-03");
  const ORDENES_ACTIVAS = () => DB.ORDENES.filter((o) => !["entregado", "cancelado"].includes(o.estado));

  /* ---------------- Toasts ---------------- */
  function toast(title, msg, type = "info") {
    const root = $("#toastRoot");
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = `<div>${icon(type === "success" ? "check-circle" : type === "error" ? "alert" : type === "warning" ? "alert" : "info", 18)}</div>
      <div><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 200); }, 4200);
  }

  /* ---------------- Modales ---------------- */
  function openModal(html, opts = {}) {
    const root = $("#modalRoot");
    root.innerHTML = `
      <div class="modal-overlay" data-act="close-modal"></div>
      <div class="modal ${opts.size || ""}" role="dialog" aria-modal="true" aria-label="${opts.label || "Ventana"}">
        ${html}
      </div>`;
    root.hidden = false;
    document.body.classList.add("modal-open");
    state.modalStack++;
    const focusable = root.querySelector("input,select,textarea,button,[tabindex]");
    if (focusable) focusable.focus();
  }
  function closeModal() {
    $("#modalRoot").hidden = true;
    $("#modalRoot").innerHTML = "";
    document.body.classList.remove("modal-open");
    state.modalStack = 0;
  }
  function modalShell(title, body, footer, opts = {}) {
    return `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn btn-ghost btn-icon sm" data-act="close-modal" aria-label="Cerrar">${icon("x", 18)}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ""}`;
  }

  /* ---------------- Badges de estado ---------------- */
  const EST_META = {
    pendiente: ["Pendiente", "badge-neutral"],
    en_diagnostico: ["Diagnóstico", "badge-info"],
    cotizado: ["Cotizado", "badge-warning"],
    en_reparacion: ["En reparación", "badge-info"],
    listo: ["Listo", "badge-success"],
    entregado: ["Entregado", "badge-success"],
    cancelado: ["Cancelado", "badge-danger"],
  };
  function estadoBadge(estado, retrasada = false) {
    const [lbl, cls] = EST_META[estado] || [estado, "badge-neutral"];
    const isRet = retrasada && !["entregado", "cancelado"].includes(estado);
    if (isRet) return `<span class="badge badge-danger badge-pulse">${icon("alert", 12)} Retrasada</span>`;
    return `<span class="badge ${cls}"><span class="dot"></span>${lbl}</span>`;
  }

  /* ---------------- Navegación y routing ---------------- */
  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin", "vendedor"] },
    { id: "venta", label: "Punto de Venta", icon: "cart", roles: ["admin", "vendedor"], shortcut: "F1" },
    { id: "ordenes", label: "Órdenes de Servicio", icon: "clipboard", roles: ["admin", "vendedor", "tecnico"], badge: () => RETRASADAS() },
    { id: "clientes", label: "Clientes", icon: "users", roles: ["admin", "vendedor"] },
    { id: "productos", label: "Productos", icon: "package", roles: ["admin", "vendedor", "tecnico"] },
    { id: "compras", label: "Compras", icon: "truck", roles: ["admin"] },
    { id: "caja", label: "Caja", icon: "banknote", roles: ["admin", "vendedor"] },
    { id: "finanzas", label: "Finanzas", icon: "dollar", roles: ["admin"] },
    { id: "reportes", label: "Reportes", icon: "chart", roles: ["admin"] },
    { id: "configuracion", label: "Configuración", icon: "settings", roles: ["admin"] },
  ];

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "").split("?")[0];
    const parts = h.split("/").filter(Boolean);
    return [parts[0] || "dashboard", parts[1] || null];
  }
  function go(path) { location.hash = "#/" + path.replace(/^\/+/, ""); }
  function renderChrome() {
    const u = state.user;
    if (!u) { document.body.classList.add("logged-out"); return; }
    document.body.classList.remove("logged-out");
    const navItems = NAV.filter((n) => n.roles.includes(state.role));
    $("#brandLogo").innerHTML = icon("cpu", 22);
    $("#sidebarNav").innerHTML = navItems
      .map((n) => {
        const active = (parseHash()[0] === n.id) || (n.id === "ordenes" && parseHash()[0] === "ordenes");
        const badge = n.badge && n.badge() > 0 ? `<span class="nav-badge">${n.badge()}</span>` : "";
        return `<button class="nav-item ${active ? "active" : ""}" data-nav="${n.id}" aria-current="${active ? "page" : "false"}">
          <span class="nav-icon">${icon(n.icon, 18)}</span>${n.label}${badge}</button>`;
      })
      .join("");
    if (u) {
      $("#sideAvatar").textContent = u.inicial;
      $("#sideUserName").textContent = u.nombre;
      $("#sideUserRole").textContent = u.rol;
    }
    const hoy = VENTAS_HOY();
    const totHoy = hoy.reduce((a, v) => a + v.total, 0);
    $("#cajaChip").innerHTML = `${icon("banknote", 14)} ${DB.CAJA.estado === "abierta" ? "Caja abierta" : "Caja cerrada"} · ${fmtMXN(totHoy)}`;
    $("#themeToggle").innerHTML = icon(state.theme === "dark" ? "sun" : "moon", 18);
    $("#roleSwitch").innerHTML = ["admin", "vendedor", "tecnico"]
      .map((r) => `<button class="btn btn-outline ${state.role === r ? "active" : ""}" data-act="switch-role" data-role="${r}">${r}</button>`)
      .join("");
    $("#headerUser").innerHTML = `<span class="avatar sm">${u ? u.inicial : "?"}</span> ${u ? u.nombre.split(" ")[0] : ""}`;
  }

  function showSkeleton(name) {
    viewEl.innerHTML = `<div class="stack">
      <div class="skeleton" style="height:28px;width:220px"></div>
      <div class="grid grid-4">
        ${Array(4).fill('<div class="skeleton" style="height:96px"></div>').join("")}
      </div>
      <div class="skeleton" style="height:240px"></div>
    </div>`;
  }

  function render() {
    const [name, param] = parseHash();
    if (!state.user && name !== "login") { go("login"); return; }
    if (state.user && name === "login") { go("dashboard"); return; }
    renderChrome();
    const route = ROUTES[name] || ROUTES.dashboard;
    showSkeleton(name);
    setTimeout(() => {
      const res = route(param);
      viewEl.innerHTML = `<div class="view-enter">${res.html}</div>`;
      window.scrollTo(0, 0);
      if (res.after) res.after(viewEl);
    }, 340);
  }

  window.addEventListener("hashchange", render);

  /* ---------------- Acciones globales ---------------- */
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { go(nav.dataset.nav); return; }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.dataset.act;
    if (a === "logout") { state.user = null; go("login"); toast("Sesión cerrada", "Hasta pronto.", "info"); }
    else if (a === "close-modal") closeModal();
    else if (a === "theme-toggle") toggleTheme();
    else if (a === "sidebar-toggle") $("#sidebar").classList.toggle("open");
    else if (a === "switch-role") switchRole(act.dataset.role);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.modalStack > 0) closeModal();
    if (e.key === "F1") { e.preventDefault(); go("venta"); }
    if (e.key === "F2" && parseHash()[0] === "venta") { e.preventDefault(); const b = viewEl.querySelector("[data-act='cobrar']"); if (b) b.click(); }
  });

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("wf-theme", state.theme);
    renderChrome();
  }
  function switchRole(role) {
    state.role = role;
    state.user = DB.USERS.find((u) => u.rol === role);
    toast("Rol cambiado", `Ahora operas como ${role} (${state.user.nombre}).`, "info");
    const [name] = parseHash();
    if (!NAV.find((n) => n.id === name)?.roles.includes(role)) go("dashboard");
    else render();
  }
  function login(role) {
    state.role = role;
    state.user = DB.USERS.find((u) => u.rol === role);
    toast("Bienvenido", `${state.user.nombre} · rol ${role}.`, "success");
    go("dashboard");
  }

  /* ---------------- Utilidades de negocio ---------------- */
  function moverStock(productoId, cantidad, tipo, motivo) {
    const p = getProducto(productoId);
    if (p) p.stock += cantidad;
    DB.MOVIMIENTOS.unshift({
      id: nextId(),
      productoId, tipo, cantidad,
      fecha: new Date().toISOString(),
      usuario: state.user ? state.user.nombre : "Sistema",
      motivo,
    });
  }
  let _seq = 1000;
  function nextId() { return ++_seq; }
  function nextFolio(prefix, list) { return `${prefix}-${String(list.length + 1).padStart(4, "0")}`; }
  function nextFolioOrden() {
    const max = DB.ORDENES.reduce((a, o) => Math.max(a, parseInt(o.folio.split("-")[1], 10) || 0), 0);
    return `2026-${String(max + 1).padStart(4, "0")}`;
  }
  function registrarHistorial(orden, estado, nota) {
    orden.historial.push({ estado, usuarioId: state.user.id, fecha: new Date().toISOString(), nota });
  }
  function transicionOrden(orden, nuevoEstado, nota) {
    if (["entregado", "cancelado"].includes(orden.estado)) {
      toast("Acción no permitida", `La orden ya está en estado ${orden.estado}.`, "error");
      return false;
    }
    orden.estado = nuevoEstado;
    orden.retrasada = folioRetraso(orden);
    registrarHistorial(orden, nuevoEstado, nota);
    if (nuevoEstado === "entregado") orden.fechaEntrega = new Date().toISOString().slice(0, 10);
    toast("Estado actualizado", `Orden ${orden.folio} → ${EST_META[nuevoEstado][0]}.`, "success");
    render();
    return true;
  }

  /* ============================================================
     VISTA: LOGIN
     ============================================================ */
  const ROUTES = {
    login() {
      return {
        html: `
        <div class="login-screen">
          <div class="card login-card">
            <div class="card-body">
              <div class="brand-row">
                <span class="brand-logo" style="width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#16A34A,#3B82F6);color:#fff">${icon("cpu", 26)}</span>
                <div>
                  <h2 style="margin:0">TechStore</h2>
                  <div class="muted">Sistema de Administración · Wireframe</div>
                </div>
              </div>
              <div class="field">
                <label class="label" for="loginUser">Usuario</label>
                <input class="input" id="loginUser" value="maria" autocomplete="username" />
              </div>
              <div class="field">
                <label class="label" for="loginPass">Contraseña</label>
                <input class="input" type="password" id="loginPass" value="demo1234" autocomplete="current-password" />
              </div>
              <div class="field">
                <span class="label">Entrar como (demo)</span>
                <div class="login-roles">
                  ${DB.USERS.map((u) => `
                    <button class="role-option" data-act="login-role" data-role="${u.rol}" data-id="${u.id}">
                      <div style="margin-bottom:6px">${icon(u.rol === "admin" ? "shield" : u.rol === "vendedor" ? "cart" : "clipboard", 20)}</div>
                      <strong>${u.nombre.split(" ")[0]}</strong>
                      <small>${u.rol}</small>
                    </button>`).join("")}
                </div>
              </div>
              <button class="btn btn-primary btn-lg btn-block" data-act="login-submit">${icon("logout", 16)} Ingresar</button>
              <p class="hint" style="margin-top:12px;text-align:center">Prototipo offline · datos en memoria · cambios no persisten</p>
              <p style="margin:10px 0 0;text-align:center"><a href="../landing-page/index.html">¿Qué es TechStore? Ver landing →</a></p>
            </div>
          </div>
        </div>`,
        after(root) {
          root.querySelectorAll("[data-act='login-role']").forEach((b) =>
            b.addEventListener("click", () => login(b.dataset.role)));
          root.querySelector("[data-act='login-submit']").addEventListener("click", () => login("admin"));
          root.querySelector("#loginUser").addEventListener("keydown", (e) => { if (e.key === "Enter") login("admin"); });
        },
      };
    },

    /* ============================================================
       VISTA: DASHBOARD
       ============================================================ */
    dashboard() {
      const ventas = VENTAS_HOY();
      const totHoy = ventas.reduce((a, v) => a + v.total, 0);
      const ret = DB.ORDENES.filter((o) => folioRetraso(o));
      const bajos = DB.PRODUCTS.filter((p) => p.isActive !== false && p.stock <= p.stockMin);
      const lineData = [
        { label: "28 jul", value: 8200 }, { label: "29 jul", value: 9600 }, { label: "30 jul", value: 7400 },
        { label: "31 jul", value: 11200 }, { label: "1 ago", value: 9800 }, { label: "2 ago", value: 13200 }, { label: "Hoy", value: totHoy },
      ];
      const metodos = [];
      ["efectivo", "tarjeta_debito", "tarjeta_credito", "transferencia"].forEach((m) => {
        const tot = ventas.filter((v) => v.metodoPago === m).reduce((a, v) => a + v.total, 0);
        if (tot > 0) metodos.push({ label: m.replace("_", " "), value: tot, color: Charts.COLORS.accent });
      });
      metodos[0] && (metodos[0].color = Charts.COLORS.primary);

      return {
        html: `
        <div class="stack">
          <div class="row-between">
            <div>
              <h1>Buen día, ${state.user.nombre.split(" ")[0]}</h1>
              <div class="muted">Hoy · ${new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <div class="row-flex">
              <button class="btn btn-primary" data-nav="venta">${icon("plus", 16)} Nueva venta</button>
              <button class="btn btn-outline" data-nav="ordenes">${icon("clipboard", 16)} Nueva orden</button>
            </div>
          </div>

          <div class="grid grid-4">
            <div class="card kpi-card">
              <span class="kpi-label">${icon("dollar", 14)} Ventas hoy</span>
              <span class="kpi-value">${fmtMXN(totHoy)}</span>
              <span class="kpi-sub kpi-trend-up">${icon("trendUp", 13)} ${ventas.length} tickets</span>
            </div>
            <div class="card kpi-card">
              <span class="kpi-label">${icon("clipboard", 14)} Órdenes activas</span>
              <span class="kpi-value">${ORDENES_ACTIVAS().length}</span>
              <span class="kpi-sub muted">${DB.ORDENES.length} totales</span>
            </div>
            <div class="card kpi-card">
              <span class="kpi-label">${icon("alert", 14)} Retrasadas</span>
              <span class="kpi-value ${ret.length ? "danger-text" : ""}">${ret.length}</span>
              <span class="kpi-sub ${ret.length ? "kpi-trend-down" : "muted"}">${ret.length ? "requieren atención" : "sin retrasos"}</span>
            </div>
            <div class="card kpi-card">
              <span class="kpi-label">${icon("package", 14)} Stock bajo</span>
              <span class="kpi-value ${bajos.length ? "warning-text" : ""}">${bajos.length}</span>
              <span class="kpi-sub muted">productos bajo mínimo</span>
            </div>
          </div>

          ${ret.length ? `<div class="alert-error">${icon("alert", 18)} <div><strong>${ret.length} orden(es) retrasada(s)</strong><div>Se notificó por WhatsApp/correo (NOT-01). ${ret.map((o) => o.folio).join(", ")}</div></div></div>` : ""}
          ${bajos.length ? `<div class="alert-warning">${icon("alert", 18)} <div><strong>Reabastecimiento sugerido</strong><div>${bajos.map((p) => p.nombre).join(" · ")}</div></div></div>` : ""}

          <div class="grid grid-2">
            <div class="card card-pad">
              <div class="row-between" style="margin-bottom:10px">
                <h3>Ventas · últimos 7 días</h3>
                <button class="btn btn-ghost btn-sm" data-nav="reportes">Ver reporte ${icon("chevronRight", 14)}</button>
              </div>
              <div class="chart-box" data-chart="line"></div>
            </div>
            <div class="card card-pad">
              <h3>Ventas hoy por método</h3>
              <div class="grid grid-2" style="align-items:center">
                <div class="chart-box" data-chart="donut"></div>
                <div class="chart-legend">
                  ${metodos.map((m) => `<span class="lg-item"><span class="lg-dot" style="background:${m.color}"></span>${m.label} · ${fmtMXN(m.value)}</span>`).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>`,
        after(root) {
          Charts.lineChart(root.querySelector("[data-chart='line']"), lineData, { label: "Ventas por día", stroke: Charts.COLORS.primary, fill: Charts.COLORS.primary });
          if (metodos.length) Charts.donutChart(root.querySelector("[data-chart='donut']"), metodos, { label: "Ventas por método", centerLabel: "Hoy" });
        },
      };
    },

    /* ============================================================
       VISTA: POS / VENTA
       ============================================================ */
    venta() {
      return {
        html: `
        <div class="pos-layout">
          <div>
            <div class="row-between" style="margin-bottom:14px">
              <h1>Punto de Venta</h1>
              <span class="chip">${icon("banknote", 14)} ${DB.CAJA.estado === "abierta" ? "Caja abierta" : "Caja cerrada"}</span>
            </div>
            <div class="pos-search-row">
              <input class="input mono" id="barcode" placeholder="Escanea código de barras o escribe SKU… (Enter)" aria-label="Código de barras" />
              <input class="input" id="busqueda" placeholder="Buscar producto por nombre…" aria-label="Buscar producto" />
            </div>
            <div class="alert-info" style="margin-bottom:12px">${icon("info", 16)} <span>Ventas a <strong>crédito</strong> verifican límite del cliente (default ${fmtMXN(DB.CONFIG.limiteCreditoDefault)}). Descuentos ≤10% para vendedor; >10% requiere admin.</span></div>
            <div class="card">
              <div class="table-wrap">
                <table class="tbl" id="prodTable">
                  <thead><tr><th>SKU</th><th>Producto</th><th>Cat.</th><th class="num">Precio</th><th class="num">Stock</th><th></th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card pos-cart">
            <div class="card-header"><h3>${icon("cart", 18)} Carrito</h3><span class="chip" id="cartCount">0 ítems</span></div>
            <div class="cart-items" id="cartItems"></div>
            <div class="card-body">
              <div class="cart-total-row"><span>Subtotal (neto)</span><span id="cSubtotal">$0.00</span></div>
              <div class="cart-total-row">
                <span>Descuento</span>
                <span style="display:flex;align-items:center;gap:6px">
                  <input class="input" id="cDesc" type="number" min="0" step="0.01" value="0" style="width:110px;padding:5px 8px" aria-label="Descuento en pesos" />
                </span>
              </div>
              <div class="cart-total-row"><span>IVA (${DB.CONFIG.iva}%)</span><span id="cIva">$0.00</span></div>
              <div class="cart-total-row grand"><span>Total</span><span id="cTotal">$0.00</span></div>
              <div class="hint" id="cDescHint" style="color:var(--danger);display:none">Descuento >10% requiere rol admin.</div>
              <div class="cart-actions">
                <button class="btn btn-outline" data-act="add-servicio">${icon("plus", 16)} Servicio</button>
                <button class="btn btn-primary btn-lg" data-act="cobrar">${icon("check", 16)} Cobrar</button>
              </div>
            </div>
          </div>
        </div>`,
        after(root) {
          const barcode = root.querySelector("#barcode");
          const busqueda = root.querySelector("#busqueda");
          barcode.focus();

          function renderTabla() {
            const q = busqueda.value.toLowerCase().trim();
            const cod = barcode.value.toLowerCase().trim();
            const list = DB.PRODUCTS.filter((p) => p.isActive !== false)
              .filter((p) => (!q || p.nombre.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q)) && (!cod || p.sku.toLowerCase() === cod || (p.codigo && p.codigo === cod)));
            const tb = root.querySelector("#prodTable tbody");
            if (!list.length) {
              tb.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">${icon("package", 34)}</div><strong>Sin resultados</strong><span>Prueba con otro nombre o SKU.</span></div></td></tr>`;
              return;
            }
            tb.innerHTML = list.map((p) => `
              <tr class="${p.stock <= 0 ? "row-danger" : ""}">
                <td class="mono muted">${p.sku}</td>
                <td><strong>${p.nombre}</strong><div class="muted" style="font-size:12px">${p.marca} ${p.modelo}</div></td>
                <td><span class="badge badge-neutral">${getCategoriaNombre(p.categoria)}</span></td>
                <td class="num">${fmtMXN(p.precioVenta)}</td>
                <td class="num ${p.stock <= p.stockMin ? "warning-text" : ""}">${p.stock}</td>
                <td class="td-actions"><button class="btn btn-outline btn-sm" data-act="add-prod" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>${icon("plus", 14)} Agregar</button></td>
              </tr>`).join("");
          }

          function addProducto(id) {
            const p = getProducto(id);
            const inCart = state.cart.find((c) => c.productoId === id);
            const yaReservado = 0; // stock ya refleja disponibilidad
            if (p.stock <= (inCart ? inCart.qty : 0)) {
              toast("Stock insuficiente", `${p.nombre} solo tiene ${p.stock} disponible.`, "error");
              return;
            }
            if (inCart) inCart.qty++;
            else state.cart.push({ productoId: id, nombre: p.nombre, precio: p.precioVenta, qty: 1, servicio: false });
            renderCart();
            toast("Agregado", p.nombre, "success");
          }

          function renderCart() {
            const items = root.querySelector("#cartItems");
            if (!state.cart.length) {
              items.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon("cart", 34)}</div><strong>Carrito vacío</strong><span>Escanea un producto o búscalo arriba.</span></div>`;
            } else {
              items.innerHTML = state.cart.map((c, i) => `
                <div class="cart-item">
                  <div class="ci-info">
                    <div class="ci-name">${c.nombre}</div>
                    <div class="ci-sub">${c.servicio ? "Servicio" : getCategoriaNombre(getProducto(c.productoId)?.categoria)} · ${fmtMXN(c.precio)} c/u</div>
                  </div>
                  ${c.servicio ? "" : `
                  <div class="cart-qty">
                    <button data-act="qty" data-i="${i}" data-d="-1" aria-label="Disminuir">${icon("minus", 14)}</button>
                    <span>${c.qty}</span>
                    <button data-act="qty" data-i="${i}" data-d="1" aria-label="Aumentar">${icon("plus", 14)}</button>
                  </div>`}
                  <div class="ci-price">${fmtMXN(c.precio * c.qty)}</div>
                  <button class="btn btn-ghost btn-icon sm" data-act="rm-item" data-i="${i}" aria-label="Quitar">${icon("trash", 16)}</button>
                </div>`).join("");
            }
            const subtotal = state.cart.reduce((a, c) => a + c.precio * c.qty, 0);
            const desc = Math.max(0, parseFloat(root.querySelector("#cDesc").value) || 0);
            const mon = calcMoney(subtotal, desc);
            root.querySelector("#cartCount").textContent = state.cart.reduce((a, c) => a + c.qty, 0) + " ítems";
            root.querySelector("#cSubtotal").textContent = fmtMXN(mon.subtotal);
            root.querySelector("#cIva").textContent = fmtMXN(mon.iva);
            root.querySelector("#cTotal").textContent = fmtMXN(mon.total);
            const limiteDesc = state.role === "admin" ? Infinity : subtotal * 0.10;
            const hint = root.querySelector("#cDescHint");
            const cobrar = root.querySelector("[data-act='cobrar']");
            if (desc > limiteDesc) {
              hint.style.display = "block";
              cobrar.disabled = true;
            } else { hint.style.display = "none"; cobrar.disabled = false; }
          }

          renderTabla();
          renderCart();

          busqueda.addEventListener("input", renderTabla);
          barcode.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            const cod = barcode.value.trim().toLowerCase();
            const p = DB.PRODUCTS.find((x) => x.sku.toLowerCase() === cod || (x.codigo && x.codigo === cod));
            if (p) { addProducto(p.id); barcode.value = ""; barcode.focus(); }
            else { toast("No encontrado", "Ningún producto con ese código.", "error"); barcode.select(); }
          });

          root.addEventListener("click", (e) => {
            const add = e.target.closest("[data-act='add-prod']");
            if (add) return addProducto(+add.dataset.id);
            const qty = e.target.closest("[data-act='qty']");
            if (qty) {
              const i = +qty.dataset.i, d = +qty.dataset.d;
              state.cart[i].qty += d;
              if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
              renderCart();
            }
            const rm = e.target.closest("[data-act='rm-item']");
            if (rm) { state.cart.splice(+rm.dataset.i, 1); renderCart(); }
            const svc = e.target.closest("[data-act='add-servicio']");
            if (svc) openServicioModal(renderCart);
            const cobrar = e.target.closest("[data-act='cobrar']");
            if (cobrar) { state.cartDescuento = parseFloat(root.querySelector("#cDesc").value) || 0; openPaymentModal(renderCart); }
          });
          root.querySelector("#cDesc").addEventListener("input", renderCart);
        },
      };
    },

    /* ============================================================
       VISTA: ÓRDENES (lista)
       ============================================================ */
    ordenes(param) {
      if (param) return ordenDetalle(+param);
      const filter = new URLSearchParams(location.hash.split("?")[1] || "").get("f") || "todas";
      return {
        html: `
        <div class="row-between" style="margin-bottom:14px">
          <h1>Órdenes de Servicio</h1>
          <div class="row-flex">
            <button class="btn btn-ghost" data-act="buscar-folio">${icon("search", 16)} Buscar</button>
            <button class="btn btn-primary" data-act="nueva-orden">${icon("plus", 16)} Nueva orden</button>
          </div>
        </div>
        <div class="toolbar">
          ${["todas", "pendiente", "en_diagnostico", "cotizado", "en_reparacion", "listo", "entregado", "cancelado", "retrasadas"].map((f) => {
            const lbl = f === "todas" ? "Todas" : (EST_META[f] ? EST_META[f][0] : "Retrasadas");
            const cnt = f === "todas" ? DB.ORDENES.length : f === "retrasadas" ? RETRASADAS() : DB.ORDENES.filter((o) => o.estado === f).length;
            return `<button class="btn btn-outline btn-sm ${filter === f ? "btn-accent" : ""}" data-act="filtrar" data-f="${f}">${lbl} <span class="muted">${cnt}</span></button>`;
          }).join("")}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Folio</th><th>Cliente</th><th>Equipo</th><th>Técnico</th><th>Estado</th><th>Prometida</th><th class="num">Total</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>`,
        after(root) {
          let list = [...DB.ORDENES].sort((a, b) => b.id - a.id);
          if (filter === "retrasadas") list = list.filter((o) => folioRetraso(o));
          else if (filter !== "todas") list = list.filter((o) => o.estado === filter);
          const tb = root.querySelector("tbody");
          if (!list.length) {
            tb.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">${icon("clipboard", 34)}</div><strong>Sin órdenes en este filtro</strong><button class="btn btn-outline btn-sm" data-act="nueva-orden">Crear una orden</button></div></td></tr>`;
            return;
          }
          tb.innerHTML = list.map((o) => {
            const c = getCliente(o.clienteId);
            const t = getUsuario(o.tecnicoId);
            const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
            return `<tr class="row-click" data-act="ver-orden" data-id="${o.id}">
              <td class="mono">${o.folio}</td>
              <td><strong>${c ? c.nombre : "—"}</strong><div class="muted" style="font-size:12px">${c ? c.telefono : ""}</div></td>
              <td>${o.marca} ${o.modelo}<div class="muted" style="font-size:12px">${o.tipoEquipo.replace("_", " ")}</div></td>
              <td>${t ? t.nombre.split(" ")[0] : "—"}</td>
              <td>${estadoBadge(o.estado, folioRetraso(o))}</td>
              <td class="muted">${fmtFecha(o.fechaPrometida)}</td>
              <td class="num">${cot ? fmtMXN(cot.total) : "—"}</td>
            </tr>`;
          }).join("");
          root.querySelectorAll("[data-act='ver-orden']").forEach((r) => r.addEventListener("click", () => go("ordenes/" + r.dataset.id)));
          root.querySelectorAll("[data-act='filtrar']").forEach((b) => b.addEventListener("click", () => {
            location.hash = "#/ordenes?f=" + b.dataset.f;
          }));
          const nu = root.querySelector("[data-act='nueva-orden']");
          if (nu) nu.addEventListener("click", nuevaOrdenWizard);
        },
      };
    },
  };

  /* ============================================================
     POS: Servicio manual / Pago / Ticket
     ============================================================ */
  function openServicioModal(onDone) {
    openModal(modalShell("Agregar servicio", `
      <div class="field"><label class="label" for="svcNombre">Descripción</label><input class="input" id="svcNombre" placeholder="Ej. Instalación de SO" /></div>
      <div class="field"><label class="label" for="svcPrecio">Precio (neto)</label><input class="input" id="svcPrecio" type="number" min="0" step="0.01" value="380" /></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="svc-ok">Agregar</button>`));
    $("#svcNombre").focus();
    $("#modalRoot").querySelector("[data-act='svc-ok']").addEventListener("click", () => {
      const nombre = $("#svcNombre").value.trim();
      const precio = parseFloat($("#svcPrecio").value) || 0;
      if (!nombre || precio <= 0) { toast("Datos inválidos", "Descripción y precio obligatorios.", "error"); return; }
      state.cart.push({ nombre, precio, qty: 1, servicio: true });
      closeModal(); onDone && onDone();
      toast("Servicio agregado", nombre, "success");
    });
  }

  function openPaymentModal(onDone) {
    const subtotal = state.cart.reduce((a, c) => a + c.precio * c.qty, 0);
    const desc = state.cartDescuento || 0;
    const mon = calcMoney(subtotal, desc);
    const clientes = DB.CLIENTES.filter((c) => c.isActive !== false);
    openModal(modalShell("Cobrar venta", `
      <div class="field"><label class="label" for="payCliente">Cliente</label>
        <select class="select" id="payCliente">
          <option value="">— Mostrador / sin cliente —</option>
          ${clientes.map((c) => `<option value="${c.id}">${c.nombre} · ${c.telefono}</option>`).join("")}
        </select>
      </div>
      <div class="form-row-3">
        <div class="field"><label class="label" for="payTipo">Tipo</label>
          <select class="select" id="payTipo"><option value="contado">Contado</option><option value="credito">Crédito</option></select>
        </div>
        <div class="field"><label class="label" for="payMetodo">Método</label>
          <select class="select" id="payMetodo">
            <option value="efectivo">Efectivo</option><option value="tarjeta_debito">Tarjeta débito</option>
            <option value="tarjeta_credito">Tarjeta crédito</option><option value="transferencia">Transferencia</option><option value="deposito">Depósito</option>
          </select>
        </div>
        <div class="field"><label class="label" for="payMonto">Recibido (efectivo)</label><input class="input" id="payMonto" type="number" min="0" value="${Math.ceil(mon.total)}" /></div>
      </div>
      <div id="creditBox" hidden class="alert-warning" style="margin-bottom:12px"></div>
      <div class="kv" id="payResumen">
        <dl style="display:grid;grid-template-columns:auto 1fr;gap:2px 16px">
          <dt>Subtotal</dt><dd>${fmtMXN(mon.subtotal)}</dd>
          <dt>Descuento</dt><dd>−${fmtMXN(mon.descuento)}</dd>
          <dt>IVA ${DB.CONFIG.iva}%</dt><dd>${fmtMXN(mon.iva)}</dd>
          <dt>Total</dt><dd>${fmtMXN(mon.total)}</dd>
        </dl>
      </div>
      <div class="alert-info" style="margin-bottom:4px">${icon("info", 16)} <span>El ticket se imprimirá en térmica 80mm (simulado).</span></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" id="payOk">${icon("check", 16)} Confirmar y cobrar</button>`));

    const cliente = $("#payCliente"), tipo = $("#payTipo"), metodo = $("#payMetodo"), creditBox = $("#creditBox");
    function checkCredit() {
      const cid = +cliente.value;
      const c = cid ? getCliente(cid) : null;
      if (tipo.value === "credito") {
        if (!c) { creditBox.innerHTML = `<strong>Selecciona un cliente</strong> para una venta a crédito.`; creditBox.hidden = false; return; }
        const saldo = saldoCliente(c.id);
        const ok = saldo + mon.total <= c.limiteCredito;
        creditBox.innerHTML = `<strong>Crédito · ${c.nombre}</strong><div>Límite ${fmtMXN(c.limiteCredito)} · Saldo actual ${fmtMXN(saldo)} · ${ok ? `Disponible ${fmtMXN(c.limiteCredito - saldo)} ✓` : `<span style="color:var(--danger)">Excede límite (BR-CRE-02) — no permitido</span>`}</div>`;
        creditBox.hidden = false;
        const okBtn = $("#modalRoot").querySelector("#payOk");
        okBtn.disabled = !ok;
      } else { creditBox.hidden = true; $("#modalRoot").querySelector("#payOk").disabled = false; }
    }
    cliente.addEventListener("change", checkCredit);
    tipo.addEventListener("change", () => {
      metodo.disabled = tipo.value === "credito";
      checkCredit();
    });
    checkCredit();

    $("#modalRoot").querySelector("#payOk").addEventListener("click", () => {
      const cid = cliente.value ? +cliente.value : null;
      const esCredito = tipo.value === "credito";
      const c = cid ? getCliente(cid) : null;
      for (const item of state.cart) {
        if (!item.servicio) {
          const p = getProducto(item.productoId);
          if (p.stock < item.qty) { toast("Stock insuficiente", `${p.nombre}: ${p.stock} disponibles.`, "error"); return; }
        }
      }
      if (esCredito && (!c || saldoCliente(c.id) + mon.total > c.limiteCredito)) { toast("Límite excedido", "La venta a crédito supera el límite del cliente.", "error"); return; }
      const venta = {
        id: nextId(), folio: nextFolio("VEN", DB.VENTAS), clienteId: cid, vendedorId: state.user.id, ordenId: null,
        fecha: new Date().toISOString(), subtotal: mon.subtotal, iva: mon.iva, total: mon.total,
        descuento: mon.descuento, motivoDescuento: mon.descuento > 0 ? "Autorizado en caja" : null,
        tipoPago: esCredito ? "credito" : "contado", metodoPago: esCredito ? null : metodo.value,
        montoRecibido: esCredito ? 0 : parseFloat($("#payMonto").value) || mon.total,
        estado: esCredito ? "credito_pendiente" : "completada",
        fechaVencimiento: esCredito ? addDias(new Date().toISOString(), c.plazoDias || DB.CONFIG.plazoCreditoDefault) : null,
        plazoDias: esCredito ? (c.plazoDias || DB.CONFIG.plazoCreditoDefault) : null,
        lineas: state.cart.map((i) => ({ nombre: i.nombre, cantidad: i.qty, precio: i.precio })),
      };
      DB.VENTAS.unshift(venta);
      for (const item of state.cart) {
        if (!item.servicio) moverStock(item.productoId, -item.qty, "SALIDA_VENTA", `Venta ${venta.folio}`);
      }
      const cambio = !esCredito && metodo.value === "efectivo" ? Math.max(0, venta.montoRecibido - venta.total) : 0;
      closeModal();
      const cart = [...state.cart];
      state.cart = [];
      state.cartDescuento = 0;
      onDone && onDone();
      if (esCredito) toast("Venta a crédito", `${venta.folio} · vence ${fmtFecha(venta.fechaVencimiento)} · CxC registrada.`, "success");
      else toast("Venta completada", `${venta.folio} · ${fmtMXN(venta.total)}${cambio ? ` · cambio ${fmtMXN(cambio)}` : ""}.`, "success");
      openTicket(venta, cambio);
    });
  }

  function openTicket(venta, cambio) {
    openModal(modalShell("Ticket de compra", `
      <div class="ticket" aria-label="Ticket de venta ${venta.folio}">
        <div class="t-head"><h4>TechStore</h4><div>Mantenimiento y venta de cómputo</div>
          <div>Av. Tecnológica 123 · Tel 55 0000 0000</div>
          <div style="margin-top:4px">FOLIO <strong>${venta.folio}</strong></div>
          <div>${fmtFechaHora(venta.fecha)}</div>
        </div>
        <div>${getCliente(venta.clienteId) ? `Cliente: ${getCliente(venta.clienteId).nombre}` : "Cliente: Mostrador"}</div>
        ${venta.lineas.map((l) => `<div class="t-row top"><span>${l.cantidad} × ${l.nombre}</span><span>${fmtMXN(l.precio * l.cantidad)}</span></div>`).join("")}
        <div class="t-row"><span>Subtotal</span><span>${fmtMXN(venta.subtotal)}</span></div>
        ${venta.descuento ? `<div class="t-row"><span>Descuento</span><span>-${fmtMXN(venta.descuento)}</span></div>` : ""}
        <div class="t-row"><span>IVA ${DB.CONFIG.iva}%</span><span>${fmtMXN(venta.iva)}</span></div>
        <div class="t-row total"><span>TOTAL</span><span>${fmtMXN(venta.total)}</span></div>
        ${venta.metodoPago ? `<div class="t-row"><span>Pago</span><span>${venta.metodoPago.replace("_", " ")}</span></div>` : `<div class="t-row"><span>Crédito</span><span>vence ${fmtFecha(venta.fechaVencimiento)}</span></div>`}
        ${cambio ? `<div class="t-row"><span>Recibido</span><span>${fmtMXN(venta.montoRecibido)}</span></div><div class="t-row"><span>Cambio</span><span>${fmtMXN(cambio)}</span></div>` : ""}
        <div class="t-gar">Garantía producto nuevo: ${DB.CONFIG.diasGarantiaProducto} días</div>
        <div class="t-foot">¡Gracias por su compra!<br/>Reparación y ensamble con garantía</div>
      </div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cerrar</button><button class="btn btn-primary" data-act="print-ticket">${icon("printer", 16)} Imprimir</button>`), { label: "Ticket" });
    $("#modalRoot").querySelector("[data-act='print-ticket']").addEventListener("click", () => {
      toast("Imprimiendo", `Ticket ${venta.folio} enviado a impresora térmica (ESC/POS · simulado).`, "info");
    });
  }

  /* ============================================================
     Detalle de orden + acciones por estado
     ============================================================ */
  function ordenDetalle(id) {
    const o = getOrden(id);
    if (!o) { return { html: `<div class="empty-state">${icon("alert", 30)}<strong>Orden no encontrada</strong><button class="btn btn-outline btn-sm" data-nav="ordenes">Volver</button></div>` }; }
    const c = getCliente(o.clienteId);
    const t = getUsuario(o.tecnicoId);
    const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
    const rol = state.role;
    const ret = folioRetraso(o);

    const acciones = [];
    if (o.estado === "pendiente" && rol === "tecnico") acciones.push({ lbl: "Iniciar diagnóstico", act: "to-diagnostico", cls: "btn-accent" });
    if (["pendiente", "en_diagnostico", "cotizado", "en_reparacion", "listo"].includes(o.estado) && rol !== "tecnico") acciones.push({ lbl: "Cancelar orden", act: "cancelar", cls: "btn-danger-outline" });
    if (o.estado === "en_diagnostico" && rol === "tecnico") acciones.push({ lbl: "Registrar diagnóstico", act: "diagnostico", cls: "btn-outline" }, { lbl: "Generar cotización", act: "cotizar", cls: "btn-primary" });
    if (o.estado === "cotizado") {
      if (cot && cot.estado === "emitida" && rol !== "tecnico") acciones.push({ lbl: "Enviar cotización", act: "notif-cot", cls: "btn-outline" }, { lbl: "Aprobar y reservar", act: "aprobar", cls: "btn-primary" });
      if (rol === "tecnico") acciones.push({ lbl: "Iniciar reparación", act: "to-reparacion", cls: "btn-accent" });
    }
    if (o.estado === "en_reparacion" && rol === "tecnico") acciones.push({ lbl: "Registrar consumo", act: "consumo", cls: "btn-outline" }, { lbl: "Mano de obra", act: "mano-obra", cls: "btn-outline" }, { lbl: "Marcar listo", act: "to-listo", cls: "btn-primary" });
    if (o.estado === "listo" && rol !== "tecnico") acciones.push({ lbl: "Notificar listo", act: "notif-listo", cls: "btn-outline" }, { lbl: "Cobrar y entregar", act: "entregar", cls: "btn-primary" });

    return {
      html: `
      <button class="btn btn-ghost btn-sm" data-nav="ordenes" style="margin-bottom:10px">${icon("arrowLeft", 16)} Volver a órdenes</button>
      <div class="row-between">
        <div>
          <h1>Orden ${o.folio}</h1>
          <div class="muted">Creada ${fmtFechaHora(o.createdAt)} · ${ret ? `<span class="danger-text">Retrasada (tolerancia 1 día calendario)</span>` : "a tiempo"}</div>
        </div>
        <div class="row-flex">${estadoBadge(o.estado, ret)}</div>
      </div>
      <div class="alert-info" style="margin:12px 0">${icon("info", 16)} <span>Estados: ${Object.values(EST_META).map((e) => e[0]).join(" → ")}. ${ret ? "Se notificó por el canal preferido (NOT-01)." : ""}</span></div>

      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="card card-pad"><div class="section-title">${icon("users", 14)} Cliente</div>
          <div class="kv"><dt>Nombre</dt><dd>${c.nombre}</dd></div>
          <div class="kv"><dt>Teléfono</dt><dd>${c.telefono}</dd></div>
          <div class="kv"><dt>Canal preferido</dt><dd>${c.preferencia}</dd></div>
        </div>
        <div class="card card-pad"><div class="section-title">${icon("cpu", 14)} Equipo</div>
          <div class="kv"><dt>Equipo</dt><dd>${o.marca} ${o.modelo} (${o.tipoEquipo.replace("_", " ")})</dd></div>
          <div class="kv"><dt>Serie</dt><dd class="mono">${o.serie || "—"}</dd></div>
          <div class="kv"><dt>Accesorios</dt><dd>${o.accesorios || "—"}</dd></div>
          <div class="kv"><dt>Falla reportada</dt><dd>${o.falla}</dd></div>
        </div>
        <div class="card card-pad"><div class="section-title">${icon("clock", 14)} Programación</div>
          <div class="kv"><dt>Fecha prometida</dt><dd>${fmtFecha(o.fechaPrometida)}</dd></div>
          <div class="kv"><dt>Entrega</dt><dd>${o.fechaEntrega ? fmtFecha(o.fechaEntrega) : "—"}</dd></div>
          <div class="kv"><dt>Técnico</dt><dd>${t ? t.nombre : "—"}</dd></div>
          ${o.firma ? `<div class="kv"><dt>Firma</dt><dd><span class="badge badge-success">${icon("check", 12)} Capturada (canvas)</span></dd></div>` : ""}
        </div>
      </div>

      ${acciones.length ? `<div class="card card-pad" style="margin-bottom:16px">
        <div class="section-title">Acciones (estado: ${EST_META[o.estado][0]})</div>
        <div class="row-flex" style="flex-wrap:wrap">
          ${acciones.map((a) => `<button class="btn ${a.cls}" data-act="ord-${a.act}">${icon(a.act === "cotizar" ? "clipboard" : a.act === "entregar" ? "pen" : a.act === "aprobar" ? "check" : "plus", 16)} ${a.lbl}</button>`).join("")}
        </div></div>` : ""}

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><h3>${icon("clipboard", 16)} Diagnóstico / Cotización</h3>
            ${cot ? `<span class="badge ${cot.estado === "aprobada" ? "badge-success" : cot.estado === "emitida" ? "badge-warning" : "badge-neutral"}">${cot.estado}</span>` : ""}
          </div>
          <div class="card-body">
            <div class="kv"><dt>Diagnóstico</dt><dd>${o.diagnostico || "Pendiente de diagnóstico."}</dd></div>
            ${cot ? `
              <table class="tbl"><thead><tr><th>Concepto</th><th class="num">Cant.</th><th class="num">Importe</th></tr></thead>
              <tbody>${cot.lineas.map((l) => `<tr><td>${l.nombre || l.descripcion}${l.horas ? ` <span class="muted">(${l.horas}h × ${fmtMXN(l.tarifa)})</span>` : ""}</td><td class="num">${l.cantidad || ""}</td><td class="num">${fmtMXN(l.precio)}</td></tr>`).join("")}
                <tr><td><strong>Subtotal neto</strong></td><td></td><td class="num">${fmtMXN(cot.subtotal)}</td></tr>
                <tr><td><strong>IVA ${DB.CONFIG.iva}%</strong></td><td></td><td class="num">${fmtMXN(cot.iva)}</td></tr>
                <tr><td><strong>Total</strong></td><td></td><td class="num"><strong>${fmtMXN(cot.total)}</strong></td></tr>
              </tbody></table>
              <div class="hint">Vigencia: hasta ${fmtFecha(cot.vigenciaHasta)} · Folio ${cot.folio}</div>` : `<div class="empty-state"><div class="empty-icon">${icon("clipboard", 30)}</div><strong>Sin cotización</strong><span>${rol === "tecnico" ? "Genera la cotización desde el panel de acciones." : "El técnico emitirá la cotización."}</span></div>`}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>${icon("clock", 16)} Historial de la orden</h3></div>
          <div class="card-body">
            <ul class="stepper">
              ${[...o.historial].reverse().map((h, i, arr) => {
                const isLast = i === arr.length - 1;
                const isCur = i === 0;
                return `<li>
                  <div class="step-dot ${isLast ? "done" : isCur ? "current" : "done"}">${isLast ? icon("check", 12) : isCur ? "•" : icon("check", 12)}</div>
                  ${isCur ? "" : '<div class="step-line"></div>'}
                  <div class="step-body"><div class="step-title">${EST_META[h.estado][0]}</div>
                    <div class="step-meta">${getUsuario(h.usuarioId)?.nombre} · ${fmtFechaHora(h.fecha)}${h.nota ? " — " + h.nota : ""}</div>
                  </div>
                </li>`;
              }).join("")}
            </ul>
          </div>
        </div>
      </div>`,
      after(root) {
        root.querySelectorAll("[data-act^='ord-']").forEach((b) => b.addEventListener("click", (e) => handleOrdenAccion(e.target.closest("[data-act^='ord-']").dataset.act, o)));
      },
    };
  }

  function handleOrdenAccion(accion, o) {
    const acciones = {
      "ord-to-diagnostico": () => transicionOrden(o, "en_diagnostico", "Diagnóstico iniciado"),
      "ord-diagnostico": () => modalDiagnostico(o),
      "ord-cotizar": () => modalCotizar(o),
      "ord-notif-cot": () => { toast("Cotización enviada", `NOT-03 vía ${getCliente(o.clienteId).preferencia} (Twilio/Correo · simulado).`, "info"); },
      "ord-aprobar": () => aprobarCotizacion(o),
      "ord-to-reparacion": () => transicionOrden(o, "en_reparacion", "Reparación iniciada"),
      "ord-consumo": () => modalConsumo(o),
      "ord-mano-obra": () => modalManoObra(o),
      "ord-to-listo": () => transicionOrden(o, "listo", "Equipo listo para entrega"),
      "ord-notif-listo": () => { toast("Equipo listo", `NOT-02 enviada al cliente (${getCliente(o.clienteId).preferencia}).`, "success"); },
      "ord-entregar": () => modalEntregar(o),
      "ord-cancelar": () => modalCancelar(o),
    };
    acciones[accion] && acciones[accion]();
  }

  function modalDiagnostico(o) {
    openModal(modalShell(`Diagnóstico · ${o.folio}`, `
      <div class="field"><label class="label" for="dx">Diagnóstico del técnico</label>
        <textarea class="textarea" id="dx" placeholder="Describe el problema encontrado…">${o.diagnostico || ""}</textarea></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="dx-ok">Guardar diagnóstico</button>`));
    $("#dx").focus();
    $("#modalRoot").querySelector("[data-act='dx-ok']").addEventListener("click", () => {
      const dx = $("#dx").value.trim();
      if (!dx) { toast("Requerido", "Escribe el diagnóstico.", "error"); return; }
      o.diagnostico = dx;
      closeModal();
      toast("Diagnóstico guardado", o.folio, "success");
      render();
    });
  }

  function modalCotizar(o) {
    const refacciones = DB.PRODUCTS.filter((p) => p.isActive !== false);
    openModal(modalShell(`Cotización · ${o.folio}`, `
      <div class="field"><label class="label">Refacciones (líneas de piezas)</label>
        <div class="input-group">
          <select class="select" id="cotProd"><option value="">Selecciona pieza…</option>${refacciones.map((p) => `<option value="${p.id}">${p.nombre} · ${fmtMXN(p.precioVenta)} · stock ${p.stock}</option>`).join("")}</select>
          <input class="input" id="cotCant" type="number" min="1" value="1" style="width:80px" aria-label="Cantidad" />
          <button class="btn btn-outline" data-act="cot-add">${icon("plus", 14)}</button>
        </div>
      </div>
      <div class="field"><label class="label" for="cotMoDesc">Mano de obra (descripción)</label><input class="input" id="cotMoDesc" placeholder="Ej. Sustitución de componente" /></div>
      <div class="form-row">
        <div class="field"><label class="label" for="cotHoras">Horas</label><input class="input" id="cotHoras" type="number" min="0" step="0.5" value="1" /></div>
        <div class="field"><label class="label" for="cotTarifa">Tarifa / hora (neto)</label><input class="input" id="cotTarifa" type="number" min="0" value="380" /></div>
      </div>
      <div class="field"><label class="label">Líneas de la cotización</label><div id="cotLineas" class="card card-pad"></div></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="cot-ok">Emitir cotización</button>`), { label: "Cotización", size: "modal-lg" });

    const lineas = [];
    const caja = $("#modalRoot").querySelector("#cotLineas");
    function renderLineas() {
      caja.innerHTML = lineas.length ? `<table class="tbl"><tbody>${lineas.map((l, i) => `<tr><td>${l.desc}</td><td class="num">${l.cantidad || ""}</td><td class="num">${fmtMXN(l.precio)}</td><td class="td-actions"><button class="btn btn-ghost btn-icon sm" data-act="del-line" data-i="${i}">${icon("trash", 14)}</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="hint" style="padding:12px">Agrega piezas y mano de obra.</div>`;
      caja.querySelectorAll("[data-act='del-line']").forEach((b) => b.addEventListener("click", () => { lineas.splice(+b.dataset.i, 1); renderLineas(); }));
    }
    renderLineas();
    $("#modalRoot").querySelector("[data-act='cot-add']").addEventListener("click", () => {
      const pid = +$("#cotProd").value;
      const cant = +$("#cotCant").value || 1;
      if (!pid) { toast("Elige una pieza", "Selecciona un producto.", "error"); return; }
      const p = getProducto(pid);
      if (p.stock < cant) { toast("Stock insuficiente", `${p.nombre}: ${p.stock} disponibles.`, "error"); return; }
      lineas.push({ desc: p.nombre, productoId: p.id, cantidad: cant, precio: p.precioVenta * cant });
      renderLineas();
    });
    $("#modalRoot").querySelector("[data-act='cot-ok']").addEventListener("click", () => {
      const moDesc = $("#cotMoDesc").value.trim();
      const horas = parseFloat($("#cotHoras").value) || 0;
      const tarifa = parseFloat($("#cotTarifa").value) || 0;
      if (moDesc && horas > 0) lineas.push({ desc: moDesc, horas, tarifa, precio: horas * tarifa });
      if (!lineas.length) { toast("Cotización vacía", "Agrega al menos una línea.", "error"); return; }
      const subtotal = lineas.reduce((a, l) => a + l.precio, 0);
      const mon = calcMoney(subtotal);
      const cot = { id: nextId(), ordenId: o.id, folio: nextFolio("COT", DB.COTIZACIONES), estado: "emitida", vigenciaHasta: addDias(new Date().toISOString(), 7), subtotal: mon.subtotal, iva: mon.iva, total: mon.total, lineas };
      DB.COTIZACIONES.unshift(cot);
      o.estado = "cotizado";
      registrarHistorial(o, "cotizado", `Cotización ${cot.folio} emitida`);
      closeModal();
      toast("Cotización emitida", `${cot.folio} · ${fmtMXN(cot.total)} · vigencia 7 días.`, "success");
      render();
    });
  }

  function aprobarCotizacion(o) {
    const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
    if (!cot || cot.estado !== "emitida") { toast("Sin cotización emitida", "No hay cotización pendiente de aprobación.", "error"); return; }
    openModal(modalShell(`Aprobar cotización · ${o.folio}`, `
      <div class="alert-info">${icon("info", 16)} <span>Al aprobar se <strong>reserva</strong> el stock de las piezas (BR-INV-03) y se notifica al cliente (NOT-03). El inventario disponible se descuenta al consumir.</span></div>
      <div class="kv" style="margin-top:10px"><dt>Total de la cotización</dt><dd>${fmtMXN(cot.total)}</dd></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="ap-ok">${icon("check", 16)} Aprobar y reservar</button>`));
    $("#modalRoot").querySelector("[data-act='ap-ok']").addEventListener("click", () => {
      cot.estado = "aprobada";
      for (const l of cot.lineas) if (l.productoId) moverStock(l.productoId, -l.cantidad, "RESERVA", `Aprobación ${cot.folio} (orden ${o.folio})`);
      registrarHistorial(o, "cotizado", `Cotización ${cot.folio} aprobada · piezas reservadas`);
      closeModal();
      toast("Cotización aprobada", `Piezas reservadas. WhatsApp/correo NOT-03 enviado (simulado).`, "success");
      render();
    });
  }

  function modalConsumo(o) {
    const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
    const ref = (cot ? cot.lineas.filter((l) => l.productoId) : []).filter((l) => !l.consumido);
    openModal(modalShell(`Consumo de piezas · ${o.folio}`, `
      ${ref.length ? `
      <p class="hint" style="margin-top:0">Marca las piezas consumidas. El stock ya estaba reservado; se convierte en consumo (SALIDA_CONSUMO) sin doble descuento.</p>
      ${ref.map((l, i) => `<div class="field" style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="cons${i}" data-i="${i}" style="width:18px;height:18px" />
        <label for="cons${i}" class="grow" style="font-weight:400">${l.nombre} × ${l.cantidad}</label>
        <span class="muted">${fmtMXN(l.precio)}</span>
      </div>`).join("")}` : `<div class="empty-state">${icon("package", 30)}<strong>Sin piezas por consumir</strong><span>No hay refacciones pendientes en la cotización.</span></div>`}
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="cons-ok">Registrar consumo</button>`));
    $("#modalRoot").querySelector("[data-act='cons-ok']").addEventListener("click", () => {
      const checks = [...$("#modalRoot").querySelectorAll("input[type='checkbox']:checked")];
      if (!checks.length) { toast("Nada seleccionado", "Marca al menos una pieza.", "error"); return; }
      for (const ch of checks) {
        const l = ref[+ch.dataset.i];
        l.consumido = true;
        moverStock(l.productoId, 0, "SALIDA_CONSUMO", `Consumo orden ${o.folio} (${l.nombre})`);
      }
      closeModal();
      toast("Consumo registrado", `${checks.length} pieza(s) consumida(s) (BR-INV-04).`, "success");
      render();
    });
  }

  function modalManoObra(o) {
    openModal(modalShell(`Mano de obra · ${o.folio}`, `
      <div class="form-row">
        <div class="field"><label class="label" for="moHoras">Horas</label><input class="input" id="moHoras" type="number" min="0" step="0.5" value="1" /></div>
        <div class="field"><label class="label" for="moTarifa">Tarifa / hora</label><input class="input" id="moTarifa" type="number" min="0" value="380" /></div>
      </div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="mo-ok">Registrar</button>`));
    $("#modalRoot").querySelector("[data-act='mo-ok']").addEventListener("click", () => {
      const h = +$("#moHoras").value || 0, t = +$("#moTarifa").value || 0;
      closeModal();
      toast("Mano de obra registrada", `${h}h × ${fmtMXN(t)} = ${fmtMXN(h * t)} (SER-07).`, "success");
    });
  }

  function modalEntregar(o) {
    openModal(modalShell(`Cobrar y entregar · ${o.folio}`, `
      <div class="field"><label class="label" for="entMetodo">Método de pago</label>
        <select class="select" id="entMetodo"><option value="efectivo">Efectivo</option><option value="tarjeta_debito">Tarjeta débito</option><option value="transferencia">Transferencia</option></select>
      </div>
      <div class="field"><label class="label">Firma de recepción (obligatoria)</label>
        <div class="signature-wrap">
          <canvas class="signature-canvas" id="signature" width="640" height="280" aria-label="Firma del cliente"></canvas>
          <div class="row-flex" style="justify-content:space-between">
            <span class="hint" id="sigState">El cliente firma aquí (táctil o mouse)</span>
            <button class="btn btn-outline btn-sm" data-act="sig-clear">${icon("refresh", 14)} Borrar</button>
          </div>
        </div>
      </div>
      <div class="alert-info">${icon("info", 16)} <span>Al entregar se cierra la orden, se genera la <strong>garantía de servicio (${DB.CONFIG.diasGarantiaServicio} días)</strong> y el ticket de servicio.</span></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="ent-ok">${icon("pen", 16)} Cobrar y entregar</button>`), { label: "Entrega", size: "modal-lg" });

    const canvas = $("#modalRoot").querySelector("#signature");
    const ctx = canvas.getContext("2d");
    let drawing = false, hasInk = false;
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width, sy = canvas.height / r.height;
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }
    canvas.addEventListener("pointerdown", (e) => { drawing = true; ctx.beginPath(); const p = pos(e); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#0F172A"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke(); hasInk = true; $("#sigState").textContent = "Firma capturada"; });
    canvas.addEventListener("pointerup", () => { drawing = false; });
    $("#modalRoot").querySelector("[data-act='sig-clear']").addEventListener("click", () => { ctx.clearRect(0, 0, canvas.width, canvas.height); hasInk = false; $("#sigState").textContent = "El cliente firma aquí (táctil o mouse)"; });

    $("#modalRoot").querySelector("[data-act='ent-ok']").addEventListener("click", () => {
      if (!hasInk) { toast("Firma requerida", "La firma es obligatoria para cerrar la entrega (BR-SER-01).", "error"); return; }
      const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
      o.firma = canvas.toDataURL("image/png");
      const venta = {
        id: nextId(), folio: nextFolio("VEN", DB.VENTAS), clienteId: o.clienteId, vendedorId: state.user.id, ordenId: o.id,
        fecha: new Date().toISOString(), subtotal: cot ? cot.subtotal : 0, iva: cot ? cot.iva : 0, total: cot ? cot.total : 0,
        descuento: 0, motivoDescuento: null, tipoPago: "contado", metodoPago: $("#entMetodo").value, montoRecibido: cot ? cot.total : 0,
        estado: "completada", lineas: cot ? cot.lineas.map((l) => ({ nombre: l.desc || l.nombre, cantidad: l.cantidad || 1, precio: l.precio })) : [],
      };
      DB.VENTAS.unshift(venta);
      transicionOrden(o, "entregado", "Cobrado y entregado · firma capturada");
      closeModal();
      toast("Orden entregada", `Garantía de servicio ${DB.CONFIG.diasGarantiaServicio} días generada (BR-GAR-01).`, "success");
      openTicket(venta, 0);
    });
  }

  function modalCancelar(o) {
    openModal(modalShell(`Cancelar orden · ${o.folio}`, `
      <div class="field"><label class="label" for="canMotivo">Motivo <span class="req">*</span></label>
        <textarea class="textarea" id="canMotivo" placeholder="Ej. Cliente no aprobó la cotización"></textarea></div>
      <div class="hint">Al cancelar se liberan las reservas de inventario si las hubiera (BR-INV-06).</div>
    `, `<button class="btn btn-outline" data-act="close-modal">Regresar</button><button class="btn btn-danger" data-act="can-ok">${icon("trash", 16)} Cancelar orden</button>`));
    $("#modalRoot").querySelector("[data-act='can-ok']").addEventListener("click", () => {
      const m = $("#canMotivo").value.trim();
      if (!m) { toast("Motivo requerido", "Indica el motivo de cancelación.", "error"); return; }
      const cot = DB.COTIZACIONES.find((x) => x.ordenId === o.id);
      if (cot && cot.estado === "aprobada") {
        for (const l of cot.lineas) if (l.productoId) moverStock(l.productoId, l.cantidad, "LIBERACION", `Cancelación orden ${o.folio}`);
      }
      transicionOrden(o, "cancelado", "Cancelada: " + m);
      closeModal();
    });
  }

  /* ============================================================
     Wizard nueva orden
     ============================================================ */
  function nuevaOrdenWizard() {
    const step1 = `
      <div class="field"><label class="label" for="wzCliente">Cliente (buscar o seleccionar)</label>
        <input class="input" id="wzBusq" placeholder="Buscar por nombre o teléfono…" />
        <div id="wzClientes" style="margin-top:8px;max-height:180px;overflow:auto"></div>
      </div>`;
    const step2 = `
      <div class="form-row-3">
        <div class="field"><label class="label" for="wzTipo">Tipo de equipo</label>
          <select class="select" id="wzTipo"><option value="laptop">Laptop</option><option value="desktop">Desktop</option><option value="all_in_one">All-in-one</option><option value="periferico">Periférico</option><option value="componente">Componente</option><option value="otro">Otro</option></select></div>
        <div class="field"><label class="label" for="wzMarca">Marca</label><input class="input" id="wzMarca" /></div>
        <div class="field"><label class="label" for="wzModelo">Modelo</label><input class="input" id="wzModelo" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label class="label" for="wzSerie">Número de serie</label><input class="input" id="wzSerie" /></div>
        <div class="field"><label class="label" for="wzAcc">Accesorios</label><input class="input" id="wzAcc" placeholder="Cargador, mouse…" /></div>
      </div>
      <div class="field"><label class="label" for="wzFalla">Falla reportada <span class="req">*</span></label><textarea class="textarea" id="wzFalla"></textarea></div>`;
    const step3 = `
      <div class="field"><label class="label" for="wzFecha">Fecha prometida</label><input class="input" id="wzFecha" type="date" value="${addDias(new Date().toISOString(), 7)}" /></div>
      <div class="alert-info">${icon("info", 16)} <span>Se generará un folio único y el ticket de recepción para el cliente.</span></div>`;

    let paso = 1, clienteSel = null;
    const estadoPaso = () => `
      <div class="wizard-steps">
        ${["Cliente", "Equipo", "Confirmar"].map((s, i) => {
          const n = i + 1;
          return `<div class="wz-step ${n === paso ? "active" : n < paso ? "done" : ""}">${n}. ${s}</div>`;
        }).join("")}
      </div>`;

    openModal(modalShell("Nueva orden de servicio", " ", " "), { label: "Nueva orden", size: "modal-lg" });
    const modal = $("#modalRoot");
    const bodyEl = modal.querySelector(".modal-body");
    const footEl = modal.querySelector(".modal-footer");

    function renderWzClientes(q) {
      const box = modal.querySelector("#wzClientes");
      if (!box) return;
      const list = DB.CLIENTES.filter((c) => c.isActive !== false && (!q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)));
      box.innerHTML = list.map((c) => `
        <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:1px solid var(--border);margin-bottom:6px" data-act="wz-sel" data-id="${c.id}">
          ${icon("user", 16)} <span style="flex:1;text-align:left"><strong>${c.nombre}</strong> · ${c.telefono}</span>
          ${clienteSel === c.id ? icon("check", 16) : ""}
        </button>`).join("") || `<div class="hint">Sin coincidencias. Registra al cliente desde Clientes.</div>`;
      box.querySelectorAll("[data-act='wz-sel']").forEach((b) => b.addEventListener("click", () => { clienteSel = +b.dataset.id; renderWzClientes(q); }));
    }

    function renderStep() {
      const cuerpos = [step1, step2, step3];
      bodyEl.innerHTML = estadoPaso() + cuerpos[paso - 1];
      footEl.innerHTML = `
        <button class="btn btn-outline" data-act="wz-back" ${paso === 1 ? "hidden" : ""}>Atrás</button>
        <button class="btn btn-primary" data-act="wz-next">${paso === 3 ? "Crear orden" : "Siguiente"}</button>`;

      const busca = modal.querySelector("#wzBusq");
      if (busca) busca.addEventListener("input", (e) => renderWzClientes(e.target.value.toLowerCase()));
      if (paso === 1) renderWzClientes("");

      const back = modal.querySelector("[data-act='wz-back']");
      if (back) back.addEventListener("click", () => { paso = Math.max(1, paso - 1); renderStep(); });

      modal.querySelector("[data-act='wz-next']").addEventListener("click", () => {
        if (paso === 1 && !clienteSel) { toast("Cliente requerido", "Selecciona un cliente para crear la orden.", "error"); return; }
        if (paso === 2) {
          const falla = modal.querySelector("#wzFalla").value.trim();
          if (!falla) { toast("Falla requerida", "Describe la falla reportada.", "error"); return; }
        }
        if (paso === 3) {
          const fecha = modal.querySelector("#wzFecha").value || addDias(new Date().toISOString(), 7);
          const folio = nextFolioOrden();
          const orden = {
            id: nextId(), folio, clienteId: clienteSel, tipoEquipo: modal.querySelector("#wzTipo").value,
            marca: modal.querySelector("#wzMarca").value, modelo: modal.querySelector("#wzModelo").value,
            serie: modal.querySelector("#wzSerie").value, accesorios: modal.querySelector("#wzAcc").value,
            falla: modal.querySelector("#wzFalla").value.trim(), diagnostico: "", estado: "pendiente", retrasada: false,
            fechaPrometida: fecha, fechaEntrega: null, tecnicoId: 3, vendedorId: state.user.id, firma: null,
            createdAt: new Date().toISOString(), historial: [{ estado: "pendiente", usuarioId: state.user.id, fecha: new Date().toISOString(), nota: "Orden creada" }],
          };
          DB.ORDENES.unshift(orden);
          closeModal();
          toast("Orden creada", `${folio} · ticket de recepción impreso (simulado).`, "success");
          go("ordenes/" + orden.id);
          return;
        }
        paso++;
        renderStep();
      });
    }
    renderStep();
  }

  /* ============================================================
     VISTA: CLIENTES
     ============================================================ */
  function clientes(param) {
    if (param) return clienteDetalle(+param);
    return {
      html: `
      <div class="row-between" style="margin-bottom:14px">
        <h1>Clientes (CRM)</h1>
        <button class="btn btn-primary" data-act="nuevo-cliente">${icon("plus", 16)} Nuevo cliente</button>
      </div>
      <div class="toolbar">
        <input class="input" id="cliBusq" placeholder="Buscar por nombre o teléfono…" style="max-width:320px" />
        <span class="grow"></span>
        <span class="chip">Límite default: ${fmtMXN(DB.CONFIG.limiteCreditoDefault)}</span>
      </div>
      <div class="card">
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Contacto</th><th>Preferencia</th><th>Etiquetas</th><th class="num">Límite</th><th class="num">Saldo</th><th></th></tr></thead>
          <tbody></tbody>
        </table></div>
      </div>`,
      after(root) {
        function render(q) {
          const list = DB.CLIENTES.filter((c) => c.isActive !== false && (!q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)));
          const tb = root.querySelector("tbody");
          if (!list.length) { tb.innerHTML = `<tr><td colspan="7"><div class="empty-state">${icon("users", 34)}<strong>Sin clientes</strong><button class="btn btn-outline btn-sm" data-act="nuevo-cliente">Registrar cliente</button></div></td></tr>`; return; }
          tb.innerHTML = list.map((c) => {
            const saldo = saldoCliente(c.id);
            const deudor = c.etiquetas.includes("deudor") || DB.VENTAS.some((v) => v.clienteId === c.id && estadoCxC(v).estado === "vencido");
            return `<tr class="row-click" data-act="ver-cliente" data-id="${c.id}">
              <td><strong>${c.nombre}</strong>${deudor ? `<div><span class="badge badge-danger">${icon("alert", 11)} Deudor</span></div>` : ""}</td>
              <td><div>${c.telefono}</div><div class="muted" style="font-size:12px">${c.correo || "sin correo"}</div></td>
              <td><span class="badge badge-info">${c.preferencia}</span></td>
              <td>${c.etiquetas.map((e) => `<span class="badge badge-neutral">${e}</span>`).join(" ")}</td>
              <td class="num">${fmtMXN(c.limiteCredito)}</td>
              <td class="num ${saldo > 0 ? "warning-text" : ""}">${fmtMXN(saldo)}</td>
              <td class="td-actions"><button class="btn btn-ghost btn-icon sm" data-act="ver-cliente" data-id="${c.id}">${icon("eye", 16)}</button></td>
            </tr>`;
          }).join("");
          root.querySelectorAll("[data-act='ver-cliente']").forEach((r) => r.addEventListener("click", () => go("clientes/" + r.dataset.id)));
        }
        render("");
        root.querySelector("#cliBusq").addEventListener("input", (e) => render(e.target.value.toLowerCase().trim()));
        root.querySelector("[data-act='nuevo-cliente']").addEventListener("click", nuevoClienteModal);
      },
    };
  }

  function nuevoClienteModal() {
    openModal(modalShell("Nuevo cliente", `
      <div class="form-row">
        <div class="field"><label class="label" for="ncNombre">Nombre <span class="req">*</span></label><input class="input" id="ncNombre" /></div>
        <div class="field"><label class="label" for="ncTel">Teléfono <span class="req">*</span></label><input class="input" id="ncTel" /></div>
      </div>
      <div class="field"><label class="label" for="ncCorreo">Correo</label><input class="input" id="ncCorreo" type="email" /></div>
      <div class="form-row">
        <div class="field"><label class="label" for="ncPref">Canal preferido</label>
          <select class="select" id="ncPref"><option value="whatsapp">WhatsApp</option><option value="correo">Correo</option><option value="llamada">Llamada</option></select></div>
        <div class="field"><label class="label" for="ncLim">Límite de crédito (default ${fmtMXN(DB.CONFIG.limiteCreditoDefault)})</label><input class="input" id="ncLim" type="number" min="0" value="${DB.CONFIG.limiteCreditoDefault}" /></div>
      </div>
      <div class="field"><label class="label" for="ncPlazo">Plazo (días)</label><input class="input" id="ncPlazo" type="number" min="1" value="${DB.CONFIG.plazoCreditoDefault}" /></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="nc-ok">Guardar cliente</button>`));
    $("#ncNombre").focus();
    $("#modalRoot").querySelector("[data-act='nc-ok']").addEventListener("click", () => {
      const nombre = $("#ncNombre").value.trim(), tel = $("#ncTel").value.trim();
      if (!nombre || !tel) { toast("Campos requeridos", "Nombre y teléfono son obligatorios.", "error"); return; }
      DB.CLIENTES.push({ id: nextId(), nombre, telefono: tel, correo: $("#ncCorreo").value.trim() || null, direccion: null, preferencia: $("#ncPref").value, limiteCredito: +$("#ncLim").value, plazoDias: +$("#ncPlazo").value, etiquetas: ["ocasional"], isActive: true });
      closeModal();
      toast("Cliente registrado", `${nombre} · límite ${fmtMXN(+$("#ncLim").value)}.`, "success");
      render();
    });
  }

  function clienteDetalle(id) {
    const c = getCliente(id);
    if (!c) return { html: `<div class="empty-state">${icon("alert", 30)}<strong>Cliente no encontrado</strong></div>` };
    const saldo = saldoCliente(id);
    const ords = DB.ORDENES.filter((o) => o.clienteId === id).sort((a, b) => b.id - a.id);
    const ventas = DB.VENTAS.filter((v) => v.clienteId === id).sort((a, b) => b.id - a.id);
    const cots = DB.COTIZACIONES.filter((x) => ords.some((o) => o.id === x.ordenId));
    const cxc = ventas.filter((v) => v.tipoPago === "credito").map((v) => ({ v, ...estadoCxC(v) }));

    return {
      html: `
      <button class="btn btn-ghost btn-sm" data-nav="clientes" style="margin-bottom:10px">${icon("arrowLeft", 16)} Volver a clientes</button>
      <div class="row-between" style="margin-bottom:16px">
        <div class="row-flex"><span class="avatar" style="width:46px;height:46px">${c.nombre.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
          <div><h1 style="margin:0">${c.nombre}</h1><div class="muted">${c.telefono}${c.correo ? " · " + c.correo : ""}</div></div>
        </div>
        <div class="row-flex">
          ${c.etiquetas.map((e) => `<span class="badge ${e === "deudor" ? "badge-danger" : "badge-neutral"}">${e}</span>`).join("")}
          <button class="btn btn-outline btn-sm" data-nav="venta">${icon("cart", 15)} Vender</button>
        </div>
      </div>
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="card kpi-card"><span class="kpi-label">${icon("dollar", 14)} Límite de crédito</span><span class="kpi-value">${fmtMXN(c.limiteCredito)}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("clock", 14)} Plazo</span><span class="kpi-value">${c.plazoDias} días</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("trendDown", 14)} Saldo CxC</span><span class="kpi-value ${saldo ? "warning-text" : ""}">${fmtMXN(saldo)}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("clipboard", 14)} Órdenes</span><span class="kpi-value">${ords.length}</span></div>
      </div>

      <div class="tabs">
        <button class="tab active" data-act="tab" data-t="historial">Historial</button>
        <button class="tab" data-act="tab" data-t="cxc">Cuentas por cobrar ${cxc.some((x) => x.estado === "vencido") ? `<span class="badge badge-danger">vencida</span>` : ""}</button>
      </div>
      <div id="tabCxc" hidden>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Folio</th><th>Fecha</th><th class="num">Total</th><th class="num">Pagado</th><th class="num">Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
          <tbody>${cxc.map(({ v, estado, saldo: s }) => {
            const pagado = DB.PAGOS.filter((p) => p.ventaId === v.id).reduce((a, p) => a + p.monto, 0);
            return `<tr class="${estado === "vencido" ? "row-danger" : ""}"><td class="mono">${v.folio}</td><td>${fmtFecha(v.fecha)}</td>
            <td class="num">${fmtMXN(v.total)}</td><td class="num">${fmtMXN(pagado)}</td><td class="num">${fmtMXN(s)}</td>
            <td class="muted">${v.fechaVencimiento ? fmtFecha(v.fechaVencimiento) : "—"}</td>
            <td>${estado === "vencido" ? `<span class="badge badge-danger">Vencido</span>` : estado === "pagado" ? `<span class="badge badge-success">Pagado</span>` : `<span class="badge badge-warning">Vigente</span>`}</td>
            <td class="td-actions">${s > 0 ? `<button class="btn btn-outline btn-sm" data-act="abono" data-v="${v.id}">Abonar</button>` : ""}</td></tr>`;
          }).join("") || `<tr><td colspan="8"><div class="empty-state">${icon("dollar", 30)}<strong>Sin adeudos</strong><span>El cliente no tiene cuentas por cobrar.</span></div></td></tr>`}
          </tbody></table></div></div>
      </div>
      <div id="tabHist">
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Folio</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th class="num">Importe</th></tr></thead>
          <tbody>
            ${ords.map((o) => `<tr class="row-click" data-act="go-ord" data-id="${o.id}"><td class="mono">${o.folio}</td><td>Orden (${o.tipoEquipo.replace("_", " ")})</td><td>${fmtFecha(o.createdAt)}</td><td>${estadoBadge(o.estado, folioRetraso(o))}</td><td class="num">—</td></tr>`).join("")}
            ${ventas.map((v) => `<tr><td class="mono">${v.folio}</td><td>Venta${v.ordenId ? " (servicio)" : ""}</td><td>${fmtFecha(v.fecha)}</td><td><span class="badge ${v.estado === "completada" ? "badge-success" : "badge-warning"}">${v.estado.replace("_", " ")}</span></td><td class="num">${fmtMXN(v.total)}</td></tr>`).join("")}
            ${cots.map((x) => `<tr><td class="mono">${x.folio}</td><td>Cotización</td><td>—</td><td><span class="badge badge-neutral">${x.estado}</span></td><td class="num">${fmtMXN(x.total)}</td></tr>`).join("")}
          </tbody></table></div></div>
      </div>`,
      after(root) {
        root.querySelectorAll("[data-act='tab']").forEach((b) => b.addEventListener("click", () => {
          root.querySelectorAll("[data-act='tab']").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          root.querySelector("#tabHist").hidden = b.dataset.t !== "historial";
          root.querySelector("#tabCxc").hidden = b.dataset.t !== "cxc";
        }));
        root.querySelectorAll("[data-act='go-ord']").forEach((r) => r.addEventListener("click", () => go("ordenes/" + r.dataset.id)));
        root.querySelectorAll("[data-act='abono']").forEach((b) => b.addEventListener("click", () => {
          const v = DB.VENTAS.find((x) => x.id === +b.dataset.v);
          const saldo = estadoCxC(v).saldo;
          openModal(modalShell(`Abono · ${v.folio}`, `
            <div class="kv"><dt>Saldo pendiente</dt><dd>${fmtMXN(saldo)}</dd></div>
            <div class="field"><label class="label" for="abMonto">Monto a abonar</label><input class="input" id="abMonto" type="number" min="0.01" max="${saldo}" value="${saldo}" /></div>
            <div class="field"><label class="label" for="abMetodo">Método</label><select class="select" id="abMetodo"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta_debito">Tarjeta débito</option></select></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="ab-ok">Registrar abono</button>`));
          $("#modalRoot").querySelector("[data-act='ab-ok']").addEventListener("click", () => {
            const monto = +$("#abMonto").value;
            if (!monto || monto <= 0) { toast("Monto inválido", "Ingresa un monto mayor a cero.", "error"); return; }
            DB.PAGOS.push({ id: nextId(), ventaId: v.id, monto: Math.min(monto, saldo), metodo: $("#abMetodo").value, fecha: new Date().toISOString() });
            closeModal();
            toast("Abono registrado", `CxC ${v.folio} abonada (BR-CRE-05).`, "success");
            render();
          });
        }));
      },
    };
  }

  /* ============================================================
     VISTA: PRODUCTOS / INVENTARIO
     ============================================================ */
  function productos() {
    return {
      html: `
      <div class="row-between" style="margin-bottom:14px">
        <h1>Productos e Inventario</h1>
        ${state.role === "admin" ? `<button class="btn btn-primary" data-act="nuevo-producto">${icon("plus", 16)} Nuevo producto</button>` : ""}
      </div>
      <div class="toolbar">
        <input class="input" id="prodBusq" placeholder="Buscar por nombre o SKU…" style="max-width:300px" />
        <select class="select" id="prodCat" style="width:200px">
          <option value="">Todas las categorías</option>
          ${["componente", "periferico", "equipo_completo", "refaccion", "usado"].map((t) => `<option value="${t}">${getCategoriaNombre(t)}</option>`).join("")}
        </select>
        <span class="grow"></span>
        <span class="chip">${icon("package", 14)} ${DB.PRODUCTS.filter((p) => p.isActive !== false).length} productos</span>
      </div>
      <div class="card">
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th class="num">P. compra</th><th class="num">P. venta</th><th class="num">Stock</th><th class="num">Mínimo</th><th></th></tr></thead>
          <tbody></tbody>
        </table></div>
      </div>`,
      after(root) {
        function render() {
          const q = (root.querySelector("#prodBusq").value || "").toLowerCase().trim();
          const cat = root.querySelector("#prodCat").value;
          const list = DB.PRODUCTS.filter((p) => p.isActive !== false)
            .filter((p) => (!q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) && (!cat || p.categoria === cat));
          const tb = root.querySelector("tbody");
          if (!list.length) { tb.innerHTML = `<tr><td colspan="8"><div class="empty-state">${icon("package", 34)}<strong>Sin productos</strong><span>Prueba otro filtro.</span></div></td></tr>`; return; }
          tb.innerHTML = list.map((p) => {
            const low = p.stock <= p.stockMin;
            return `<tr class="${low ? "" : ""}">
              <td class="mono muted">${p.sku}</td>
              <td><strong>${p.nombre}</strong>${p.isKit ? `<span class="badge badge-info" style="margin-left:6px">${icon("cpu", 11)} Kit/BOM</span>` : ""}<div class="muted" style="font-size:12px">${p.marca} ${p.modelo}</div></td>
              <td><span class="badge badge-neutral">${getCategoriaNombre(p.categoria)}</span></td>
              <td class="num">${fmtMXN(p.precioCompra)}</td>
              <td class="num">${fmtMXN(p.precioVenta)}</td>
              <td class="num"><strong>${p.stock}</strong></td>
              <td class="num">${p.stockMin}</td>
              <td class="td-actions">
                <button class="btn btn-ghost btn-icon sm" data-act="movimientos" data-id="${p.id}" title="Movimientos">${icon("clock", 15)}</button>
                ${p.isKit ? `<button class="btn btn-ghost btn-icon sm" data-act="ver-bom" data-id="${p.id}" title="BOM">${icon("cpu", 15)}</button>` : ""}
                ${state.role === "admin" ? `<button class="btn btn-ghost btn-icon sm" data-act="ajustar" data-id="${p.id}" title="Ajustar">${icon("edit", 15)}</button>` : ""}
                <button class="btn btn-ghost btn-icon sm" data-act="editar-prod" data-id="${p.id}" title="Editar">${icon("more", 15)}</button>
              </td>
            </tr>`;
          }).join("");
        }
        render();
        root.querySelector("#prodBusq").addEventListener("input", render);
        root.querySelector("#prodCat").addEventListener("change", render);
        root.querySelectorAll("[data-act='movimientos']").forEach((b) => b.addEventListener("click", () => movimientosModal(+b.dataset.id)));
        root.querySelectorAll("[data-act='ver-bom']").forEach((b) => b.addEventListener("click", () => bomModal(+b.dataset.id)));
        root.querySelectorAll("[data-act='ajustar']").forEach((b) => b.addEventListener("click", () => ajusteModal(+b.dataset.id)));
        const np = root.querySelector("[data-act='nuevo-producto']");
        if (np) np.addEventListener("click", nuevoProductoModal);
      },
    };
  }

  function movimientosModal(pid) {
    const p = getProducto(pid);
    const list = DB.MOVIMIENTOS.filter((m) => m.productoId === pid);
    openModal(modalShell(`Movimientos · ${p.sku}`, `
      <div class="hint" style="margin-top:0">Historial de entradas y salidas (INV-06).</div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th class="num">Cant.</th><th>Fecha</th><th>Usuario</th><th>Motivo</th></tr></thead>
      <tbody>${list.map((m) => `<tr>
        <td><span class="badge ${m.tipo.includes("ENTRADA") ? "badge-success" : m.tipo.includes("RESERVA") ? "badge-info" : m.tipo.includes("AJUSTE") ? "badge-warning" : "badge-neutral"}">${m.tipo}</span></td>
        <td class="num ${m.cantidad < 0 ? "danger-text" : "success-text"}">${m.cantidad > 0 ? "+" : ""}${m.cantidad}</td>
        <td class="muted">${fmtFechaHora(m.fecha)}</td><td>${m.usuario}</td><td class="muted">${m.motivo}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty-state">${icon("clock", 30)}<strong>Sin movimientos</strong></div></td></tr>`}
      </tbody></table></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cerrar</button>`), { label: "Movimientos", size: "modal-lg" });
  }

  function bomModal(pid) {
    const p = getProducto(pid);
    const comps = (DB.BOM[pid] || []).map((b) => ({ ...getProducto(b.productoId), cantidad: b.cantidad }));
    openModal(modalShell(`BOM del kit · ${p.nombre}`, `
      <div class="hint" style="margin-top:0">Al vender este kit se descuenta el stock de cada componente (BR-INV-09).</div>
      <table class="tbl"><thead><tr><th>Componente</th><th class="num">Cant.</th><th class="num">Costo</th></tr></thead>
      <tbody>${comps.map((c) => `<tr><td>${c.nombre}</td><td class="num">${c.cantidad}</td><td class="num">${fmtMXN(c.precioCompra * c.cantidad)}</td></tr>`).join("")}</tbody></table>
      <div class="hint">Costo total: ${fmtMXN(comps.reduce((a, c) => a + c.precioCompra * c.cantidad, 0))} · Venta: ${fmtMXN(p.precioVenta)}</div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cerrar</button>`));
  }

  function ajusteModal(pid) {
    const p = getProducto(pid);
    openModal(modalShell(`Ajustar inventario · ${p.sku}`, `
      <div class="alert-info">${icon("info", 16)} <span>Solo admin. Se genera un movimiento AJUSTE (daño, merma, físico).</span></div>
      <div class="field"><label class="label" for="ajCant">Cantidad (negativa = salida)</label><input class="input" id="ajCant" type="number" step="1" value="-1" /></div>
      <div class="field"><label class="label" for="ajMot">Motivo <span class="req">*</span></label><input class="input" id="ajMot" placeholder="Ej. Merma por daño" /></div>
      <div class="kv"><dt>Stock actual</dt><dd>${p.stock}</dd></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="aj-ok">Aplicar ajuste</button>`));
    $("#modalRoot").querySelector("[data-act='aj-ok']").addEventListener("click", () => {
      const cant = +$("#ajCant").value || 0, mot = $("#ajMot").value.trim();
      if (!mot) { toast("Motivo requerido", "Indica el motivo del ajuste.", "error"); return; }
      if (p.stock + cant < 0) { toast("Stock negativo", "El ajuste dejaría stock negativo (BR-INV-01).", "error"); return; }
      moverStock(pid, cant, "AJUSTE", mot);
      closeModal();
      toast("Ajuste aplicado", `${p.nombre}: stock → ${p.stock}.`, "success");
      render();
    });
  }

  function nuevoProductoModal() {
    openModal(modalShell("Nuevo producto", `
      <div class="form-row">
        <div class="field"><label class="label" for="npSku">SKU <span class="req">*</span></label><input class="input" id="npSku" placeholder="RAM-002" /></div>
        <div class="field"><label class="label" for="npCodigo">Código de barras</label><input class="input" id="npCodigo" /></div>
      </div>
      <div class="field"><label class="label" for="npNombre">Nombre <span class="req">*</span></label><input class="input" id="npNombre" /></div>
      <div class="form-row">
        <div class="field"><label class="label" for="npCat">Categoría</label><select class="select" id="npCat">${["componente", "periferico", "equipo_completo", "refaccion", "usado"].map((t) => `<option value="${t}">${getCategoriaNombre(t)}</option>`).join("")}</select></div>
        <div class="field"><label class="label" for="npKit">¿Es kit/BOM?</label><select class="select" id="npKit"><option value="0">No</option><option value="1">Sí</option></select></div>
      </div>
      <div class="form-row-3">
        <div class="field"><label class="label" for="npPc">Precio compra</label><input class="input" id="npPc" type="number" min="0" value="0" /></div>
        <div class="field"><label class="label" for="npPv">Precio venta</label><input class="input" id="npPv" type="number" min="0" value="0" /></div>
        <div class="field"><label class="label" for="npMin">Stock mínimo</label><input class="input" id="npMin" type="number" min="0" value="1" /></div>
      </div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="np-ok">Guardar</button>`));
    $("#modalRoot").querySelector("[data-act='np-ok']").addEventListener("click", () => {
      const sku = $("#npSku").value.trim(), nombre = $("#npNombre").value.trim();
      if (!sku || !nombre) { toast("Campos requeridos", "SKU y nombre son obligatorios.", "error"); return; }
      DB.PRODUCTS.push({ id: nextId(), sku, codigo: $("#npCodigo").value.trim() || null, nombre, marca: "", modelo: "", categoria: $("#npCat").value, precioCompra: +$("#npPc").value, precioVenta: +$("#npPv").value, stock: 0, stockMin: +$("#npMin").value, isKit: +$("#npKit").value === 1, isActive: true });
      closeModal();
      toast("Producto creado", `${nombre} (${sku}).`, "success");
      render();
    });
  }

  /* ============================================================
     VISTA: COMPRAS (admin)
     ============================================================ */
  function compras() {
    const tab = "proveedores";
    return {
      html: `
      <h1>Compras y Proveedores</h1>
      <div class="tabs">
        <button class="tab active" data-act="com-tab" data-t="prov">Proveedores</button>
        <button class="tab" data-act="com-tab" data-t="compras">Órdenes de compra</button>
      </div>
      <div id="comProv">
        <div class="row-between" style="margin-bottom:12px"><div class="muted">Gestiona proveedores y condiciones de pago.</div><button class="btn btn-primary" data-act="nuevo-proveedor">${icon("plus", 16)} Nuevo proveedor</button></div>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Proveedor</th><th>Contacto</th><th>Condiciones</th><th></th></tr></thead>
          <tbody>${DB.PROVEEDORES.map((p) => `<tr><td><strong>${p.nombre}</strong></td><td>${p.contacto}</td><td class="muted">${p.condiciones}</td><td class="td-actions"><button class="btn btn-ghost btn-icon sm">${icon("more", 15)}</button></td></tr>`).join("")}</tbody>
        </table></div></div>
      </div>
      <div id="comCompras" hidden>
        <div class="row-between" style="margin-bottom:12px"><div class="muted">Órdenes de compra · al recibir se actualiza el inventario y se genera CxP.</div><button class="btn btn-primary" data-act="nueva-compra">${icon("plus", 16)} Nueva compra</button></div>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Folio</th><th>Proveedor</th><th>Fecha</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
          <tbody>${DB.COMPRAS.map((c) => `<tr>
            <td class="mono">${c.folio}</td><td>${getProveedor(c.proveedorId).nombre}</td><td class="muted">${fmtFecha(c.fecha)}</td>
            <td><span class="badge ${c.estado === "recibida" ? "badge-success" : c.estado === "enviada" ? "badge-info" : "badge-neutral"}">${c.estado}</span></td>
            <td class="num">${fmtMXN(c.total)}</td>
            <td class="td-actions">${c.estado === "borrador" ? `<button class="btn btn-outline btn-sm" data-act="com-enviar" data-id="${c.id}">Enviar</button>` : ""}${c.estado === "enviada" ? `<button class="btn btn-primary btn-sm" data-act="com-recibir" data-id="${c.id}">Recibir</button>` : ""}</td>
          </tr>`).join("")}</tbody>
        </table></div></div>
      </div>`,
      after(root) {
        root.querySelectorAll("[data-act='com-tab']").forEach((b) => b.addEventListener("click", () => {
          root.querySelectorAll("[data-act='com-tab']").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          root.querySelector("#comProv").hidden = b.dataset.t !== "prov";
          root.querySelector("#comCompras").hidden = b.dataset.t !== "compras";
        }));
        root.querySelector("[data-act='nuevo-proveedor']").addEventListener("click", () => {
          openModal(modalShell("Nuevo proveedor", `
            <div class="field"><label class="label" for="npvNom">Nombre <span class="req">*</span></label><input class="input" id="npvNom" /></div>
            <div class="field"><label class="label" for="npvCon">Contacto</label><input class="input" id="npvCon" /></div>
            <div class="field"><label class="label" for="npvCond">Condiciones de pago</label><input class="input" id="npvCond" value="Contado" /></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="npv-ok">Guardar</button>`));
          $("#modalRoot").querySelector("[data-act='npv-ok']").addEventListener("click", () => {
            const n = $("#npvNom").value.trim();
            if (!n) { toast("Requerido", "Nombre del proveedor.", "error"); return; }
            DB.PROVEEDORES.push({ id: nextId(), nombre: n, contacto: $("#npvCon").value.trim(), condiciones: $("#npvCond").value.trim(), isActive: true });
            closeModal(); toast("Proveedor registrado", n, "success"); render();
          });
        });
        root.querySelector("[data-act='nueva-compra']").addEventListener("click", nuevaCompraModal);
        root.querySelectorAll("[data-act='com-enviar']").forEach((b) => b.addEventListener("click", () => {
          const c = DB.COMPRAS.find((x) => x.id === +b.dataset.id); c.estado = "enviada";
          toast("Compra enviada", c.folio, "success"); render();
        }));
        root.querySelectorAll("[data-act='com-recibir']").forEach((b) => b.addEventListener("click", () => recibirCompraModal(+b.dataset.id)));
      },
    };
  }

  function nuevaCompraModal() {
    openModal(modalShell("Nueva orden de compra", `
      <div class="field"><label class="label" for="ocProv">Proveedor</label>
        <select class="select" id="ocProv">${DB.PROVEEDORES.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("")}</select></div>
      <div class="field"><label class="label">Líneas</label>
        <div class="input-group">
          <select class="select" id="ocProd"><option value="">Producto…</option>${DB.PRODUCTS.map((p) => `<option value="${p.id}">${p.nombre} · ${fmtMXN(p.precioCompra)}</option>`).join("")}</select>
          <input class="input" id="ocCant" type="number" min="1" value="1" style="width:80px" aria-label="Cantidad" />
          <input class="input" id="ocPrecio" type="number" min="0" value="0" style="width:110px" aria-label="Precio unitario" />
          <button class="btn btn-outline" data-act="oc-add">${icon("plus", 14)}</button>
        </div>
      </div>
      <div class="field"><div class="card card-pad" id="ocLineas"></div></div>
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="oc-ok">Crear compra (borrador)</button>`), { label: "Compra", size: "modal-lg" });
    const lineas = [];
    const box = $("#modalRoot").querySelector("#ocLineas");
    function render() {
      box.innerHTML = lineas.length ? `<table class="tbl"><tbody>${lineas.map((l, i) => `<tr><td>${l.nombre}</td><td class="num">${l.cantidad}</td><td class="num">${fmtMXN(l.precio)}</td><td class="td-actions"><button class="btn btn-ghost btn-icon sm" data-act="oc-del" data-i="${i}">${icon("trash", 14)}</button></td></tr>`).join("")}</tbody></table>` : `<div class="hint">Agrega productos.</div>`;
      box.querySelectorAll("[data-act='oc-del']").forEach((b) => b.addEventListener("click", () => { lineas.splice(+b.dataset.i, 1); render(); }));
    }
    render();
    $("#modalRoot").querySelector("[data-act='oc-add']").addEventListener("click", () => {
      const pid = +$("#ocProd").value; const p = getProducto(pid);
      const cant = +$("#ocCant").value || 1; const precio = +$("#ocPrecio").value || p.precioCompra;
      if (!pid) { toast("Elige producto", "Selecciona un producto.", "error"); return; }
      lineas.push({ productoId: pid, nombre: p.nombre, cantidad: cant, precio: precio * cant });
      render();
    });
    $("#modalRoot").querySelector("[data-act='oc-ok']").addEventListener("click", () => {
      if (!lineas.length) { toast("Compra vacía", "Agrega al menos una línea.", "error"); return; }
      const compra = { id: nextId(), folio: nextFolio("COM", DB.COMPRAS), proveedorId: +$("#ocProv").value, estado: "borrador", fecha: new Date().toISOString().slice(0, 10), total: lineas.reduce((a, l) => a + l.precio, 0), fechaVencimiento: null, lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precio: l.precio / l.cantidad })) };
      DB.COMPRAS.unshift(compra);
      closeModal();
      toast("Compra creada", `${compra.folio} (borrador). Envíala para recibir mercancía.`, "success");
      render();
    });
  }

  function recibirCompraModal(cid) {
    const c = DB.COMPRAS.find((x) => x.id === cid);
    openModal(modalShell(`Recibir mercancía · ${c.folio}`, `
      <div class="alert-info">${icon("info", 16)} <span>Al recibir: stock += cantidades, movimiento ENTRADA con costo y se genera la CxP (BR-COM-02/03).</span></div>
      ${c.lineas.map((l, i) => {
        const p = getProducto(l.productoId);
        return `<div class="field" style="display:flex;align-items:center;gap:10px">
          <label for="rc${i}" style="flex:1;font-weight:400">${p.nombre} (pedidas: ${l.cantidad})</label>
          <input class="input" id="rc${i}" type="number" min="0" max="${l.cantidad}" value="${l.cantidad}" style="width:90px" />
        </div>`;
      }).join("")}
    `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="rc-ok">Recibir</button>`));
    $("#modalRoot").querySelector("[data-act='rc-ok']").addEventListener("click", () => {
      let total = 0;
      c.lineas.forEach((l, i) => {
        const cant = +$("#modalRoot").querySelector(`#rc${i}`).value || 0;
        const p = getProducto(l.productoId);
        moverStock(l.productoId, cant, "ENTRADA", `Recepción ${c.folio}`);
        total += cant * l.precio;
      });
      c.estado = "recibida";
      closeModal();
      toast("Mercancía recibida", `${c.folio} · inventario actualizado (${fmtMXN(total)} de CxP).`, "success");
      render();
    });
  }

  /* ============================================================
     VISTA: CAJA
     ============================================================ */
  function caja() {
    const movs = DB.VENTAS.filter((v) => v.fecha.slice(0, 10) === "2026-08-03");
    const ingresos = movs.reduce((a, v) => a + v.total, 0);
    const porMetodo = [];
    ["efectivo", "tarjeta_debito", "tarjeta_credito", "transferencia", "deposito"].forEach((m) => {
      const tot = movs.filter((v) => v.metodoPago === m).reduce((a, v) => a + v.total, 0);
      if (tot > 0) porMetodo.push({ label: m.replace("_", " "), value: tot, color: Charts.COLORS.accent });
    });
    porMetodo[0] && (porMetodo[0].color = Charts.COLORS.primary);
    return {
      html: `
      <div class="row-between" style="margin-bottom:14px">
        <h1>Caja del día</h1>
        <div class="row-flex">
          ${DB.CAJA.estado === "abierta" ? `<span class="chip">${icon("banknote", 14)} Abierta desde ${fmtFechaHora(DB.CAJA.apertura)}</span>` : `<button class="btn btn-primary" data-act="abrir-caja">${icon("plus", 14)} Abrir caja</button>`}
          ${DB.CAJA.estado === "abierta" && state.role === "admin" ? `<button class="btn btn-danger-outline" data-act="cerrar-caja">${icon("check", 14)} Cerrar caja</button>` : ""}
        </div>
      </div>
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="card kpi-card"><span class="kpi-label">${icon("trendUp", 14)} Ingresos hoy</span><span class="kpi-value">${fmtMXN(ingresos)}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("trendDown", 14)} Egresos hoy</span><span class="kpi-value">${fmtMXN(DB.EGRESOS.reduce((a, e) => a + e.monto, 0))}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("cart", 14)} Tickets</span><span class="kpi-value">${movs.length}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("dollar", 14)} Crédito (CxC)</span><span class="kpi-value">${fmtMXN(movs.filter((v) => v.tipoPago === "credito").reduce((a, v) => a + v.total, 0))}</span></div>
      </div>
      <div class="grid grid-2">
        <div class="card card-pad">
          <h3>Ventas por método</h3>
          <div class="grid grid-2" style="align-items:center"><div class="chart-box" data-chart="donut"></div><div class="chart-legend">${porMetodo.map((m) => `<span class="lg-item"><span class="lg-dot" style="background:${m.color}"></span>${m.label} · ${fmtMXN(m.value)}</span>`).join("")}</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>${icon("clock", 16)} Movimientos del día</h3><span class="chip">${movs.length}</span></div>
          <div class="card-body" style="max-height:300px;overflow:auto">
            ${movs.map((v) => `<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div><strong>${v.folio}</strong> ${v.lineas[0] ? "· " + v.lineas[0].nombre : ""}<div class="muted" style="font-size:12px">${v.metodoPago ? v.metodoPago.replace("_", " ") : "crédito"} · ${fmtFechaHora(v.fecha)}</div></div>
              <strong>${fmtMXN(v.total)}</strong></div>`).join("")}
          </div>
        </div>
      </div>`,
      after(root) {
        if (porMetodo.length) Charts.donutChart(root.querySelector("[data-chart='donut']"), porMetodo, { label: "Caja", centerLabel: "Hoy" });
        const abrir = root.querySelector("[data-act='abrir-caja']");
        if (abrir) abrir.addEventListener("click", () => { DB.CAJA.estado = "abierta"; DB.CAJA.apertura = new Date().toISOString(); toast("Caja abierta", "Sesión de caja iniciada (BR-CAJ-01).", "success"); render(); });
        const cerrar = root.querySelector("[data-act='cerrar-caja']");
        if (cerrar) cerrar.addEventListener("click", () => {
          const efectivo = DB.VENTAS.filter((v) => v.metodoPago === "efectivo").reduce((a, v) => a + v.montoRecibido, 0);
          const esperado = efectivo - DB.EGRESOS.filter((e) => e.metodo === "efectivo").reduce((a, e) => a + e.monto, 0);
          openModal(modalShell("Cerrar caja · arqueo", `
            <div class="field"><label class="label" for="arqEfectivo">Efectivo contado en caja</label><input class="input" id="arqEfectivo" type="number" min="0" step="0.01" value="${Math.round(esperado)}" /></div>
            <div class="kv"><dt>Efectivo esperado (sistema)</dt><dd>${fmtMXN(esperado)}</dd></div>
            <div id="arqResult"></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="arq-ok">Cerrar caja</button>`));
          const input = $("#arqEfectivo");
          function calc() { const diff = (+input.value || 0) - esperado; $("#arqResult").innerHTML = `<div class="${Math.abs(diff) > 0.01 ? "alert-warning" : "alert-info"}">${icon(Math.abs(diff) > 0.01 ? "alert" : "check-circle", 16)} <span>Diferencia: ${fmtMXN(diff)} ${Math.abs(diff) > 0.01 ? "(requiere revisión)" : "· cuadra ✓"}</span></div>`; }
          input.addEventListener("input", calc); calc();
          $("#modalRoot").querySelector("[data-act='arq-ok']").addEventListener("click", () => {
            DB.CAJA.estado = "cerrada"; DB.CAJA.cierre = new Date().toISOString(); DB.CAJA.efectivoFisico = +input.value; DB.CAJA.diferencia = +input.value - esperado;
            closeModal();
            toast("Caja cerrada", `Arqueo con diferencia ${fmtMXN(DB.CAJA.diferencia)} (BR-CAJ-03/04).`, "success");
            render();
          });
        });
      },
    };
  }

  /* ============================================================
     VISTA: FINANZAS (admin)
     ============================================================ */
  function finanzas() {
    const cxc = DB.VENTAS.filter((v) => v.tipoPago === "credito").map((v) => ({ v, ...estadoCxC(v) }));
    const cxp = DB.COMPRAS.filter((c) => c.estado === "recibida").map((c) => {
      const pagado = 0; const saldo = c.total - pagado;
      return { c, pagado, saldo, estado: saldo > 0 ? "vigente" : "pagado" };
    });
    return {
      html: `
      <h1>Finanzas</h1>
      <div class="tabs">
        <button class="tab active" data-act="fin-tab" data-t="cxc">Cuentas por cobrar</button>
        <button class="tab" data-act="fin-tab" data-t="cxp">Cuentas por pagar</button>
        <button class="tab" data-act="fin-tab" data-t="egr">Egresos</button>
      </div>
      <div id="finCxc">
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Folio</th><th>Cliente</th><th class="num">Total</th><th class="num">Pagado</th><th class="num">Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
          <tbody>${cxc.map(({ v, estado, saldo }) => {
            const pagado = DB.PAGOS.filter((p) => p.ventaId === v.id).reduce((a, p) => a + p.monto, 0);
            return `<tr class="${estado === "vencido" ? "row-danger" : ""}"><td class="mono">${v.folio}</td><td>${getCliente(v.clienteId)?.nombre}</td>
            <td class="num">${fmtMXN(v.total)}</td><td class="num">${fmtMXN(pagado)}</td><td class="num">${fmtMXN(saldo)}</td>
            <td class="muted">${v.fechaVencimiento ? fmtFecha(v.fechaVencimiento) : "—"}</td>
            <td>${estado === "vencido" ? `<span class="badge badge-danger">Vencido</span>` : estado === "pagado" ? `<span class="badge badge-success">Pagado</span>` : `<span class="badge badge-warning">Vigente</span>`}</td>
            <td class="td-actions">${saldo > 0 ? `<button class="btn btn-outline btn-sm" data-act="fin-abono" data-v="${v.id}">Abonar</button>` : ""}</td></tr>`;
          }).join("") || `<tr><td colspan="8"><div class="empty-state">${icon("dollar", 30)}<strong>Sin CxC</strong></div></td></tr>`}
          </tbody></table></div></div>
      </div>
      <div id="finCxp" hidden>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Folio</th><th>Proveedor</th><th class="num">Total</th><th class="num">Pagado</th><th class="num">Saldo</th><th>Vence</th><th>Estado</th></tr></thead>
          <tbody>${cxp.map(({ c, pagado, saldo, estado }) => `<tr><td class="mono">${c.folio}</td><td>${getProveedor(c.proveedorId).nombre}</td>
            <td class="num">${fmtMXN(c.total)}</td><td class="num">${fmtMXN(pagado)}</td><td class="num">${fmtMXN(saldo)}</td>
            <td class="muted">${c.fechaVencimiento ? fmtFecha(c.fechaVencimiento) : "—"}</td>
            <td><span class="badge ${estado === "vigente" ? "badge-warning" : "badge-success"}">${estado}</span></td></tr>`).join("")}</tbody>
        </table></div></div>
      </div>
      <div id="finEgr" hidden>
        <div class="row-between" style="margin-bottom:12px"><div class="muted">Gastos operativos, renta, servicios (FIN-02).</div><button class="btn btn-primary" data-act="nuevo-egreso">${icon("plus", 16)} Registrar egreso</button></div>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Concepto</th><th>Categoría</th><th class="num">Monto</th><th>Método</th><th>Fecha</th></tr></thead>
          <tbody>${DB.EGRESOS.map((e) => `<tr><td>${e.concepto}</td><td>${e.categoria}</td><td class="num">${fmtMXN(e.monto)}</td><td>${e.metodo}</td><td class="muted">${fmtFecha(e.fecha)}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty-state">${icon("dollar", 30)}<strong>Sin egresos registrados</strong></div></td></tr>`}</tbody>
        </table></div></div>
      </div>`,
      after(root) {
        root.querySelectorAll("[data-act='fin-tab']").forEach((b) => b.addEventListener("click", () => {
          root.querySelectorAll("[data-act='fin-tab']").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          root.querySelector("#finCxc").hidden = b.dataset.t !== "cxc";
          root.querySelector("#finCxp").hidden = b.dataset.t !== "cxp";
          root.querySelector("#finEgr").hidden = b.dataset.t !== "egr";
        }));
        root.querySelectorAll("[data-act='fin-abono']").forEach((b) => b.addEventListener("click", () => {
          const v = DB.VENTAS.find((x) => x.id === +b.dataset.v);
          const saldo = estadoCxC(v).saldo;
          openModal(modalShell(`Abono · ${v.folio}`, `
            <div class="kv"><dt>Saldo</dt><dd>${fmtMXN(saldo)}</dd></div>
            <div class="field"><label class="label" for="fabMonto">Monto</label><input class="input" id="fabMonto" type="number" min="0.01" max="${saldo}" value="${saldo}" /></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="fab-ok">Abonar</button>`));
          $("#modalRoot").querySelector("[data-act='fab-ok']").addEventListener("click", () => {
            DB.PAGOS.push({ id: nextId(), ventaId: v.id, monto: +$("#fabMonto").value, metodo: "efectivo", fecha: new Date().toISOString() });
            closeModal(); toast("Abono registrado", v.folio, "success"); render();
          });
        }));
        const ne = root.querySelector("[data-act='nuevo-egreso']");
        if (ne) ne.addEventListener("click", () => {
          openModal(modalShell("Registrar egreso", `
            <div class="field"><label class="label" for="egCon">Concepto <span class="req">*</span></label><input class="input" id="egCon" placeholder="Ej. Renta del local" /></div>
            <div class="form-row">
              <div class="field"><label class="label" for="egCat">Categoría</label><select class="select" id="egCat"><option>Renta</option><option>Servicios</option><option>Operativo</option><option>Proveedores</option></select></div>
              <div class="field"><label class="label" for="egMetodo">Método</label><select class="select" id="egMetodo"><option>efectivo</option><option>transferencia</option><option>tarjeta_debito</option></select></div>
            </div>
            <div class="field"><label class="label" for="egMonto">Monto <span class="req">*</span></label><input class="input" id="egMonto" type="number" min="0.01" /></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="eg-ok">Registrar</button>`));
          $("#modalRoot").querySelector("[data-act='eg-ok']").addEventListener("click", () => {
            const con = $("#egCon").value.trim(), mon = +$("#egMonto").value;
            if (!con || !mon) { toast("Datos requeridos", "Concepto y monto.", "error"); return; }
            DB.EGRESOS.unshift({ id: nextId(), concepto: con, categoria: $("#egCat").value, monto: mon, metodo: $("#egMetodo").value, fecha: new Date().toISOString() });
            closeModal(); toast("Egreso registrado", con, "success"); render();
          });
        });
      },
    };
  }

  /* ============================================================
     VISTA: REPORTES (admin)
     ============================================================ */
  function reportes() {
    const ventas = DB.VENTAS;
    const porVendedor = DB.USERS.filter((u) => u.rol === "vendedor").map((u) => ({ label: u.nombre.split(" ")[0], value: ventas.filter((v) => v.vendedorId === u.id).reduce((a, v) => a + v.total, 0), color: Charts.COLORS.accent }));
    porVendedor[0] && (porVendedor[0].color = Charts.COLORS.primary);
    const metodos = [];
    ["efectivo", "tarjeta_debito", "transferencia"].forEach((m) => { const t = ventas.filter((v) => v.metodoPago === m).reduce((a, v) => a + v.total, 0); if (t) metodos.push({ label: m.replace("_", " "), value: t, color: Charts.COLORS.accent }); });
    metodos[0] && (metodos[0].color = Charts.COLORS.primary);
    const lineData = [
      { label: "28", value: 8200 }, { label: "29", value: 9600 }, { label: "30", value: 7400 }, { label: "31", value: 11200 }, { label: "1", value: 9800 }, { label: "2", value: 13200 }, { label: "3", value: ventas.reduce((a, v) => a + v.total, 0) },
    ];
    const top = {};
    ventas.forEach((v) => v.lineas.forEach((l) => { top[l.nombre] = (top[l.nombre] || 0) + l.cantidad; }));
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const bajos = DB.PRODUCTS.filter((p) => p.isActive !== false && p.stock <= p.stockMin);
    const rentabilidad = ventas.reduce((a, v) => a + (v.subtotal - v.descuento), 0);
    return {
      html: `
      <div class="row-between" style="margin-bottom:14px">
        <h1>Reportes</h1>
        <div class="row-flex">
          <button class="btn btn-outline" data-act="export" data-f="excel">${icon("file-down", 15)} Excel</button>
          <button class="btn btn-outline" data-act="export" data-f="pdf">${icon("file-down", 15)} PDF</button>
        </div>
      </div>
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="card kpi-card"><span class="kpi-label">${icon("trendUp", 14)} Utilidad bruta</span><span class="kpi-value">${fmtMXN(rentabilidad)}</span><span class="kpi-sub muted">ventas netas</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("cart", 14)} Ventas</span><span class="kpi-value">${ventas.length}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("clipboard", 14)} Servicios</span><span class="kpi-value">${DB.ORDENES.filter((o) => o.estado === "entregado").length}</span></div>
        <div class="card kpi-card"><span class="kpi-label">${icon("package", 14)} Stock bajo</span><span class="kpi-value warning-text">${bajos.length}</span></div>
      </div>
      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="card card-pad"><h3>Ventas · últimos 7 días</h3><div class="chart-box" data-chart="line"></div></div>
        <div class="card card-pad"><h3>Ventas por vendedor</h3><div class="chart-box" data-chart="bar"></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><h3>${icon("package", 16)} Top productos vendidos</h3></div>
          <div class="card-body"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Cant.</th></tr></thead>
          <tbody>${topList.map(([n, c]) => `<tr><td>${n}</td><td class="num">${c}</td></tr>`).join("") || `<tr><td colspan="2"><div class="empty-state">Sin ventas</div></td></tr>`}</tbody></table></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>${icon("alert", 16)} Stock bajo (REP-01)</h3></div>
          <div class="card-body"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Mínimo</th></tr></thead>
          <tbody>${bajos.map((p) => `<tr class="row-danger"><td>${p.nombre}</td><td class="num">${p.stock}</td><td class="num">${p.stockMin}</td></tr>`).join("") || `<tr><td colspan="3"><div class="empty-state">${icon("check", 26)} Sin alertas de stock</div></td></tr>`}</tbody></table></div>
        </div>
      </div>`,
      after(root) {
        Charts.lineChart(root.querySelector("[data-chart='line']"), lineData, { label: "Ventas", stroke: Charts.COLORS.primary, fill: Charts.COLORS.primary });
        Charts.barChart(root.querySelector("[data-chart='bar']"), porVendedor, { label: "Por vendedor" });
        root.querySelectorAll("[data-act='export']").forEach((b) => b.addEventListener("click", () => toast("Exportación", `Reporte descargado en ${b.dataset.f.toUpperCase()} (simulado).`, "success")));
      },
    };
  }

  /* ============================================================
     VISTA: CONFIGURACIÓN (admin)
     ============================================================ */
  function configuracion() {
    const C = DB.CONFIG;
    return {
      html: `
      <h1>Configuración</h1>
      <div class="tabs">
        <button class="tab active" data-act="cfg-tab" data-t="par">Parámetros</button>
        <button class="tab" data-act="cfg-tab" data-t="pla">Plantillas de notificación</button>
        <button class="tab" data-act="cfg-tab" data-t="usu">Usuarios</button>
      </div>
      <div id="cfgPar">
        <div class="card card-pad" style="max-width:560px">
          <div class="form-row-3">
            <div class="field"><label class="label" for="cIva">IVA (%)</label><input class="input" id="cIva" type="number" value="${C.iva}" /></div>
            <div class="field"><label class="label" for="cTol">Tolerancia retraso (días)</label><input class="input" id="cTol" type="number" value="${C.toleranciaRetraso}" /></div>
            <div class="field"><label class="label" for="cLim">Límite crédito default</label><input class="input" id="cLim" type="number" value="${C.limiteCreditoDefault}" /></div>
          </div>
          <div class="form-row-3">
            <div class="field"><label class="label" for="cPla">Plazo crédito default</label><input class="input" id="cPla" type="number" value="${C.plazoCreditoDefault}" /></div>
            <div class="field"><label class="label" for="cG1">Garantía producto (días)</label><input class="input" id="cG1" type="number" value="${C.diasGarantiaProducto}" /></div>
            <div class="field"><label class="label" for="cG2">Garantía servicio (días)</label><input class="input" id="cG2" type="number" value="${C.diasGarantiaServicio}" /></div>
          </div>
          <div class="alert-info">${icon("info", 16)} <span>Retraso: se marca cuando fecha_prometida + ${C.toleranciaRetraso} día(s) calendario (incluye domingo) ya pasó.</span></div>
          <button class="btn btn-primary" data-act="cfg-save">Guardar parámetros</button>
        </div>
      </div>
      <div id="cfgPla" hidden>
        <div class="stack">${DB.PLANTILLAS.map((p, i) => `<div class="card">
          <div class="card-header"><h3>${p.nombre} <span class="badge badge-info">${p.tipo}</span></h3><button class="btn btn-ghost btn-sm" data-act="edit-plantilla" data-i="${i}">${icon("edit", 14)} Editar</button></div>
          <div class="card-body"><div class="kv"><dt>Asunto</dt><dd>${p.asunto}</dd></div><div class="kv"><dt>Cuerpo</dt><dd style="font-weight:400">${p.cuerpo}</dd></div><div class="hint">Variables: {cliente} {folio} {fecha} {total} {cotizacion}</div></div>
        </div>`).join("")}</div>
      </div>
      <div id="cfgUsu" hidden>
        <div class="card"><div class="table-wrap"><table class="tbl">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>${DB.USERS.map((u) => `<tr><td class="row-flex"><span class="avatar sm">${u.inicial}</span> <strong>${u.nombre}</strong> <span class="muted">@${u.usuario}</span></td><td><span class="badge badge-neutral">${u.rol}</span></td><td><span class="badge badge-success">Activo</span></td><td class="td-actions"><button class="btn btn-ghost btn-icon sm">${icon("more", 15)}</button></td></tr>`).join("")}</tbody>
        </table></div></div>
      </div>`,
      after(root) {
        root.querySelectorAll("[data-act='cfg-tab']").forEach((b) => b.addEventListener("click", () => {
          root.querySelectorAll("[data-act='cfg-tab']").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          root.querySelector("#cfgPar").hidden = b.dataset.t !== "par";
          root.querySelector("#cfgPla").hidden = b.dataset.t !== "pla";
          root.querySelector("#cfgUsu").hidden = b.dataset.t !== "usu";
        }));
        const save = root.querySelector("[data-act='cfg-save']");
        if (save) save.addEventListener("click", () => {
          C.iva = +$("#cIva").value || C.iva;
          C.toleranciaRetraso = +$("#cTol").value || C.toleranciaRetraso;
          C.limiteCreditoDefault = +$("#cLim").value || C.limiteCreditoDefault;
          C.plazoCreditoDefault = +$("#cPla").value || C.plazoCreditoDefault;
          C.diasGarantiaProducto = +$("#cG1").value || C.diasGarantiaProducto;
          C.diasGarantiaServicio = +$("#cG2").value || C.diasGarantiaServicio;
          toast("Parámetros guardados", "Aplicados en el prototipo (persisten solo en sesión).", "success");
          render();
        });
        root.querySelectorAll("[data-act='edit-plantilla']").forEach((b) => b.addEventListener("click", () => {
          const p = DB.PLANTILLAS[+b.dataset.i];
          openModal(modalShell(`Editar plantilla ${p.tipo}`, `
            <div class="field"><label class="label" for="epAsunto">Asunto</label><input class="input" id="epAsunto" value="${p.asunto}" /></div>
            <div class="field"><label class="label" for="epCuerpo">Cuerpo</label><textarea class="textarea" id="epCuerpo" style="min-height:120px">${p.cuerpo}</textarea></div>
          `, `<button class="btn btn-outline" data-act="close-modal">Cancelar</button><button class="btn btn-primary" data-act="ep-ok">Guardar</button>`));
          $("#modalRoot").querySelector("[data-act='ep-ok']").addEventListener("click", () => {
            p.asunto = $("#epAsunto").value.trim();
            p.cuerpo = $("#epCuerpo").value.trim();
            closeModal(); toast("Plantilla actualizada", p.tipo, "success"); render();
          });
        }));
      },
    };
  }
Object.assign(ROUTES, { clientes, productos, compras, caja, finanzas, reportes, configuracion });

  /* ---------------- Search header ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement && document.activeElement.id === "headerSearch") {
      const q = document.activeElement.value.trim().toLowerCase();
      if (!q) return;
      const cli = DB.CLIENTES.find((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q));
      const ord = DB.ORDENES.find((o) => o.folio.toLowerCase() === q);
      if (ord) go("ordenes/" + ord.id);
      else if (cli) go("clientes/" + cli.id);
      else toast("Sin resultados", "No se encontró cliente u orden.", "warning");
      document.activeElement.value = "";
    }
  });

  /* ---------------- Init ---------------- */
  function init() {
    document.documentElement.dataset.theme = state.theme;
    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#sidebarToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    if (!state.user) go("login");
    else render();
    renderChrome();
  }
  init();
  window.addEventListener("resize", () => { if (innerWidth > 768) $("#sidebar").classList.remove("open"); });
})();
