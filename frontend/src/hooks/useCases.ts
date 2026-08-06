import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { BankruptcyCase } from "../types";

export const caseKeys = { all: ["cases"] as const };

export function useCases() {
  return useQuery({
    queryKey: caseKeys.all,
    queryFn: async () => (await api.get<BankruptcyCase[]>("/cases")).data,
  });
}

export function useActiveCase() {
  const query = useCases();
  const storedId = localStorage.getItem("freshstart_active_case");
  const activeCase = query.data?.find((item) => item.id === storedId) || query.data?.[0];
  if (activeCase && storedId !== activeCase.id) localStorage.setItem("freshstart_active_case", activeCase.id);
  return { ...query, activeCase };
}
