import { environment } from "../config/environment";
import type {
  ActivityDto,
  ConflictDto,
  DocumentCreateDto,
  DocumentDto,
  MatterCreateDto,
  MatterDetailDto,
  MatterIntakeUpdateDto,
  MatterSummaryDto,
  ReadinessDto,
} from "../types/api";
import type { ApiOperationKey } from "./apiContracts.generated";
import { demoMatterApi } from "./demoMatterApi";
import { buildPath, getEndpoint } from "./endpointRegistry";
import { http } from "./http";

async function request<TResponse, TBody = never>(
  key: ApiOperationKey,
  options: {
    params?: Record<string, string>;
    body?: TBody;
  } = {},
): Promise<TResponse> {
  const endpoint = getEndpoint(key);
  const response = await http.request<TResponse>({
    method: endpoint.method,
    url: buildPath(key, options.params),
    data: options.body,
  });
  return response.data;
}

const remoteMatterApi = {
  listMatters: () => request<MatterSummaryDto[]>("matters.list"),
  createMatter: (body: MatterCreateDto) =>
    request<MatterDetailDto, MatterCreateDto>("matters.create", { body }),
  getMatter: (matterId: string) =>
    request<MatterDetailDto>("matters.get", { params: { matter_id: matterId } }),
  updateIntake: (matterId: string, body: MatterIntakeUpdateDto) =>
    request<MatterDetailDto, MatterIntakeUpdateDto>("matters.updateIntake", {
      params: { matter_id: matterId },
      body,
    }),
  listDocuments: (matterId: string) =>
    request<DocumentDto[]>("documents.list", { params: { matter_id: matterId } }),
  createDocument: (matterId: string, body: DocumentCreateDto) =>
    request<DocumentDto, DocumentCreateDto>("documents.create", {
      params: { matter_id: matterId },
      body,
    }),
  listConflicts: (matterId: string) =>
    request<ConflictDto[]>("conflicts.list", { params: { matter_id: matterId } }),
  resolveConflict: (matterId: string, conflictId: string, selectedValue: string) =>
    request<ConflictDto, { selected_value: string }>("conflicts.resolve", {
      params: { matter_id: matterId, conflict_id: conflictId },
      body: { selected_value: selectedValue },
    }),
  getReadiness: (matterId: string) =>
    request<ReadinessDto>("readiness.get", { params: { matter_id: matterId } }),
  listActivities: (matterId: string) =>
    request<ActivityDto[]>("activities.list", { params: { matter_id: matterId } }),
};

export const matterApi = environment.useBrowserDemoStore ? demoMatterApi : remoteMatterApi;
