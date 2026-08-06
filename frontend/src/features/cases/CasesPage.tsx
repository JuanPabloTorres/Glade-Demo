import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Spinner } from "flowbite-react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDataView } from "../../components/composite/ResponsiveDataView";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { caseKeys, useCases } from "../../hooks/useCases";
import { api } from "../../lib/api";
import type { BankruptcyCase } from "../../types";
import { CaseFormModal, type CaseFormPayload } from "./CaseFormModal";

export function CasesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useCases();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankruptcyCase | null>(null);
  const save = useMutation({
    mutationFn: async (payload: CaseFormPayload) => editing ? (await api.patch(`/cases/${editing.id}`, payload)).data : (await api.post("/cases", payload)).data,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: caseKeys.all }); setOpen(false); setEditing(null); },
  });
  const remove = useMutation({ mutationFn: async (item: BankruptcyCase) => api.delete(`/cases/${item.id}`), onSuccess: async () => queryClient.invalidateQueries({ queryKey: caseKeys.all }) });

  function create() { setEditing(null); setOpen(true); }
  function edit(item: BankruptcyCase) { setEditing(item); setOpen(true); }
  function deleteItem(item: BankruptcyCase) { if (window.confirm(t("cases.confirmDelete"))) remove.mutate(item); }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("cases.title")} subtitle={t("cases.subtitle")} action={<Button onClick={create}><Plus className="mr-2 h-4 w-4" />{t("cases.create")}</Button>} />
      {isLoading && <div className="grid min-h-64 place-items-center"><Spinner size="xl" /></div>}
      {isError && <Alert color="failure">{t("common.error")}</Alert>}
      {!isLoading && !isError && data.length === 0 && <Alert color="info">{t("cases.empty")}</Alert>}
      {data.length > 0 && <ResponsiveDataView items={data} canDelete={user?.role !== "applicant"} onEdit={edit} onDelete={deleteItem} />}
      <CaseFormModal open={open} item={editing} role={user?.role || "applicant"} onClose={() => setOpen(false)} onSave={(payload) => save.mutate(payload)} saving={save.isPending} />
    </div>
  );
}
