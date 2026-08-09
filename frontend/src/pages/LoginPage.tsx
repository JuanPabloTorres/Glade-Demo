import { Alert, Card } from "flowbite-react";
import axios from "axios";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon } from "../components/atoms/AppIcon";
import { AppButton } from "../components/ui/AppButton";
import { IconButton } from "../components/ui/IconButton";
import { DemoAccess, type DemoCredentials } from "../components/auth/DemoAccess";
import { CheckboxField } from "../components/forms/fields";
import { FloatingField } from "../components/molecules/FloatingField";
import { LanguageSwitcher } from "../components/molecules/LanguageSwitcher";
import { ROUTES } from "../config/routes";
import { resolveApiErrorMessage } from "../i18n/backendErrors";

/**
 * The login backdrop, pointed at the requested iStock asset.
 *
 * The page still treats it as atmosphere behind the form, with the scrim and
 * layout doing the actual legibility work. Because the asset is hosted on a
 * third-party origin, the deployment CSP has to allow that host explicitly.
 */
const LOGIN_BACKDROP =
  "https://media.istockphoto.com/id/930475882/photo/smiling-colleagues-working-online-together-at-an-office-desk.jpg?s=170667a&w=0&k=20&c=JDGopA6CPDtUOSCptOhHdkvG48vi2XT_iza5vM5RR0k=";

// Deliberately NOT wrapped in AppShell (see router.tsx: "/login" is a
// sibling of the ProtectedRoute tree, not a child). Login is a full-bleed,
// unauthenticated hero layout with its own background image and two-column
// grid — forcing it through the authenticated sidebar+header+footer shell
// would mean hiding all three behind conditionals for a single page. Kept
// as its own layout on purpose, not an oversight.
export function LoginPage() {
  const { t } = useTranslation(["auth", "validation", "common"]);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (auth.isAuthenticated) return <Navigate to={ROUTES.home} replace />;

  // Exactly one alert slot, and only for things the user can act on: a failed
  // sign-in, or a field they need to correct.
  const activeAlert = error
    ? { color: "failure" as const, message: error }
    : validationError
      ? { color: "warning" as const, message: validationError }
      : null;

  /**
   * The one way into the application, used by the password form and by both
   * demo buttons.
   *
   * There is no demo branch. A button that set a role or wrote a token would
   * make the demo prove something the product does not do; these credentials go
   * through `authApi.login`, get a real JWT, and land in the same session the
   * form produces. Role routing then happens where it always does — `RoleHomePage`
   * reads the authenticated user, so the attorney arrives at the inbox and the
   * client at their workspace without this page deciding anything.
   */
  const openSession = async (credentials: DemoCredentials, destination?: string) => {
    setBusy(true);
    setError(null);
    setValidationError(null);
    try {
      await auth.login(credentials, rememberMe);
      const fallbackDestination = (location.state as { from?: string } | null)?.from ?? ROUTES.home;
      navigate(destination ?? fallbackDestination, { replace: true });
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
      {/* `bg-cover` on a vector with `preserveAspectRatio="xMidYMid slice"`
          keeps the composition centred at every governed width instead of
          cropping into a focal point that only works at one aspect ratio. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${LOGIN_BACKDROP}")` }}
      />
      {/* The scrim is stronger on the left, where the copy sits, and lighter on
          the right, where the card's own surface already provides contrast.
          Below `lg` the card sits over the middle, so the phone scrim is flat
          and heavier — a horizontal gradient tuned for two columns leaves text
          on a light patch when there is only one. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(7,15,29,0.82)] lg:bg-[linear-gradient(90deg,rgba(7,15,29,0.94)_0%,rgba(7,15,29,0.88)_34%,rgba(7,15,29,0.58)_62%,rgba(7,15,29,0.30)_100%)]"
      />

      {/* `onDark`: this control sits on the hero, not on a surface. */}
      <div className="absolute right-4 top-4 z-raised">
        <LanguageSwitcher compact tone="onDark" />
      </div>

      {/*
        DOM order is the phone order: brand, then the purpose, then the form.
        The task comes first on large screens too; the copy stays above the form
        on mobile so the hierarchy reads naturally before the reviewer reaches
        the inputs.

        From `lg` the two-column layout is restored with explicit grid placement
        rather than `order` utilities, so there is one copy of every element in
        the markup rather than an `lg:hidden` duplicate to keep in sync.
      */}
      <div className="relative mx-auto grid min-h-screen w-full max-w-360 content-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-16 lg:gap-y-7 lg:px-10 xl:px-16">
        {/* `pe-24` reserves the corner the absolutely-positioned language
            switcher occupies. `min-w-0` is load-bearing: a grid item's automatic
            minimum size is its min-content, and `truncate` sets `nowrap`, whose
            min-content is the whole string — which once widened the 320px track
            to 351px and clipped the card. */}
        <div className="flex min-w-0 items-center gap-4 pe-24 text-white lg:col-start-1 lg:row-start-1 lg:self-end lg:pe-0">
          <span className="brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xl shadow-indigo-950/30 sm:h-14 sm:w-14">
            <AppIcon name="brand" size={30} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-[-0.02em]">{t("common:app.name")}</p>
            <p className="truncate text-sm text-white/70">{t("common:app.subtitle")}</p>
          </div>
        </div>

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

        <section className="flex min-w-0 items-center justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center lg:justify-end">
          <Card className="w-full max-w-120 overflow-hidden border border-white/40 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {/*
              Hierarchy, top to bottom: what this is, how to sign in, and then —
              separated, secondary — how to get in without credentials.

              The demo buttons used to sit above the fields, which put the
              shortcut ahead of the thing it is a shortcut for and made the
              password form look optional. They are below the primary action
              now, in their own panel, which is also the order the eye needs:
              a reviewer looking for "just let me in" finds it after seeing what
              the real sign-in is.
            */}
            <form className="space-y-4 sm:space-y-6" onSubmit={submit}>
              <div className="border-b border-default pb-4 md:pb-5">
                <h2 className="text-lg font-medium text-heading sm:text-xl">{t("auth:login.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-body">{t("auth:login.subtitle")}</p>
              </div>

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

              <DemoAccess onEnter={openSession} busy={busy} />

              <p className="text-xs leading-5 text-body">{t("auth:login.disclaimer")}</p>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
