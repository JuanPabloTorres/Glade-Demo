import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matterApi } from "../api/matterApi";
import type { DocumentCreateDto, MatterIntakeUpdateDto } from "../types/api";
import { matterKeys } from "./useMatters";
const workspaceKeys = {
    root: (matterId: string) => ["matter", matterId] as const,
    detail: (matterId: string) => ["matter", matterId, "detail"] as const,
    documents: (matterId: string) => ["matter", matterId, "documents"] as const,
    conflicts: (matterId: string) => ["matter", matterId, "conflicts"] as const,
    readiness: (matterId: string) => ["matter", matterId, "readiness"] as const,
    activities: (matterId: string) => ["matter", matterId, "activities"] as const,
};
export function useMatterWorkspace(matterId: string) {
    return {
        matter: useQuery({
            queryKey: workspaceKeys.detail(matterId),
            queryFn: () => matterApi.getMatter(matterId),
        }),
        documents: useQuery({
            queryKey: workspaceKeys.documents(matterId),
            queryFn: () => matterApi.listDocuments(matterId),
        }),
        conflicts: useQuery({
            queryKey: workspaceKeys.conflicts(matterId),
            queryFn: () => matterApi.listConflicts(matterId),
        }),
        readiness: useQuery({
            queryKey: workspaceKeys.readiness(matterId),
            queryFn: () => matterApi.getReadiness(matterId),
        }),
        activities: useQuery({
            queryKey: workspaceKeys.activities(matterId),
            queryFn: () => matterApi.listActivities(matterId),
        }),
    };
}
function useRefreshWorkspace(matterId: string) {
    const queryClient = useQueryClient();
    return async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: workspaceKeys.root(matterId) }),
            queryClient.invalidateQueries({ queryKey: matterKeys.all }),
        ]);
    };
}
export function useUpdateIntake(matterId: string) {
    const refresh = useRefreshWorkspace(matterId);
    return useMutation({
        mutationFn: (dto: MatterIntakeUpdateDto) => matterApi.updateIntake(matterId, dto),
        onSuccess: refresh,
    });
}
export function useCreateDocument(matterId: string) {
    const refresh = useRefreshWorkspace(matterId);
    return useMutation({
        mutationFn: (dto: DocumentCreateDto) => matterApi.createDocument(matterId, dto),
        onSuccess: refresh,
    });
}
export function useResolveConflict(matterId: string) {
    const refresh = useRefreshWorkspace(matterId);
    return useMutation({
        mutationFn: ({ conflictId, value }: {
            conflictId: string;
            value: string;
        }) => matterApi.resolveConflict(matterId, conflictId, value),
        onSuccess: refresh,
    });
}
