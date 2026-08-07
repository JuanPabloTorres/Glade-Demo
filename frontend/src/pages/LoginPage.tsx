import { Alert, Card } from "flowbite-react";
import axios from "axios";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { FloatingField } from "../components/molecules/FloatingField";
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

  if (auth.isAuthenticated) return <Navigate to={ROUTES.home} replace />;

  // Exactly one alert slot: error > validation error > background-load fallback.
  // These conditions are not mutually exclusive in the underlying state (a
  // background failure and a stale validation error could both be true at
  // once), so priority is chosen explicitly instead of stacking every
  // active Alert.
  const activeAlert = error
    ? { color: "failure" as const, message: error }
    : validationError
      ? { color: "warning" as const, message: validationError }
      : backgroundFailed
        ? { color: "info" as const, message: t("auth:login.backgroundFallback") }
        : null;

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

      <div className="absolute right-4 top-4 z-10">
        <LanguageSelector compact />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-360 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-16 lg:px-10 xl:px-16">
        <section className="max-w-3xl text-white">
          <div className="mb-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              {t("auth:login.heroBadge")}
            </p>
            <div className="flex items-center gap-4">
              <span className="brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl shadow-indigo-950/30">
                <AppIcon name="brand" size={30} />
              </span>
              <div>
                <p className="text-xl font-semibold tracking-[-0.02em]">Fresh Start</p>
                <p className="text-sm text-white/70">{t("common:app.subtitle")}</p>
              </div>
            </div>
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {t("auth:login.heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            {t("auth:login.heroBody")}
          </p>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <Card className="w-full max-w-120 overflow-hidden border border-white/40 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <form className="space-y-6" onSubmit={submit}>
              {/* Header follows Flowbite's authentication-modal block: title on a
                  ruled row, no badge stack above it. The "demo" badge that used
                  to sit here is gone — the disclaimer at the foot of this form
                  already says the data is synthetic, and said it twice. */}
              <div className="border-b border-default pb-4 md:pb-5">
                <h2 className="text-lg font-medium text-heading sm:text-xl">{t("auth:login.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-body">{t("auth:login.subtitle")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <AppButton type="button" size="lg" className="primary-action w-full" disabled={busy} iconLeft="client" onClick={() => openSession(CLIENT)}>
                    {t("auth:login.asClient")}
                  </AppButton>
                  <p className="mt-1.5 text-xs leading-4 text-body">
                    {t("auth:login.clientHint")}
                  </p>
                </div>
                <div>
                  <AppButton type="button" size="lg" color="light" className="secondary-action w-full" disabled={busy} iconLeft="attorney" onClick={() => openSession(ATTORNEY)}>
                    {t("auth:login.asAttorney")}
                  </AppButton>
                  <p className="mt-1.5 text-xs leading-4 text-body">
                    {t("auth:login.attorneyHint")}
                  </p>
                </div>
              </div>

              <p className="text-label text-body">{t("auth:login.credentials")}</p>

              {activeAlert ? (
                <Alert color={activeAlert.color} rounded>
                  {activeAlert.message}
                </Alert>
              ) : null}

              {/* Floating-label fields (Flowbite's floating form block). The label
                  doubles as the field's resting placeholder, so the form loses a
                  stacked label row per field without losing the label itself. */}
              <div className="space-y-7">
                <FloatingField
                  id="login-email"
                  type="email"
                  label={t("auth:login.email")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <FloatingField
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  label={t("auth:login.password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  trailing={
                    <button
                      type="button"
                      aria-label={showPassword ? t("auth:login.hidePassword") : t("auth:login.showPassword")}
                      className="flex h-11 w-11 items-center justify-center text-body hover:text-fg-brand"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <AppIcon name={showPassword ? "eye-hide" : "eye-show"} size={18} />
                    </button>
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center">
                  <input
                    id="login-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded-xs border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                  />
                  <label htmlFor="login-remember" className="ms-2 text-sm font-medium text-heading">
                    {t("auth:login.rememberMe")}
                  </label>
                </div>
                <span className="ms-auto text-xs text-body">{t("auth:login.forgotPassword")}</span>
              </div>

              <AppButton type="submit" size="lg" className="primary-action w-full" disabled={busy} iconRight={!busy ? "arrow-right" : undefined}>
                {busy ? t("auth:login.openingPortal") : t("auth:login.openPortal")}
              </AppButton>

              <p className="text-xs leading-5 text-body">{t("auth:login.disclaimer")}</p>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
