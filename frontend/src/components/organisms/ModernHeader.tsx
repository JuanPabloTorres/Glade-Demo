import { Badge, Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { useAiHealth } from "../../hooks/useAiHealth";
import { AppLogo } from "../atoms/AppLogo";
import { LanguageToggle } from "../molecules/LanguageToggle";
import { UserMenu } from "./navigation/UserMenu";

/**
 * The global header, deliberately thin.
 *
 * On a phone this is the only chrome above the content, so it carries exactly
 * what is global and nothing that already has a slot in the bottom bar: the
 * product mark, the language toggle and the account menu. Adding page actions
 * here would duplicate navigation the bar already owns.
 *
 * The AI status badge is desktop-only — it is diagnostic, not navigational, and
 * on a 320px viewport it competes with the three controls that matter. The same
 * state is spelled out inside the assistant itself, which is where a user acts
 * on it.
 *
 * From 768px up the sidebar carries the product mark, so the header's copy of
 * it would be a second brand block on the same screen; it renders below `md`
 * only. The version badge lives in the footer, its single home.
 *
 * `<UserMenu />` rather than inline markup, so the product has one avatar menu.
 */
export function ModernHeader() {
  const { t } = useTranslation(["navigation", "common"]);
  const aiHealth = useAiHealth();

  return (
    <header className="sticky top-0 z-20 border-b border-default bg-neutral-primary-soft shadow-[0_4px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="glade-gradient h-1" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Below md this is the product's only visible name; at md+ the sidebar
            owns it and this collapses away rather than repeating it. */}
        <AppLogo showTagline className="md:hidden" />
        <div className="hidden min-w-0 md:block" />

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle compact />

          <Tooltip
            content={
              aiHealth.loading
                ? t("navigation:header.aiStatusLoading")
                : aiHealth.data
                  ? t("navigation:header.aiProvider", { provider: aiHealth.data.provider, model: aiHealth.data.model })
                  : t("navigation:header.aiStatusUnavailable")
            }
          >
            <button
              type="button"
              onClick={() => void aiHealth.refresh()}
              className="hidden min-h-9 items-center md:inline-flex"
              aria-label={t("navigation:header.refreshAiStatus")}
            >
              <Badge color={aiHealth.data?.available ? "success" : "warning"} className="px-2.5 py-1">
                {aiHealth.data?.available ? t("navigation:header.aiConnected") : t("navigation:header.aiDisconnected")}
              </Badge>
            </button>
          </Tooltip>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
