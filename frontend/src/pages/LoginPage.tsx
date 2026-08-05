import { Alert, Badge, Button, Card, Label, TextInput } from "flowbite-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";

const DEMO_EMAIL = "reviewer@matterready.app";
const DEMO_PASSWORD = "MatterReady!2026";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.login({ email, password });
      const destination = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch {
      setError("The email or password could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:flex lg:items-center lg:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <Badge color="info" className="w-fit">
            Human-reviewed case preparation
          </Badge>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <AppIcon name="brand" size={27} />
              </span>
              <div>
                <p className="text-xl font-semibold text-slate-950">MatterReady</p>
                <p className="text-sm text-slate-500">Professional matter preparation workspace</p>
              </div>
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Turn scattered intake and documents into an accountable review package.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              A case reviewer uses MatterReady to confirm client information, compare supporting
              documents, approve differences, and see exactly what remains before professional
              review.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["intake", "Confirm the client record"],
              ["document", "Analyze supporting documents"],
              ["review", "Approve every difference"],
              ["readiness", "Deliver a review-ready matter"],
            ].map(([icon, label], index) => (
              <Card key={label} className="border border-slate-200 bg-white shadow-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <AppIcon name={icon as "intake" | "document" | "review" | "readiness"} size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <Badge color="success" className="mb-3 w-fit">
                Secure demo access
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Sign in to the reviewer workspace
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This portfolio environment uses invented case data and a short-lived JWT session.
              </p>
            </div>

            <Alert color="info">
              The demo account is prefilled so an evaluator can test the complete workflow.
            </Alert>
            {error ? <Alert color="failure">{error}</Alert> : null}

            <div>
              <Label htmlFor="login-email">Email</Label>
              <TextInput
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <TextInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Verifying access..." : "Open reviewer workspace"}
            </Button>

            <p className="text-center text-xs leading-5 text-slate-500">
              JWT expires automatically. No real legal or identity information should be entered.
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
