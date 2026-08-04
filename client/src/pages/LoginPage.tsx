import { useMutation } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { authApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const navigate = useNavigate();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => authApi.login(usuario, password),
    onSuccess: (res) => {
      saveSession(res.data);
      toast.success("Bienvenido", res.data.usuario.nombre);
      navigate("/");
    },
    onError: (err) => {
      toast.error("No se pudo iniciar sesión", err instanceof Error ? err.message : "Inténtalo de nuevo");
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border-line bg-surface p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white">
            <Cpu className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold">TechStore</h1>
          <p className="text-sm text-muted">Sistema de Administración</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="usuario">Usuario</Label>
            <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-faint">Demo: admin / admin1234</p>
      </div>
    </div>
  );
}
