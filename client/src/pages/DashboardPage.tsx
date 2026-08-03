import { Card, CardBody } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";

const kpis = [
  { k: "Ventas hoy", v: "$0.00" },
  { k: "Órdenes activas", v: "0" },
  { k: "Retrasadas", v: "0" },
  { k: "Stock bajo", v: "—" },
];

export default function DashboardPage() {
  const user = getSessionUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buen día, {user?.nombre.split(" ")[0]}</h1>
        <p className="text-muted">Panel de la tienda · vertical slice inicial (auth + productos).</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((x) => (
          <Card key={x.k}>
            <CardBody>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{x.k}</p>
              <p className="mt-1 text-2xl font-bold">{x.v}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
