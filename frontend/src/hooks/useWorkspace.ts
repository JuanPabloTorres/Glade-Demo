import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CaseWorkspace, DashboardSummary } from "../types";

export const workspaceKeys = {
  detail: (caseId: string) => ["workspace", caseId] as const,
  dashboard: ["dashboard", "summary"] as const,
};

export function useCaseWorkspace(caseId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.detail(caseId || "none"),
    enabled: Boolean(caseId),
    queryFn: async () =>
      (await api.get<CaseWorkspace>(`/cases/${caseId}/workspace`)).data,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: workspaceKeys.dashboard,
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });
}
