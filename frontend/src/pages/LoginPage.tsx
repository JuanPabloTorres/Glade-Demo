import { Alert, Badge, Button, Card, Label, TextInput } from "flowbite-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";

const CLIENT = { email: "client@freshstart.demo", password: "FreshStart!2026" };
const ATTORNEY = { email: "attorney@freshstart.demo", password: "Counsel!2026" };
const LOGIN_BACKGROUND =
  "https://media.istockphoto.com/id/1304258192/photo/get-out-of-debt-and-get-back-the-life-you-deserve.jpg?s=612x612&w=0&k=20&c=9Zscc_cCnJepabv5iX2UfjJE3TSqHxQUW7enENs57JM=";

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
    <main className="relative min-h-screen overflow-hidden bg-[#09111f]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${LOGIN_BACKGROUND}")` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,15,29,0.92)_0%,rgba(7,15,29,0.72)_48%,rgba(7,15,29,0.42)_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(79,70,229,0.26),transparent_35%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-16 lg:px-10 xl:px-16">
        <section className="max-w-3xl text-white">
          <Badge color="gray" className="mb-6 w-fit border border-white/15 bg-white/10 px-3 py-1.5 text-white backdrop-blur-md">
            Cliente y abogado en un solo proceso
          </Badge>

          <div className="mb-7 flex items-center gap-4">
            <span className="brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl shadow-indigo-950/30">
              <AppIcon name="brand" size={30} />
            </span>
            <div>
              <p className="text-xl font-semibold tracking-[-0.02em]">FreshStart</p>
              <p className="text-sm text-white/70">Bankruptcy case guidance</p>
            </div>
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            Recupera claridad financiera antes de tomar una decisión importante.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            Organiza ingresos, gastos, deudas, bienes y evidencia en una sola experiencia guiada. Luego comparte un expediente estructurado con el abogado que evaluará tu caso.
          </p>

          <div id="how-it-works" className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["client", "Inicia tu solicitud", "Completa el perfil del hogar y explica tu situación."],
              ["calculator", "Organiza tus finanzas", "Convierte ingresos y gastos a una vista mensual clara."],
              ["evidence", "Respalda la información", "Relaciona cada dato importante con evidencia."],
              ["attorney", "Prepárate para la consulta", "El abogado recibe alertas, faltantes y preguntas clave."],
            ].map(([icon, title, detail], index) => (
              <Card key={title} className="border border-white/15 bg-white/10 shadow-none backdrop-blur-md">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1e293b] shadow-sm">
                    <AppIcon name={icon as "client" | "calculator" | "evidence" | "attorney"} size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Paso {index + 1}</p>
                    <p className="mt-1 font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/68">{detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <Card className="w-full max-w-[480px] overflow-hidden border border-white/40 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <form className="space-y-6" onSubmit={submit}>
              <div>
                <Badge color="success" className="mb-4 w-fit">Demo con información ficticia</Badge>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--glade-black)] sm:text-3xl">Accede al portal</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--glade-muted)]">Selecciona un rol para evaluar el recorrido completo o utiliza las credenciales del demo.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Button type="button" size="lg" className="primary-action w-full" disabled={busy} onClick={() => openSession(CLIENT)}>
                    <AppIcon name="client" className="mr-2" />
                    Entrar como cliente
                  </Button>
                  <p className="mt-1.5 text-xs leading-4 text-[var(--color-text-muted)]">
                    Verás tu expediente, progreso y el chat de guía inteligente.
                  </p>
                </div>
                <div>
                  <Button type="button" size="lg" color="light" className="secondary-action w-full" disabled={busy} onClick={() => openSession(ATTORNEY)}>
                    <AppIcon name="attorney" className="mr-2" />
                    Entrar como abogado
                  </Button>
                  <p className="mt-1.5 text-xs leading-4 text-[var(--color-text-muted)]">
                    Verás la bandeja de casos, alertas y evidencia de todos los clientes.
                  </p>
                </div>
              </div>

              <div className="relative flex items-center py-1">
                <div className="h-px flex-1 bg-[var(--glade-border)]" />
                <span className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8494]">Credenciales</span>
                <div className="h-px flex-1 bg-[var(--glade-border)]" />
              </div>

              {error ? <Alert color="failure" rounded>{error}</Alert> : null}

              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-semibold text-[#273244]">Correo electrónico</Label>
                <TextInput className="app-input" id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="font-semibold text-[#273244]">Contraseña</Label>
                <TextInput className="app-input" id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>

              <Button type="submit" size="lg" className="primary-action w-full" disabled={busy}>
                {busy ? "Abriendo portal..." : "Abrir portal"}
                {!busy ? <AppIcon name="arrow-right" className="ml-2" /> : null}
              </Button>

              <Alert color="info" rounded>
                FreshStart organiza información para una consulta. No sustituye la evaluación ni el consejo de un abogado.
              </Alert>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
