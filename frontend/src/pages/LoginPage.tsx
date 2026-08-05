import { Alert, Badge, Button, Card, Label, TextInput } from "flowbite-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";

const CLIENT = { email: "client@freshstart.demo", password: "FreshStart!2026" };
const ATTORNEY = { email: "attorney@freshstart.demo", password: "Counsel!2026" };

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(CLIENT.email);
  const [password, setPassword] = useState(CLIENT.password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  const openSession = async (credentials: typeof CLIENT) => {
    setBusy(true);
    setError(null);
    try {
      await auth.login(credentials);
      const destination = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch {
      setError("No fue posible verificar el acceso de evaluación.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await openSession({ email, password });
  };

  return (
    <main className="min-h-screen bg-[var(--glade-surface)] px-4 py-8 sm:px-6 lg:flex lg:items-center">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <Badge color="gray" className="w-fit">Cliente + abogado en un solo proceso</Badge>
          <div className="flex items-center gap-3">
            <span className="glade-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white"><AppIcon name="brand" size={30} /></span>
            <div><p className="text-xl font-semibold text-[#111111]">FreshStart</p><p className="text-sm text-[#5f5f5f]">Bankruptcy case guidance</p></div>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-[#111111] sm:text-5xl">
            Entiende tu situación financiera antes de decidir el próximo paso.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[#5f5f5f]">
            Organiza ingresos, gastos, deudas, bienes y evidencia. Luego envía una solicitud estructurada para que un abogado evalúe alternativas contigo.
          </p>
          <div id="how-it-works" className="grid gap-3 sm:grid-cols-2">
            {[
              ["client", "El cliente abre la solicitud"],
              ["calculator", "La plantilla organiza las finanzas"],
              ["evidence", "Cada cifra se apoya con evidencia"],
              ["attorney", "El abogado revisa y guía la decisión"],
            ].map(([icon, label], index) => (
              <Card key={label} className="border border-[var(--glade-border)] bg-white shadow-none">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f3]"><AppIcon name={icon as "client" | "calculator" | "evidence" | "attorney"} size={20} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777]">Paso {index + 1}</p><p className="mt-1 font-semibold text-[#111111]">{label}</p></div></div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border border-[var(--glade-border)] bg-white shadow-xl shadow-black/5">
          <form className="space-y-5" onSubmit={submit}>
            <div><Badge color="success" className="mb-3 w-fit">Demo segura con datos inventados</Badge><h2 className="text-2xl font-semibold text-[#111111]">Selecciona una experiencia</h2><p className="mt-2 text-sm leading-6 text-[#5f5f5f]">Prueba el flujo completo desde ambos lados del caso.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" className="glade-button" disabled={busy} onClick={() => openSession(CLIENT)}><AppIcon name="client" className="mr-2" /> Entrar como cliente</Button>
              <Button type="button" color="dark" disabled={busy} onClick={() => openSession(ATTORNEY)}><AppIcon name="attorney" className="mr-2" /> Entrar como abogado</Button>
            </div>
            <div className="relative py-2 text-center text-xs text-[#777]"><span className="bg-white px-3">o utilizar credenciales</span><span className="absolute inset-x-0 top-1/2 -z-10 border-t border-[var(--glade-border)]" /></div>
            {error ? <Alert color="failure">{error}</Alert> : null}
            <div><Label htmlFor="login-email">Correo electrónico</Label><TextInput id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div><Label htmlFor="login-password">Contraseña</Label><TextInput id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            <Button type="submit" color="dark" size="lg" className="w-full" disabled={busy}>{busy ? "Abriendo..." : "Abrir portal"}</Button>
            <Alert color="info">Este producto prepara información para una consulta; no sustituye a un abogado ni presenta una petición.</Alert>
          </form>
        </Card>
      </div>
    </main>
  );
}
