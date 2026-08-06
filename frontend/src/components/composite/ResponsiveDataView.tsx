import { Badge, Button, Card, Table } from "flowbite-react";
import { Eye, LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BankruptcyCase } from "../../types";

export function ResponsiveDataView({ items, canDelete, onView, onEdit, onDelete }: { items: BankruptcyCase[]; canDelete: boolean; onView: (item: BankruptcyCase) => void; onEdit: (item: BankruptcyCase) => void; onDelete: (item: BankruptcyCase) => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"table" | "cards">("table");
  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button size="sm" color={mode === "table" ? "blue" : "light"} onClick={() => setMode("table")}><List className="mr-2 h-4 w-4" />{t("cases.list")}</Button>
        <Button size="sm" color={mode === "cards" ? "blue" : "light"} onClick={() => setMode("cards")}><LayoutGrid className="mr-2 h-4 w-4" />{t("cases.cards")}</Button>
      </div>
      {mode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <Card key={item.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{new Date(item.updated_at).toLocaleDateString()}</p></div><Badge color="info">{t(`status.${item.status}`)}</Badge></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("common.progress")}</p><p className="font-bold">{item.progress}%</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{t("common.readiness")}</p><p className="font-bold">{item.readiness_score}%</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onView(item)}><Eye className="mr-2 h-4 w-4" />{t("cases.details")}</Button><Button size="sm" color="light" onClick={() => onEdit(item)}><Pencil className="mr-2 h-4 w-4" />{t("cases.edit")}</Button>{canDelete && <Button size="sm" color="failure" onClick={() => onDelete(item)}><Trash2 className="mr-2 h-4 w-4" />{t("cases.delete")}</Button>}</div></Card>)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table hoverable>
            <Table.Head><Table.HeadCell>{t("cases.name")}</Table.HeadCell><Table.HeadCell>{t("cases.status")}</Table.HeadCell><Table.HeadCell>{t("common.progress")}</Table.HeadCell><Table.HeadCell>{t("common.updated")}</Table.HeadCell><Table.HeadCell><span className="sr-only">{t("common.actions")}</span></Table.HeadCell></Table.Head>
            <Table.Body className="divide-y">{items.map((item) => <Table.Row key={item.id} className="bg-white"><Table.Cell className="font-medium text-slate-900">{item.title}</Table.Cell><Table.Cell><Badge color="info">{t(`status.${item.status}`)}</Badge></Table.Cell><Table.Cell>{item.progress}%</Table.Cell><Table.Cell>{new Date(item.updated_at).toLocaleDateString()}</Table.Cell><Table.Cell><div className="flex justify-end gap-2"><Button size="xs" onClick={() => onView(item)} aria-label={t("cases.details")}><Eye className="h-4 w-4" /></Button><Button size="xs" color="light" onClick={() => onEdit(item)} aria-label={t("cases.edit")}><Pencil className="h-4 w-4" /></Button>{canDelete && <Button size="xs" color="failure" onClick={() => onDelete(item)} aria-label={t("cases.delete")}><Trash2 className="h-4 w-4" /></Button>}</div></Table.Cell></Table.Row>)}</Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}
