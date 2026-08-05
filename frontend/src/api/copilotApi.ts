import type { ApiOperationKey } from "./apiContracts.generated";
import { buildPath, getEndpoint } from "./endpointRegistry";
import { http } from "./http";
import type { ConversationState, CopilotResponse } from "../types/copilot";

async function request<TBody>(
  key: ApiOperationKey,
  body: TBody,
  params?: Record<string, string>,
): Promise<CopilotResponse> {
  const endpoint = getEndpoint(key);
  const response = await http.request<CopilotResponse>({
    method: endpoint.method,
    url: buildPath(key, params),
    data: body,
  });
  return response.data;
}

export const copilotApi = {
  sendMessage: (state: ConversationState, message: string) =>
    request("copilot.message", { state, message, locale: "en" }),
  analyzeDocument: (state: ConversationState, label: string, text: string) =>
    request("copilot.document", { state, label, text, locale: "en" }),
  resolveIssue: (state: ConversationState, issueId: string, selectedValue: string) =>
    request(
      "copilot.resolveIssue",
      { state, selected_value: selectedValue, locale: "en" },
      { issue_id: issueId },
    ),
};
