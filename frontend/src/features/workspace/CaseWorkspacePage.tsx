import { useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Progress, Spinner } from "flowbite-react";
import { BellRing, FileText, MessageSquareText, ShieldAlert, ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { CrudResourcePanel, type CrudField } from "../../components/composite/CrudResourcePanel";
import { PageHeader } from "../../components/ui/PageHeader";
import { caseKeys, useActiveCase, useCases } from "../../hooks/useCases";
import { useCaseWorkspace, workspaceKeys } from "../../hooks/useWorkspace";
import { api } from "../../lib/api";
import type { CaseAlert, CaseDocument, CaseNote, CaseTask } from "../../types";
import { useAuth } from "../auth/AuthContext";

type ResourceName = "documents" | "tasks" | "notes" | "alerts";

function boolValue(value: string): boolean {
  return value === "true";
}

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function CaseWorkspacePage() {
  const { t } = useTranslation();
  const { caseId } = useParams();
  const { user } = useAuth();
  const casesQuery = useCases();
  const { activeCase } = useActiveCase();
  const selectedId = caseId || activeCase?.id;
  const selectedCase = casesQuery.data?.find((item) => item.id === selectedId) || activeCase;
  const workspace = useCaseWorkspace(selectedId);
  const queryClient = useQueryClient();
  const [section, setSection] = useState<ResourceName>("documents");
  const [busy, setBusy] = useState(false);
  const isStaff = user?.role === "case_manager" || user?.role === "admin";

  const refresh = async () => {
    if (!selectedId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(selectedId) }),
      queryClient.invalidateQueries({ queryKey: workspaceKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: caseKeys.all }),
    ]);
  };

  async function create(resource: ResourceName, values: Record<string, string>) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.post(`/cases/${selectedId}/${resource}`, payloadFor(resource, values));
      await refresh();
    } finally { setBusy(false); }
  }

  async function update(resource: ResourceName, id: string, values: Record<string, string>) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.patch(`/cases/${selectedId}/${resource}/${id}`, payloadFor(resource, values));
      await refresh();
    } finally { setBusy(false); }
  }

  async function remove(resource: ResourceName, id: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.delete(`/cases/${selectedId}/${resource}/${id}`);
      await refresh();
    } finally { setBusy(false); }
  }

  function payloadFor(resource: ResourceName, values: Record<string, string>): Record<string, unknown> {
    if (resource === "documents") return { ...values, file_url: emptyToNull(values.file_url) };
    if (resource === "tasks") return { ...values, due_date: values.due_date ? new Date(`${values.due_date}T12:00:00`).toISOString() : null, assigned_to_id: null };
    if (resource === "notes") return { content: values.content, is_internal: boolValue(values.is_internal) };
    return { ...values, resolved: boolValue(values.resolved) };
  }

  const documentFields = useMemo<CrudField[]>(() => [
    { key: "name", label: t("workspace.fields.name"), required: true },
    { key: "category", label: t("workspace.fields.category"), type: "select", options: ["identity", "income", "bank", "tax", "asset", "debt", "other"].map((value) => ({ value, label: t(`documentCategory.${value}`) })) },
    { key: "status", label: t("workspace.fields.status"), type: "select", options: (isStaff ? ["requested", "uploaded", "verified", "needs_attention"] : ["requested", "uploaded"]).map((value) => ({ value, label: t(`documentStatus.${value}`) })) },
    { key: "file_url", label: t("workspace.fields.fileUrl"), type: "url" },
    { key: "notes", label: t("workspace.fields.notes"), type: "textarea" },
  ], [isStaff, t]);
  const taskFields = useMemo<CrudField[]>(() => [
    { key: "title", label: t("workspace.fields.title"), required: true },
    { key: "description", label: t("workspace.fields.description"), type: "textarea" },
    { key: "status", label: t("workspace.fields.status"), type: "select", options: ["todo", "in_progress", "done"].map((value) => ({ value, label: t(`taskStatus.${value}`) })) },
    { key: "priority", label: t("workspace.fields.priority"), type: "select", options: ["low", "medium", "high"].map((value) => ({ value, label: t(`taskPriority.${value}`) })) },
    { key: "due_date", label: t("workspace.fields.dueDate"), type: "date" },
  ], [t]);
  const noteFields = useMemo<CrudField[]>(() => [
    { key: "content", label: t("workspace.fields.content"), type: "textarea", required: true },
    ...(isStaff ? [{ key: "is_internal", label: t("workspace.fields.internal"), type: "select" as const, options: [{ value: "true", label: t("common.yes") }, { value: "false", label: t("common.no") }] }] : []),
  ], [isStaff, t]);
  const alertFields = useMemo<CrudField[]>(() => [
    { key: "title", label: t("workspace.fields.title"), required: true },
    { key: "message", label: t("workspace.fields.message"), type: "textarea" },
    { key: "severity", label: t("workspace.fields.severity"), type: "select", options: ["info", "warning", "critical"].map((value) => ({ value, label: t(`alertSeverity.${value}`) })) },
    { key: "resolved", label: t("workspace.fields.resolved"), type: "select", options: [{ value: "false", label: t("common.no") }, { value: "true", label: t("common.yes") }] },
  ], [t]);

  if (casesQuery.isLoading || workspace.isLoading) return <div className="grid min-h-96 place-items-center"><Spinner size="xl" /></div>;
  if (!selectedCase || !selectedId) return <Alert color="info">{t("assistant.noCase")}</Alert>;
  if (workspace.isError || !workspace.data) return <Alert color="failure">{t("common.error")}</Alert>;

  const sections: { key: ResourceName; icon: typeof FileText; count: number }[] = [
    { key: "documents", icon: FileText, count: workspace.data.documents.length },
    { key: "tasks", icon: ListTodo, count: workspace.data.tasks.length },
    { key: "notes", icon: MessageSquareText, count: workspace.data.notes.length },
    { key: "alerts", icon: BellRing, count: workspace.data.alerts.filter((item) => !item.resolved).length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={selectedCase.title} subtitle={t("workspace.subtitle")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-500">{t("cases.status")}</p><Badge color="info" className="mt-2 w-fit">{t(`status.${selectedCase.status}`)}</Badge></div><ShieldAlert className="h-8 w-8 text-cyan-700" /></div><div><div className="mb-2 flex justify-between text-sm text-slate-500"><span>{t("common.progress")}</span><span>{selectedCase.progress}%</span></div><Progress progress={selectedCase.progress} /></div></Card>
        <Card><p className="text-sm text-slate-500">{t("common.readiness")}</p><p className="mt-2 text-3xl font-bold text-slate-900">{selectedCase.readiness_score}%</p><p className="mt-2 text-sm leading-6 text-slate-600">{t("common.legal")}</p></Card>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-4">
        {sections.map(({ key, icon: Icon, count }) => <Button key={key} color={section === key ? "blue" : "light"} onClick={() => setSection(key)}><Icon className="mr-2 h-4 w-4" />{t(`workspace.${key}`)} <Badge color="gray" className="ml-2">{count}</Badge></Button>)}
      </div>
      {section === "documents" && <CrudResourcePanel<CaseDocument> title={t("workspace.documents")} subtitle={t("workspace.documentsSubtitle")} emptyText={t("workspace.emptyDocuments")} createLabel={t("workspace.addDocument")} items={workspace.data.documents} fields={documentFields} busy={busy} canCreate canEdit canDelete={isStaff} onCreate={(values) => create("documents", values)} onUpdate={(id, values) => update("documents", id, values)} onDelete={(id) => remove("documents", id)} columns={[{ key: "name", label: t("workspace.fields.name"), render: (item) => <span className="font-medium">{item.name}</span> }, { key: "category", label: t("workspace.fields.category"), render: (item) => t(`documentCategory.${item.category}`) }, { key: "status", label: t("workspace.fields.status"), render: (item) => <Badge color="info">{t(`documentStatus.${item.status}`)}</Badge> }, { key: "updated", label: t("common.updated"), render: (item) => new Date(item.updated_at).toLocaleDateString() }]} />}
      {section === "tasks" && <CrudResourcePanel<CaseTask> title={t("workspace.tasks")} subtitle={t("workspace.tasksSubtitle")} emptyText={t("workspace.emptyTasks")} createLabel={t("workspace.addTask")} items={workspace.data.tasks} fields={taskFields} busy={busy} canCreate={isStaff} canEdit={isStaff} canDelete={isStaff} onCreate={(values) => create("tasks", values)} onUpdate={(id, values) => update("tasks", id, values)} onDelete={(id) => remove("tasks", id)} columns={[{ key: "title", label: t("workspace.fields.title"), render: (item) => <span className="font-medium">{item.title}</span> }, { key: "priority", label: t("workspace.fields.priority"), render: (item) => <Badge color={item.priority === "high" ? "failure" : "gray"}>{t(`taskPriority.${item.priority}`)}</Badge> }, { key: "status", label: t("workspace.fields.status"), render: (item) => t(`taskStatus.${item.status}`) }, { key: "due", label: t("workspace.fields.dueDate"), render: (item) => item.due_date ? new Date(item.due_date).toLocaleDateString() : "—" }]} />}
      {section === "notes" && <CrudResourcePanel<CaseNote> title={t("workspace.notes")} subtitle={t("workspace.notesSubtitle")} emptyText={t("workspace.emptyNotes")} createLabel={t("workspace.addNote")} items={workspace.data.notes} fields={noteFields} busy={busy} canCreate canEdit={isStaff} canDelete={isStaff} onCreate={(values) => create("notes", values)} onUpdate={(id, values) => update("notes", id, values)} onDelete={(id) => remove("notes", id)} columns={[{ key: "content", label: t("workspace.fields.content"), render: (item) => <span className="line-clamp-2">{item.content}</span> }, { key: "visibility", label: t("workspace.fields.visibility"), render: (item) => <Badge color={item.is_internal ? "warning" : "success"}>{item.is_internal ? t("workspace.internal") : t("workspace.shared")}</Badge> }, { key: "updated", label: t("common.updated"), render: (item) => new Date(item.updated_at).toLocaleDateString() }]} />}
      {section === "alerts" && <CrudResourcePanel<CaseAlert> title={t("workspace.alerts")} subtitle={t("workspace.alertsSubtitle")} emptyText={t("workspace.emptyAlerts")} createLabel={t("workspace.addAlert")} items={workspace.data.alerts} fields={alertFields} busy={busy} canCreate={isStaff} canEdit={isStaff} canDelete={isStaff} onCreate={(values) => create("alerts", values)} onUpdate={(id, values) => update("alerts", id, values)} onDelete={(id) => remove("alerts", id)} columns={[{ key: "title", label: t("workspace.fields.title"), render: (item) => <span className="font-medium">{item.title}</span> }, { key: "severity", label: t("workspace.fields.severity"), render: (item) => <Badge color={item.severity === "critical" ? "failure" : item.severity === "warning" ? "warning" : "info"}>{t(`alertSeverity.${item.severity}`)}</Badge> }, { key: "resolved", label: t("workspace.fields.resolved"), render: (item) => item.resolved ? t("common.yes") : t("common.no") }, { key: "updated", label: t("common.updated"), render: (item) => new Date(item.updated_at).toLocaleDateString() }]} />}
    </div>
  );
}
