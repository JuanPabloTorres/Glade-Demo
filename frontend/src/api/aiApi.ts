import { apiContracts } from "./apiContracts.generated";
import { apiClient } from "../services/api/apiClient";
import type { AIHealthStatus } from "../types/api";

function pathFor(key: "ai.health"): string {
  return apiContracts[key].path;
}

export const aiApi = {
  async health(): Promise<AIHealthStatus> {
    return apiClient.get<AIHealthStatus>(pathFor("ai.health"));
  },
};
