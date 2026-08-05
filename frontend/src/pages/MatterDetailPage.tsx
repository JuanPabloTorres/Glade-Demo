import { Alert, Badge, Button, Card } from "flowbite-react";
import { Link, useParams } from "react-router";
import { AppIcon } from "../components/atoms/AppIcon";
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

  if (workspace.matter.isLoading) return <LoadingState label="Loading matter workspace" />;
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
    <div className="space-y-7 lg:space-y-8">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <Button as={Link} to="/" color="alternative" size="xs">
              <span className="flex items-center gap-2">
                <span aria-hidden="true">←</span>
                Back to matters
              </span>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="gray" className="capitalize">
                {matter.case_type}
              </Badge>
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <AppIcon name="user" size={16} className="text-blue-700" />
                Assigned to {matter.assigned_to ?? "the intake team"}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 sm:flex">
                <AppIcon name="portfolio" size={24} />
              </span>
              <PageTitle
                title={matter.display_name}
                subtitle="Confirm the client record, analyze supporting documents, and record professional decisions in one guided workspace."
              />
            </div>
          </div>
          <div data-testid="matter-status" className="pt-1">
            <StatusBadge value={matter.status} />
          </div>
        </div>
      </Card>

      <Alert color={nextAction.color}>
        <span className="font-semibold">{nextAction.title}. </span>
        {nextAction.message}
      </Alert>

      {workspace.readiness.isError ? (
        <ErrorState message="The readiness overview could not be calculated." />
      ) : readiness ? (
        <ReadinessPanel readiness={readiness} />
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-7">
          <MutationFeedback
            success={updateIntake.isSuccess ? "Client information saved." : null}
            error={updateIntake.error}
          />
          <IntakeForm matter={matter} busy={updateIntake.isPending} onSubmit={saveIntake} />

          <MutationFeedback
            success={createDocument.isSuccess ? "Document analysis completed." : null}
            error={createDocument.error}
          />
          <DocumentForm busy={createDocument.isPending} onSubmit={processDocument} />

          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <AppIcon name="document" size={20} />
              </span>
              <div>
                <Badge color="gray" className="mb-2 w-fit">
                  Document portfolio
                </Badge>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Analyzed documents</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review extracted fields and confirm whether each document still needs attention.
                </p>
              </div>
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

        <div className="space-y-7">
          <MutationFeedback
            success={resolveConflict.isSuccess ? "Review decision recorded." : null}
            error={resolveConflict.error}
          />
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <AppIcon name="review" size={20} />
              </span>
              <div>
                <Badge color="info" className="mb-2 w-fit">
                  Human decision
                </Badge>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Review document findings</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Compare the approved client record with extracted values and record the correct outcome.
                </p>
              </div>
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

          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <AppIcon name="history" size={20} />
              </span>
              <div>
                <Badge color="gray" className="mb-2 w-fit">
                  Audit history
                </Badge>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Decision timeline</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  A clear record of important workflow updates and human decisions.
                </p>
              </div>
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
