import { currency } from "../../workspace/caseMetrics";
import type { AppIconName } from "../atoms/AppIcon";
import { AppIcon } from "../atoms/AppIcon";

export interface MetricTile {
  /** Stable identity — never the array index, and never the label. */
  id: string;
  label: string;
  value: number;
  /** Renders the raw number (a count) instead of a currency amount. */
  count?: boolean;
  /** Decorative — the label is what names the figure. */
  icon?: AppIconName;
}

interface MetricTilesProps {
  tiles: MetricTile[];
  /** Columns at the widest breakpoint. Below `sm` it is always one column. */
  columns?: 3 | 4;
  className?: string;
}

const COLUMNS: Record<3 | 4, string> = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * The financial headline figures.
 *
 * The case workspace and the client dashboard each built this grid inline, with
 * different padding, different type sizes and a `Card` in one and a plain
 * `div` in the other — the same four numbers reading as two different things
 * depending on which screen you were on.
 *
 * `min-w-0` on the tile matters: these sit in a grid, and a grid item's
 * automatic minimum size is its content, so a long formatted amount would push
 * the track wider than its share and overflow the row at 320px.
 */
export function MetricTiles({ tiles, columns = 4, className = "" }: MetricTilesProps) {
  return (
    <div className={`grid gap-3 ${COLUMNS[columns]} ${className}`}>
      {tiles.map((tile) => (
        <div key={tile.id} className="metric-tile flex min-w-0 items-center gap-3 rounded-xl p-4">
          {tile.icon ? (
            <span className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <AppIcon name={tile.icon} size={18} />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-[-0.02em] text-heading">
              {tile.count ? tile.value : currency(tile.value)}
            </p>
            <p className="truncate text-sm text-body">{tile.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
