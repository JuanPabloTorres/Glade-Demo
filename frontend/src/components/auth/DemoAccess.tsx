import { useTranslation } from "react-i18next";
import { ROUTES } from "../../config/routes";
import { AppButton } from "../ui/AppButton";

/**
 * The two demo accounts, as one control each.
 *
 * **These are not an alternative authentication path.** Each button calls the
 * same `onEnter` the password form calls, with the credentials the backend
 * seeded, and the result is an ordinary session: a real `POST /auth/login`, a
 * real JWT, the same role routing. Nothing here sets a role, writes a token or
 * short-circuits `AuthProvider` — a demo that bypassed authentication would be
 * demonstrating something the product does not do.
 *
 * The credentials live here rather than in `LoginPage` because this is the only
 * thing that uses them, and they are the seeded demo pair from
 * `backend/app/repositories/seed.py` — public by design, synthetic by design,
 * and unchanged by this component. They are also no longer typed into the form:
 * pre-filling the password field put a real credential string one eye-toggle
 * away from being on screen during a screen-share, for no benefit once these
 * buttons work.
 */

/** Seeded in `backend/app/repositories/seed.py`. Not rotated, not generated. */
const DEMO_CLIENT = { email: "client@freshstart.demo", password: "FreshStart!2026" };
const DEMO_ATTORNEY = { email: "attorney@freshstart.demo", password: "Counsel!2026" };

export interface DemoCredentials {
  email: string;
  password: string;
}

interface DemoAccessProps {
  /** The page's own sign-in call — the same one the password form submits. */
  onEnter: (credentials: DemoCredentials, destination?: string) => Promise<void>;
  busy: boolean;
}

export function DemoAccess({ onEnter, busy }: DemoAccessProps) {
  const { t } = useTranslation(["auth"]);

  return (
    <section aria-labelledby="demo-access-title" className="rounded-base border border-default bg-neutral-secondary-soft p-4">
      <p id="demo-access-title" className="text-label text-body">
        {t("auth:login.demoAccessTitle")}
      </p>
      <p className="mt-1 text-xs leading-5 text-body">{t("auth:login.demoAccessHint")}</p>

      {/* Stacked below `sm` rather than squeezed into two columns: at 320px a
          two-up row leaves each label about 130px, which truncates both roles. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <AppButton
            type="button"
            size="lg"
            className="primary-action w-full"
            disabled={busy}
            iconLeft="client"
            onClick={() => {
              void onEnter(DEMO_CLIENT, ROUTES.home);
            }}
          >
            {t("auth:login.asClient")}
          </AppButton>
          <p className="text-xs leading-5 text-body">{t("auth:login.clientHint")}</p>
        </div>
        <div className="space-y-1.5">
          <AppButton
            type="button"
            size="lg"
            color="light"
            className="secondary-action w-full"
            disabled={busy}
            iconLeft="attorney"
            onClick={() => {
              void onEnter(DEMO_ATTORNEY, ROUTES.home);
            }}
          >
            {t("auth:login.asAttorney")}
          </AppButton>
          <p className="text-xs leading-5 text-body">{t("auth:login.attorneyHint")}</p>
        </div>
      </div>
    </section>
  );
}
