import { Alert, Card } from "flowbite-react";
import axios from "axios";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { IconButton } from "../components/ui/IconButton";
import { CheckboxField } from "../components/forms/fields";
import { FloatingField } from "../components/molecules/FloatingField";
import { LanguageSwitcher } from "../components/molecules/LanguageSwitcher";
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

  // Exactly one alert slot, and only for things the user can act on: a failed
  // sign-in, or a field they need to correct.
  //
  // A third state used to live here — "the external background could not load,
  // a fallback was applied to keep it legible". That is a decorative asset
  // failing and the page recovering by itself; there is no action to take, and
  // naming the recovery mechanism tells the user about an implementation
  // detail while they are trying to sign in. The recovery still happens (see
  // `backgroundFailed` below), silently, which is what a fallback is for.
  const activeAlert = error
    ? { color: "failure" as const, message: error }
    : validationError
      ? { color: "warning" as const, message: validationError }
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

      {/* `onDark`: this control sits on the hero photograph, not on a surface. */}
      <div className="absolute right-4 top-4 z-raised">
        <LanguageSwitcher compact tone="onDark" />
      </div>

      {/*
        DOM order is the phone order: brand, then the form, then the hero copy.
        Previously the whole hero came first in a single column, so signing in on
        a phone meant scrolling past roughly 400px of marketing — an eyebrow, the
        brand block, a 36px headline and a body paragraph — before the first
        field. The task comes first; the copy stays, below it, for anyone who
        wants it.

        From `lg` the two-column layout is unchanged, and it is restored with
        explicit grid placement rather than `order` utilities: the brand and hero
        copy occupy rows 1 and 2 of the first column, and the card spans both
        rows of the second. That keeps one copy of every element in the markup —
        an `lg:hidden` duplicate of the brand block would be two things to keep
        in sync for one breakpoint.
      */}
      <div className="relative mx-auto grid min-h-screen w-full max-w-360 content-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-16 lg:gap-y-7 lg:px-10 xl:px-16">
        {/* `pe-28` reserves the corner the absolutely-positioned language
            switcher occupies. It sat on the eyebrow before, which was the
            topmost element then; the brand row is the topmost element now. */}
        {/* `min-w-0` is load-bearing, not defensive. A grid item's automatic
            minimum size is its min-content, and the `truncate` below sets
            `white-space: nowrap`, whose min-content is the *whole* string. On a
            320px screen that widened the single-column track to 351px and
            dragged the form card 47px off-screen — clipped rather than
            scrollable, because `<main>` is `overflow-hidden`. Clamping the
            minimum lets the track stay at the viewport width and the truncation
            do its job. */}
        <div className="flex min-w-0 items-center gap-4 pe-24 text-white lg:col-start-1 lg:row-start-1 lg:self-end lg:pe-0">
          <span className="brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xl shadow-indigo-950/30 sm:h-14 sm:w-14">
            <AppIcon name="brand" size={30} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-[-0.02em]">Fresh Start</p>
            <p className="truncate text-sm text-white/70">{t("common:app.subtitle")}</p>
          </div>
        </div>

        <section className="flex min-w-0 items-center justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center lg:justify-end">
          <Card className="w-full max-w-120 overflow-hidden border border-white/40 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {/* `space-y-4` below `sm`: at 320x720 the six-gap rhythm put the sign-in
                  button 84px below the fold, so a phone user had to scroll past the
                  form to submit it. Gated by e2e/governed-viewports.spec.ts. */}
            <form className="space-y-4 sm:space-y-6" onSubmit={submit}>
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
                  <p className="mt-1.5 hidden text-xs leading-4 text-body sm:block">
                    {t("auth:login.clientHint")}
                  </p>
                </div>
                <div>
                  <AppButton type="button" size="lg" color="light" className="secondary-action w-full" disabled={busy} iconLeft="attorney" onClick={() => openSession(ATTORNEY)}>
                    {t("auth:login.asAttorney")}
                  </AppButton>
                  <p className="mt-1.5 hidden text-xs leading-4 text-body sm:block">
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
              <div className="space-y-5 sm:space-y-7">
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
                    <IconButton
                      icon={showPassword ? "eye-hide" : "eye-show"}
                      label={showPassword ? t("auth:login.hidePassword") : t("auth:login.showPassword")}
                      onClick={() => setShowPassword((value) => !value)}
                    />
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* `min-w-0` because CheckboxField is full-width by design and
                    this row is a flex container: without it the label's text
                    inflates the item's automatic minimum size and pushes the
                    forgot-password note off a 320px screen. */}
                <div className="min-w-0">
                  <CheckboxField
                    id="login-remember"
                    label={t("auth:login.rememberMe")}
                    checked={rememberMe}
                    onChange={setRememberMe}
                  />
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

        <section className="max-w-3xl text-white lg:col-start-1 lg:row-start-2 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            {t("auth:login.heroBadge")}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {t("auth:login.heroTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 sm:mt-6 sm:text-lg sm:leading-8">
            {t("auth:login.heroBody")}
          </p>
        </section>
      </div>
    </main>
  );
}
