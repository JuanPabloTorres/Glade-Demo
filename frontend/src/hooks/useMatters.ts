import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matterApi } from "../api/matterApi";
import type { MatterCreateDto } from "../types/api";
export const matterKeys = { all: ["matters"] as const };
export function useMatters() {
    return useQuery({ queryKey: matterKeys.all, queryFn: matterApi.listMatters });
}
export function useCreateMatter() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: MatterCreateDto) => matterApi.createMatter(dto),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: matterKeys.all }),
    });
}
