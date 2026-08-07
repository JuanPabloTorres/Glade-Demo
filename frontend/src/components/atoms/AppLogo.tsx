import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ROUTES } from "../../config/routes";
import { AppIcon } from "./AppIcon";

interface AppLogoProps {
  /** Icon-only mode for the collapsed sidebar rail. The name stays in the accessible name. */
  markOnly?: boolean;
  /** Renders the product tagline under the name. Header only — the sidebar has no room. */
  showTagline?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The product mark. One component, so "Fresh Start" is spelled — and spaced —
 * identically in the header, the sidebar and anywhere else it appears, and a
 * future logo asset replaces a single `AppIcon`, not four copies of this block.
 *
 * The name comes from `common:app.name`, not a literal, so the string lives
 * with the rest of the copy. It is never abbreviated to "FreshStart": the
 * product is two words.
 *
 * Always a link home. A logo that is not clickable is a control users try
 * anyway, and this one has an obvious destination.
 */
export function AppLogo({ markOnly = false, showTagline = false, size = "md", className = "" }: AppLogoProps) {
  const { t } = useTranslation(["common"]);
  const name = t("common:app.name");
  const markSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const glyphSize = size === "sm" ? 20 : 25;

  return (
    <Link
      to={ROUTES.home}
      aria-label={name}
      // `min-w-0` on the link itself, not only on the text span inside it.
      // This is a flex item of the header row, and a flex item's automatic
      // minimum size is its content — so without it the link refuses to shrink,
      // the `truncate` below can never engage, and at 320px the name and
      // tagline push the header's right-hand controls off the screen.
      className={`flex min-w-0 items-center rounded-base outline-none focus-visible:ring-4 focus-visible:ring-brand-soft ${
        markOnly ? "justify-center" : "gap-3"
      } ${className}`}
    >
      <span
        className={`brand-mark flex ${markSize} shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-indigo-950/15`}
      >
        <AppIcon name="brand" size={glyphSize} />
      </span>
      {markOnly ? null : (
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold tracking-tight text-heading sm:text-lg">{name}</span>
          {showTagline ? (
            <span className="block truncate text-xs font-medium text-body">{t("common:app.subtitle")}</span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
