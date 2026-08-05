import { Button, Card } from "flowbite-react";
import { Link, useParams } from "react-router";
import { ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MutationFeedback } from "../components/atoms/MutationFeedback";
import { PageTitle } from "../components/atoms/PageTitle";
import { StatusBadge } from "../components/atoms/StatusBadge";
import { ReadinessPanel } from "../components/molecules/ReadinessPanel";
import { ActivityTimeline } from "../components/organisms/ActivityTimeline";
import { ConflictList } from "../components/organisms/ConflictList";
import { DocumentForm } from "../components/organisms/DocumentForm";
import { DocumentsList } from "../components/organisms/DocumentsList";
import { IntakeForm } from "../components/organisms/IntakeForm";
import { RequestTracePanel } from "../components/organisms/RequestTracePanel";
import {
  useCreateDocument,
  useMatterWorkspace,
  useResolveConflict,
  useUpdateIntake,
} from "../hooks/useMatterWorkspace";
import type { DocumentCreateDto, MatterIntakeUpdateDto } from "../types/api";

export function MatterDetailPage() {
  const { matterId = "" } = useParams();
  const workspace = useMatterWorkspace(matterId);
  const updateIntake = useUpdateIntake(matterId);
  const createDocument = useCreateDocument(matterId);
  const resolveConflict = useResolveConflict(matterId);

  if (workspace.matter.isLoading) {
    return <LoadingState label="Loading matter workspace" />;
  }
  if (workspace.matter.isError || !workspace.matter.data) {
    return <ErrorState message="Matter not found." />;
  }

  const matter = workspace.matter.data;
  const saveIntake = async (dto: MatterIntakeUpdateDto) => {
    await updateIntake.mutateAsync(dto);
  };
  const processDocument = async (dto: DocumentCreateDto) => {
    await createDocument.mutateAsync(dto);
  };
  const resolve = async (conflictId: string, value: string) => {
    await resolveConflict.mutateAsync({ conflictId, value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button as={Link} to="/" color="alternative" size="xs" className="mb-3">
            ← All matters
          </Button>
          <PageTitle
            title={matter.display_name}
            subtitle={`${matter.case_type} matter · assigned to ${matter.assigned_to ?? "unassigned"}`}
          />
        </div>
        <div data-testid="matter-status"><StatusBadge value={matter.status} /></div>
      </div>

      {workspace.readiness.isError ? (
        <ErrorState message="Readiness could not be calculated." />
      ) : workspace.readiness.data ? (
        <ReadinessPanel readiness={workspace.readiness.data} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <MutationFeedback
            success={updateIntake.isSuccess ? "Canonical intake saved." : null}
            error={updateIntake.error}
          />
          <IntakeForm
            matter={matter}
            busy={updateIntake.isPending}
            onSubmit={saveIntake}
          />

          <MutationFeedback
            success={createDocument.isSuccess ? "Document processed." : null}
            error={createDocument.error}
          />
          <DocumentForm
            busy={createDocument.isPending}
            onSubmit={processDocument}
          />
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Processed documents</h2>
            {workspace.documents.isLoading ? (
              <LoadingState />
            ) : workspace.documents.isError ? (
              <ErrorState message="Documents could not be loaded." />
            ) : (
              <DocumentsList documents={workspace.documents.data ?? []} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <MutationFeedback
            success={resolveConflict.isSuccess ? "Conflict decision saved." : null}
            error={resolveConflict.error}
          />
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Canonical data conflicts</h2>
            {workspace.conflicts.isLoading ? (
              <LoadingState />
            ) : workspace.conflicts.isError ? (
              <ErrorState message="Conflicts could not be loaded." />
            ) : (
              <ConflictList
                conflicts={workspace.conflicts.data ?? []}
                busy={resolveConflict.isPending}
                onResolve={resolve}
              />
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Audit timeline</h2>
            {workspace.activities.isLoading ? (
              <LoadingState />
            ) : workspace.activities.isError ? (
              <ErrorState message="Activity could not be loaded." />
            ) : (
              <ActivityTimeline activities={workspace.activities.data ?? []} />
            )}
          </Card>
        </div>
      </div>

      <RequestTracePanel />
    </div>
  );
}
