import { Label, Select, TextInput } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";

export interface DataTableToolbarProps {
  query: string;
  sort: string;
  pageSize: number;
  searchPlaceholder?: string;
  sortOptions: Array<{ value: string; label: string }>;
  pageSizeOptions: number[];
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onClearFilters: () => void;
}

export function DataTableToolbar({
  query,
  sort,
  pageSize,
  searchPlaceholder = "Buscar...",
  sortOptions,
  pageSizeOptions,
  onQueryChange,
  onSortChange,
  onPageSizeChange,
  onClearFilters,
}: DataTableToolbarProps) {
  const { t } = useTranslation(["tables", "common"]);

  return (
    // Wraps instead of squeezing. It became a single row at `sm`, where the two
    // fixed-width selects (256px + 160px) plus the button left the search field
    // about 22px wide at 768 — present, focusable, and useless. Now the row only
    // forms at `md`, it wraps, and the search keeps a 12rem floor so it drops to
    // its own line rather than collapsing.
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div className="min-w-48 flex-1">
        <Label htmlFor="table-search" className="sr-only">{t("tables:toolbar.search")}</Label>
        <TextInput
          id="table-search"
          className="app-input"
          placeholder={searchPlaceholder || t("tables:toolbar.searchPlaceholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="sm:w-64">
        <Label htmlFor="table-sort" className="sr-only">{t("tables:toolbar.sort")}</Label>
        <Select
          id="table-sort"
          className="app-input"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:w-40">
        <Label htmlFor="table-page-size" className="sr-only">{t("tables:toolbar.rowsPerPage")}</Label>
        <Select
          id="table-page-size"
          className="app-input"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {t("common:pagination.rows", { count: size })}
            </option>
          ))}
        </Select>
      </div>
      <AppButton color="light" size="sm" onClick={onClearFilters}>
        {t("common:actions.clearFilters")}
      </AppButton>
    </div>
  );
}
