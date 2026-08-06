import { Alert, Badge, Card, Label, TextInput } from "flowbite-react";
import axios from "axios";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { LanguageSelector } from "../components/molecules/LanguageSelector";
import { ROUTES } from "../config/routes";
import { resolveApiErrorMessage } from "../i18n/backendErrors";

const CLIENT = { email: "client@freshstart.demo", password: "FreshStart!2026" };
const ATTORNEY = { email: "attorney@freshstart.demo", password: "Counsel!2026" };
const LOGIN_BACKGROUND =
  "https://media.istockphoto.com/id/1304258192/photo/get-out-of-debt-and-get-back-the-life-you-deserve.jpg?s=612x612&w=0&k=20&c=9Zscc_cCnJepabv5iX2UfjJE3TSqHxQUW7enENs57JM=";

// Deliberately NOT wrapped in AppShell (see router.tsx: "/login" is a
// sibling of the ProtectedRoute tree, not a child). Login is a full-bleed,
// unauthenticated hero layout with its own background image and two-column
// grid — forcing it through the authenticated sidebar+header+footer shell
// would mean hiding all three behind conditionals for a single page. Kept
// as its own layout on purpose, not an oversight.
export function LoginPage() {
  const { t } = useTranslation(["auth", "validation"]);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(CLIENT.email);
  const [password, setPassword] = useState(CLIENT.password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const steps = t("auth:login.steps.items", { returnObjects: true }) as Array<{ title: string; detail: string }>;

  if (auth.isAuthenticated) return <Navigate to={ROUTES.home} replace />;

  const openSession = async (credentials: typeof CLIENT) => {
    setBusy(true);
    setError(null);
    try {
      await auth.login(credentials, rememberMe);
      const destination = (location.state as { from?: string } | null)?.from ?? ROUTES.home;
      navigate(destination, { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(resolveApiErrorMessage(error.response?.data));
      } else {
        setError(t("validation:invalidCredentials"));
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);
    if (!email.trim() || !email.includes("@")) {
      setValidationError(t("validation:emailRequired"));
      return;
    }
    if (!password.trim()) {
      setValidationError(t("validation:passwordRequired"));
      return;
    }
    await openSession({ email, password });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09111f]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: backgroundFailed ? "none" : `url("${LOGIN_BACKGROUND}")` }}
      />
      <img
        src={LOGIN_BACKGROUND}
        alt=""
        className="sr-only"
        onError={() => setBackgroundFailed(true)}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,15,29,0.92)_0%,rgba(7,15,29,0.72)_48%,rgba(7,15,29,0.42)_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(79,70,229,0.26),transparent_35%)]" />

      <div className="absolute right-4 top-4 z-10">
        <LanguageSelector compact />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-360 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-16 lg:px-10 xl:px-16">
        <section className="max-w-3xl text-white">
          <Badge color="gray" className="mb-6 w-fit border border-white/15 bg-white/10 px-3 py-1.5 text-white backdrop-blur-md">
            {t("auth:login.heroBadge")}
          </Badge>

          <div className="mb-7 flex items-center gap-4">
            <span className="brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl shadow-indigo-950/30">
              <AppIcon name="brand" size={30} />
            </span>
            <div>
              <p className="text-xl font-semibold tracking-[-0.02em]">FreshStart</p>
              <p className="text-sm text-white/70">{t("common:app.subtitle")}</p>
            </div>
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {t("auth:login.heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            {t("auth:login.heroBody")}
          </p>

          <div id="how-it-works" className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["client", steps[0]?.title ?? "", steps[0]?.detail ?? ""],
              ["calculator", steps[1]?.title ?? "", steps[1]?.detail ?? ""],
              ["evidence", steps[2]?.title ?? "", steps[2]?.detail ?? ""],
              ["attorney", steps[3]?.title ?? "", steps[3]?.detail ?? ""],
            ].map(([icon, title, detail], index) => (
              <Card key={title} className="border border-white/15 bg-white/10 shadow-none backdrop-blur-md">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1e293b] shadow-sm">
                    <AppIcon name={icon as "client" | "calculator" | "evidence" | "attorney"} size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{t("auth:login.steps.step", { index: index + 1 })}</p>
                    <p className="mt-1 font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/68">{detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <Card className="w-full max-w-120 overflow-hidden border border-white/40 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <form className="space-y-6" onSubmit={submit}>
              <div>
                <Badge color="success" className="mb-4 w-fit">{t("auth:login.demoBadge")}</Badge>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-(--glade-black) sm:text-3xl">{t("auth:login.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-(--glade-muted)">{t("auth:login.subtitle")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <AppButton type="button" size="lg" className="primary-action w-full" disabled={busy} iconLeft="client" onClick={() => openSession(CLIENT)}>
                    {t("auth:login.asClient")}
                  </AppButton>
                  <p className="mt-1.5 text-xs leading-4 text-(--color-text-muted)">
                    {t("auth:login.clientHint")}
                  </p>
                </div>
                <div>
                  <AppButton type="button" size="lg" color="light" className="secondary-action w-full" disabled={busy} iconLeft="attorney" onClick={() => openSession(ATTORNEY)}>
                    {t("auth:login.asAttorney")}
                  </AppButton>
                  <p className="mt-1.5 text-xs leading-4 text-(--color-text-muted)">
                    {t("auth:login.attorneyHint")}
                  </p>
                </div>
              </div>

              <div className="relative flex items-center py-1">
                <div className="h-px flex-1 bg-(--glade-border)" />
                <span className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8494]">{t("auth:login.credentials")}</span>
                <div className="h-px flex-1 bg-(--glade-border)" />
              </div>

              {error ? <Alert color="failure" rounded>{error}</Alert> : null}
              {validationError ? <Alert color="warning" rounded>{validationError}</Alert> : null}
              {backgroundFailed ? (
                <Alert color="info" rounded>
                  {t("auth:login.backgroundFallback")}
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-semibold text-[#273244]">{t("auth:login.email")}</Label>
                <TextInput className="app-input" id="login-email" type="email" icon={() => <AppIcon name="client" size={16} />} value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="font-semibold text-[#273244]">{t("auth:login.password")}</Label>
                <div className="relative">
                  <TextInput className="app-input" id="login-password" type={showPassword ? "text" : "password"} icon={() => <AppIcon name="shield" size={16} />} value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button
                    type="button"
                    aria-label={showPassword ? t("auth:login.hidePassword") : t("auth:login.showPassword")}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <AppIcon name={showPassword ? "eye-hide" : "eye-show"} size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-(--color-text-muted)">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="rounded border-slate-300"
                  />
                  {t("auth:login.rememberMe")}
                </label>
                <span className="text-xs text-(--color-text-muted)">{t("auth:login.forgotPassword")}</span>
              </div>

              <AppButton type="submit" size="lg" className="primary-action w-full" disabled={busy} iconRight={!busy ? "arrow-right" : undefined}>
                {busy ? t("auth:login.openingPortal") : t("auth:login.openPortal")}
              </AppButton>

              <Alert color="info" rounded>
                {t("auth:login.disclaimer")}
              </Alert>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
