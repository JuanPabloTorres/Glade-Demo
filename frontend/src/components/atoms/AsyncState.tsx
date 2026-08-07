import { Alert, Spinner } from "flowbite-react";
import { useTranslation } from "react-i18next";

/**
 * The three states every async surface needs. Two problems fixed here:
 *
 * - The default copy was hardcoded English ("Loading", "Unable to load this
 *   information."), so a Spanish session fell back to English whenever a caller
 *   omitted the prop. Defaults now come from `common:states.*`.
 * - The surfaces used raw palette classes (`text-gray-500`, `border-gray-300`,
 *   `bg-gray-50`), bypassing the design tokens. They now use the semantic
 *   layer, so a palette change in index.css reaches them.
 */

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation("common");
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-body">
      <Spinner />
      <span className="text-sm font-medium">{label ?? t("states.loading")}</span>
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  const { t } = useTranslation("common");
  return <Alert color="failure">{message ?? t("states.loadError")}</Alert>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-base border border-dashed border-default-medium bg-neutral-secondary-soft p-8 text-center text-sm text-body">
      {message}
    </div>
  );
}
