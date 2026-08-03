import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Layout from "@/components/layout";
import { ToastProvider } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import OrdenDetallePage from "@/pages/OrdenDetallePage";
import OrdenesPage from "@/pages/OrdenesPage";
import ProductosPage from "@/pages/ProductosPage";
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
      { path: "productos", element: <ProductosPage /> },
      { path: "ordenes", element: <OrdenesPage /> },
      { path: "ordenes/:id", element: <OrdenDetallePage /> },
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
