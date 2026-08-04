import { BarChart3, Bell, Building2, ClipboardList, Cpu, FileText, FolderTree, LayoutDashboard, LineChart, LogOut, Package, ShoppingCart, Truck, UserCog, Users, Wallet } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/venta", label: "Ventas", icon: ShoppingCart },
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { to: "/ordenes", label: "Órdenes", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/compras", label: "Compras", icon: Truck },
  { to: "/proveedores", label: "Proveedores", icon: Building2 },
  { to: "/catalogos", label: "Catálogos", icon: FolderTree, adminOnly: true },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell, adminOnly: true },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/finanzas", label: "Finanzas", icon: BarChart3 },
  { to: "/reportes", label: "Reportes", icon: LineChart, adminOnly: true },
];

export default function Layout() {
  const user = getSessionUser();
  const navigate = useNavigate();
  const visibleNav = nav.filter((item) => !item.adminOnly || user?.rol === "admin");

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-border-line bg-foreground text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-white">
            <Cpu className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold">TechStore</p>
            <p className="text-xs text-white/60">Sistema de Administración</p>
          </div>
        </div>
        <nav className="p-3">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/10 text-white"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="ml-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-3 border-b border-border-line bg-surface/90 px-5 backdrop-blur">
          <span className="text-sm">
            {user?.nombre} · <span className="capitalize text-muted">{user?.rol}</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
