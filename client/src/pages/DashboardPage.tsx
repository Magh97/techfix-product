import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { TD, TH, TR, Table, THead } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { dashboardApi } from "@/lib/api";
import { mxn } from "@/lib/utils";

export default function DashboardPage() {
  const user = getSessionUser();
  const { data, isLoading, isError } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.resumen });

  if (isLoading) {
    return (
      <div className="grid place-items-center p-10">
        <Spinner />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Buen día, {user?.nombre.split(" ")[0]}</h1>
        <p className="text-danger">No se pudo cargar el resumen del día.</p>
      </div>
    );
  }

  const r = data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buen día, {user?.nombre.split(" ")[0]}</h1>
        <p className="text-muted">Resumen de la tienda · hoy</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ventas hoy</p>
            <p className="mt-1 text-2xl font-bold">{mxn(r.ventasHoy.total)}</p>
            <p className="text-xs text-muted">{r.ventasHoy.cantidad} venta(s) · ticket {mxn(r.ventasHoy.ticketPromedio)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Órdenes activas</p>
            <p className="mt-1 text-2xl font-bold">{r.ordenes.activas}</p>
            <p className="text-xs text-muted">
              {r.ordenes.retrasadas > 0 ? (
                <span className="font-semibold text-danger">{r.ordenes.retrasadas} retrasada(s)</span>
              ) : (
                "sin retrasos"
              )}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stock bajo</p>
            <p className="mt-1 text-2xl font-bold">{r.inventario.stockBajo}</p>
            <p className="text-xs text-muted">{r.inventario.totalProductos} productos activos</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Caja</p>
            <p className="mt-2">
              {r.cajaAbierta ? <Badge variant="success">Abierta</Badge> : <Badge variant="warning">Cerrada</Badge>}
            </p>
            <p className="mt-1 text-xs text-muted">Tu caja de hoy</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Top productos</h2>
          </CardHeader>
          <CardBody className="p-0">
            {r.topProductos.length === 0 ? (
              <p className="p-4 text-sm text-muted">Sin ventas todavía.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Unidades</TH>
                    <TH className="text-right">Ingreso</TH>
                  </TR>
                </THead>
                <tbody>
                  {r.topProductos.map((p) => (
                    <TR key={p.nombre}>
                      <TD>{p.nombre}</TD>
                      <TD className="text-right">{p.unidades}</TD>
                      <TD className="text-right">{mxn(p.ingreso)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Mayores deudores</h2>
          </CardHeader>
          <CardBody className="p-0">
            {r.topDeudores.length === 0 ? (
              <p className="p-4 text-sm text-muted">Sin cuentas por cobrar pendientes.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH>
                    <TH className="text-right">Saldo</TH>
                  </TR>
                </THead>
                <tbody>
                  {r.topDeudores.map((d) => (
                    <TR key={d.clienteId}>
                      <TD>{d.clienteNombre}</TD>
                      <TD className="text-right text-danger">{mxn(d.saldo)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
