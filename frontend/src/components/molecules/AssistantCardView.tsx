import type { AssistantCard } from "../../types/bankruptcy";

/**
 * Renders one assistant card (ADR 0002).
 *
 * `data` is an open map because the specialists decide what is worth
 * surfacing, so every value is stringified defensively here rather than
 * trusted to be a primitive — a nested object reaching React as a child
 * would throw, and a model can produce one.
 */
export function AssistantCardView({ card }: { card: AssistantCard }) {
  const entries = Object.entries(card.data ?? {});
  return (
    <article className="rounded-xl border border-(--color-border) bg-(--color-surface-muted) p-3">
      <h3 className="text-sm font-semibold text-(--color-text)">{card.title}</h3>
      {card.description ? (
        <p className="mt-1 text-xs text-(--color-text-muted)">{card.description}</p>
      ) : null}
      {entries.length ? (
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-baseline justify-between gap-2">
              <dt className="truncate text-xs text-(--color-text-muted)">{key}</dt>
              <dd className="text-xs font-medium text-(--color-text)">{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}
