import { Button, Card } from "flowbite-react";
import { Link, useParams } from "react-router";
import { ErrorState, LoadingState } from "../components/atoms/AsyncState";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            as={Link}
            to="/"
            color="alternative"
            size="xs"
            className="mb-3"
          >
            ← All matters
          </Button>
          <PageTitle
            title={matter.display_name}
            subtitle={`${matter.case_type} matter · assigned to ${matter.assigned_to ?? "unassigned"}`}
          />
        </div>
        <StatusBadge value={matter.status} />
      </div>

      {workspace.readiness.data ? (
        <ReadinessPanel readiness={workspace.readiness.data} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <IntakeForm
            matter={matter}
            busy={updateIntake.isPending}
            onSubmit={(dto) => updateIntake.mutate(dto)}
          />
          <DocumentForm
            busy={createDocument.isPending}
            onSubmit={(dto) => createDocument.mutate(dto)}
          />
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Processed documents</h2>
            {workspace.documents.isLoading ? (
              <LoadingState />
            ) : (
              <DocumentsList documents={workspace.documents.data ?? []} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Canonical data conflicts</h2>
            {workspace.conflicts.isLoading ? (
              <LoadingState />
            ) : (
              <ConflictList
                conflicts={workspace.conflicts.data ?? []}
                busy={resolveConflict.isPending}
                onResolve={(conflictId, value) =>
                  resolveConflict.mutate({ conflictId, value })
                }
              />
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Audit timeline</h2>
            {workspace.activities.isLoading ? (
              <LoadingState />
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
