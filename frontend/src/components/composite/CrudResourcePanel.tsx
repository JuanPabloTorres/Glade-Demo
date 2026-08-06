import { Badge, Button, Card, Label, Modal, Select, Table, Textarea, TextInput } from "flowbite-react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface CrudResourceItem {
  id: string;
  updated_at: string;
}

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "url";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface CrudColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

interface Props<T extends CrudResourceItem> {
  title: string;
  subtitle: string;
  emptyText: string;
  createLabel: string;
  items: T[];
  columns: CrudColumn<T>[];
  fields: CrudField[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  busy?: boolean;
  onCreate: (values: Record<string, string>) => Promise<void>;
  onUpdate: (id: string, values: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const PAGE_SIZE = 6;

export function CrudResourcePanel<T extends CrudResourceItem>({
  title,
  subtitle,
  emptyText,
  createLabel,
  items,
  columns,
  fields,
  canCreate,
  canEdit,
  canDelete,
  busy = false,
  onCreate,
  onUpdate,
  onDelete,
}: Props<T>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [items, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function initialValues(item?: T): Record<string, string> {
    return Object.fromEntries(
      fields.map((field) => {
        const raw = item ? (item as unknown as Record<string, unknown>)[field.key] : undefined;
        const normalized = field.type === "date" && typeof raw === "string" ? raw.slice(0, 10) : raw;
        const value = normalized === null || normalized === undefined ? field.options?.[0]?.value || "" : String(normalized);
        return [field.key, value];
      }),
    );
  }

  function openCreate() {
    setEditing(null);
    setValues(initialValues());
    setError("");
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setValues(initialValues(item));
    setError("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) {
      setError(t("crud.required", { field: missing.label }));
      return;
    }
    try {
      if (editing) await onUpdate(editing.id, values);
      else await onCreate(values);
      setOpen(false);
    } catch {
      setError(t("crud.operationError"));
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("crud.confirmDelete"))) return;
    await onDelete(id);
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
        {canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{createLabel}</Button>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><TextInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-8" placeholder={t("crud.search")} /></div>
        <div className="flex gap-2"><Button size="sm" color={mode === "table" ? "blue" : "light"} onClick={() => setMode("table")}><List className="mr-2 h-4 w-4" />{t("crud.list")}</Button><Button size="sm" color={mode === "cards" ? "blue" : "light"} onClick={() => setMode("cards")}><LayoutGrid className="mr-2 h-4 w-4" />{t("crud.cards")}</Button></div>
      </div>
      {visible.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{emptyText}</div> : mode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="space-y-3">{columns.slice(0, 4).map((column) => <div key={column.key}><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{column.label}</p><div className="mt-1 text-sm text-slate-800">{column.render(item)}</div></div>)}</div><div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">{canEdit && <Button size="xs" color="light" onClick={() => openEdit(item)}><Pencil className="mr-1 h-4 w-4" />{t("crud.edit")}</Button>}{canDelete && <Button size="xs" color="failure" onClick={() => void remove(item.id)}><Trash2 className="mr-1 h-4 w-4" />{t("crud.delete")}</Button>}</div></div>)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200"><Table hoverable><Table.Head>{columns.map((column) => <Table.HeadCell key={column.key}>{column.label}</Table.HeadCell>)}{(canEdit || canDelete) && <Table.HeadCell><span className="sr-only">{t("common.actions")}</span></Table.HeadCell>}</Table.Head><Table.Body className="divide-y">{visible.map((item) => <Table.Row key={item.id} className="bg-white">{columns.map((column) => <Table.Cell key={column.key}>{column.render(item)}</Table.Cell>)}{(canEdit || canDelete) && <Table.Cell><div className="flex justify-end gap-2">{canEdit && <Button size="xs" color="light" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>}{canDelete && <Button size="xs" color="failure" onClick={() => void remove(item.id)}><Trash2 className="h-4 w-4" /></Button>}</div></Table.Cell>}</Table.Row>)}</Table.Body></Table></div>
      )}
      <div className="flex items-center justify-between text-sm text-slate-500"><span>{t("crud.itemCount", { count: filtered.length })}</span><div className="flex items-center gap-2"><Button size="xs" color="light" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button><Badge color="gray">{safePage} / {pageCount}</Badge><Button size="xs" color="light" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>
      <Modal show={open} onClose={() => setOpen(false)} size="lg"><Modal.Header>{editing ? t("crud.editTitle", { title }) : createLabel}</Modal.Header><Modal.Body><form id={`crud-${title}`} className="space-y-4" onSubmit={submit}>{fields.map((field) => <div key={field.key}><Label htmlFor={`${title}-${field.key}`}>{field.label}</Label>{field.type === "textarea" ? <Textarea id={`${title}-${field.key}`} rows={4} value={values[field.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} required={field.required} /> : field.type === "select" ? <Select id={`${title}-${field.key}`} value={values[field.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : <TextInput id={`${title}-${field.key}`} type={field.type === "date" ? "date" : field.type === "url" ? "url" : "text"} value={values[field.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} required={field.required} />}</div>)}{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</form></Modal.Body><Modal.Footer><Button type="submit" form={`crud-${title}`} disabled={busy}>{busy ? t("crud.saving") : t("crud.save")}</Button><Button color="light" onClick={() => setOpen(false)}>{t("crud.cancel")}</Button></Modal.Footer></Modal>
    </Card>
  );
}
