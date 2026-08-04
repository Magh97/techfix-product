import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Layout from "@/components/layout";
import { ToastProvider } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import CajaPage from "@/pages/CajaPage";
import CatalogosPage from "@/pages/CatalogosPage";
import ClienteDetallePage from "@/pages/ClienteDetallePage";
import ClientesPage from "@/pages/ClientesPage";
import CompraDetallePage from "@/pages/CompraDetallePage";
import ComprasPage from "@/pages/ComprasPage";
import CotizacionesPage from "@/pages/CotizacionesPage";
import DashboardPage from "@/pages/DashboardPage";
import FinanzasPage from "@/pages/FinanzasPage";
import LoginPage from "@/pages/LoginPage";
import NuevaCompraPage from "@/pages/NuevaCompraPage";
import NotificacionesPage from "@/pages/NotificacionesPage";
import OrdenDetallePage from "@/pages/OrdenDetallePage";
import OrdenesPage from "@/pages/OrdenesPage";
import ProductosPage from "@/pages/ProductosPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import ReportesPage from "@/pages/ReportesPage";
import UsuariosPage from "@/pages/UsuariosPage";
import VentaPage from "@/pages/VentaPage";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getSessionUser()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "venta", element: <VentaPage /> },
      { path: "cotizaciones", element: <CotizacionesPage /> },
      { path: "productos", element: <ProductosPage /> },
      { path: "clientes", element: <ClientesPage /> },
      { path: "clientes/:id", element: <ClienteDetallePage /> },
      { path: "ordenes", element: <OrdenesPage /> },
      { path: "ordenes/:id", element: <OrdenDetallePage /> },
      { path: "caja", element: <CajaPage /> },
      { path: "finanzas", element: <FinanzasPage /> },
      { path: "proveedores", element: <ProveedoresPage /> },
      { path: "catalogos", element: <CatalogosPage /> },
      { path: "usuarios", element: <UsuariosPage /> },
      { path: "notificaciones", element: <NotificacionesPage /> },
      { path: "compras", element: <ComprasPage /> },
      { path: "compras/nueva", element: <NuevaCompraPage /> },
      { path: "compras/:id", element: <CompraDetallePage /> },
      { path: "reportes", element: <ReportesPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
