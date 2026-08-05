import { Alert, Badge, Button, Card } from "flowbite-react";
import { Link, useParams } from "react-router";
import { ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MutationFeedback } from "../components/atoms/MutationFeedback";
import { PageTitle } from "../components/atoms/PageTitle";
import { StatusBadge } from "../components/atoms/StatusBadge";
import { ReadinessPanel } from "../components/molecules/ReadinessPanel";
import { ActivityTimeline } from "../components/organisms/ActivityTimeline";
import { AutomationOverview } from "../components/organisms/AutomationOverview";
import { ConflictList } from "../components/organisms/ConflictList";
import { DocumentForm } from "../components/organisms/DocumentForm";
import { DocumentsList } from "../components/organisms/DocumentsList";
import { IntakeForm } from "../components/organisms/IntakeForm";
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
    return <ErrorState message="This matter could not be found." />;
  }

  const matter = workspace.matter.data;
  const readiness = workspace.readiness.data;
  const openReviewItems = workspace.conflicts.data?.filter((item) => item.status === "open").length ?? 0;

  const saveIntake = async (dto: MatterIntakeUpdateDto) => {
    await updateIntake.mutateAsync(dto);
  };
  const processDocument = async (dto: DocumentCreateDto) => {
    await createDocument.mutateAsync(dto);
  };
  const resolve = async (conflictId: string, value: string) => {
    await resolveConflict.mutateAsync({ conflictId, value });
  };

  const nextAction = openReviewItems
    ? {
        color: "warning" as const,
        title: "Review document findings",
        message: `${openReviewItems} item${openReviewItems === 1 ? "" : "s"} require a human decision before this matter can advance.`,
      }
    : readiness?.score === 100
      ? {
          color: "success" as const,
          title: "Matter ready for professional review",
          message: "Required information, supporting documents, and review decisions are complete.",
        }
      : {
          color: "info" as const,
          title: "Continue matter preparation",
          message: "Complete the pending client information or required documents shown in the readiness overview.",
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button as={Link} to="/" color="alternative" size="xs">
            ← Back to matters
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray" className="capitalize">
              {matter.case_type}
            </Badge>
            <span className="text-sm text-gray-500">
              Assigned to {matter.assigned_to ?? "the intake team"}
            </span>
          </div>
          <PageTitle
            title={matter.display_name}
            subtitle="Review client information, analyze documents, and record decisions in one workspace."
          />
        </div>
        <div data-testid="matter-status" className="pt-1">
          <StatusBadge value={matter.status} />
        </div>
      </div>

      <Alert color={nextAction.color}>
        <span className="font-semibold">{nextAction.title}. </span>
        {nextAction.message}
      </Alert>

      {workspace.readiness.isError ? (
        <ErrorState message="The readiness overview could not be calculated." />
      ) : readiness ? (
        <ReadinessPanel readiness={readiness} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <MutationFeedback
            success={updateIntake.isSuccess ? "Client information saved." : null}
            error={updateIntake.error}
          />
          <IntakeForm
            matter={matter}
            busy={updateIntake.isPending}
            onSubmit={saveIntake}
          />

          <MutationFeedback
            success={createDocument.isSuccess ? "Document analysis completed." : null}
            error={createDocument.error}
          />
          <DocumentForm
            busy={createDocument.isPending}
            onSubmit={processDocument}
          />

          <Card className="border border-gray-200 shadow-sm">
            <div className="mb-4">
              <Badge color="gray" className="mb-2 w-fit">
                Document portfolio
              </Badge>
              <h2 className="text-xl font-semibold text-gray-900">Analyzed documents</h2>
              <p className="mt-1 text-sm text-gray-500">
                Review extracted fields and confirm whether each document still needs attention.
              </p>
            </div>
            {workspace.documents.isLoading ? (
              <LoadingState label="Loading analyzed documents" />
            ) : workspace.documents.isError ? (
              <ErrorState message="The document portfolio could not be loaded." />
            ) : (
              <DocumentsList documents={workspace.documents.data ?? []} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <MutationFeedback
            success={resolveConflict.isSuccess ? "Review decision recorded." : null}
            error={resolveConflict.error}
          />
          <Card className="border border-gray-200 shadow-sm">
            <div className="mb-4">
              <Badge color="info" className="mb-2 w-fit">
                Step 3
              </Badge>
              <h2 className="text-xl font-semibold text-gray-900">Review document findings</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Compare the approved client record with extracted document values and record the
                correct outcome.
              </p>
            </div>
            {workspace.conflicts.isLoading ? (
              <LoadingState label="Loading review items" />
            ) : workspace.conflicts.isError ? (
              <ErrorState message="The review items could not be loaded." />
            ) : (
              <ConflictList
                conflicts={workspace.conflicts.data ?? []}
                busy={resolveConflict.isPending}
                onResolve={resolve}
              />
            )}
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <div className="mb-4">
              <Badge color="gray" className="mb-2 w-fit">
                Audit history
              </Badge>
              <h2 className="text-xl font-semibold text-gray-900">Decision timeline</h2>
              <p className="mt-1 text-sm text-gray-500">
                A clear record of important workflow updates and human decisions.
              </p>
            </div>
            {workspace.activities.isLoading ? (
              <LoadingState label="Loading decision history" />
            ) : workspace.activities.isError ? (
              <ErrorState message="The decision history could not be loaded." />
            ) : (
              <ActivityTimeline activities={workspace.activities.data ?? []} />
            )}
          </Card>
        </div>
      </div>

      <AutomationOverview />
    </div>
  );
}
