import { Alert, Badge, Button, Card, TabItem, Tabs } from "flowbite-react";
import { Link, useParams } from "react-router";
import { GUIDED_DEMO_MATTER_ID } from "../api/demoMatterApi";
import { AppIcon } from "../components/atoms/AppIcon";
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
import { environment } from "../config/environment";
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
    return (
      <Card className="mx-auto max-w-2xl border border-slate-200 bg-white shadow-sm">
        <Badge color="warning" className="w-fit">Workspace recovery</Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            This saved link is no longer connected to an evaluation matter.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            A previous serverless deployment may have created that link with temporary data. Your
            current browser workspace is stable and can continue from the portfolio or guided example.
          </p>
        </div>
        <Alert color="info">
          No client information was exposed or deleted. This portfolio uses invented evaluation data.
        </Alert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button as={Link} to="/">Return to matter portfolio</Button>
          {environment.useBrowserDemoStore ? (
            <Button as={Link} to={`/matters/${GUIDED_DEMO_MATTER_ID}`} color="alternative">
              Open guided example
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  const matter = workspace.matter.data;
  const readiness = workspace.readiness.data;
  const openReviewItems = workspace.conflicts.data?.filter((item) => item.status === "open").length ?? 0;
  const documents = workspace.documents.data ?? [];

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
        message: `${openReviewItems} item${openReviewItems === 1 ? "" : "s"} require a professional decision.`,
      }
    : readiness?.score === 100
      ? {
          color: "success" as const,
          title: "Matter ready for professional review",
          message: "The client record, required documents, and human decisions are complete.",
        }
      : documents.length === 0
        ? {
            color: "info" as const,
            title: "Add the supporting documents",
            message: "Confirm the client intake, then analyze the identity and address documents.",
          }
        : {
            color: "info" as const,
            title: "Continue matter preparation",
            message: "Use the readiness list to complete the remaining information or documents.",
          };

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-4">
            <Button as={Link} to="/" color="alternative" size="xs">
              Back to workspace
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="gray" className="capitalize">{matter.case_type}</Badge>
              <Badge color="info">Assigned to {matter.assigned_to ?? "intake team"}</Badge>
            </div>
            <PageTitle
              title={matter.display_name}
              subtitle="Complete each tab in order. The system compares the approved client record with documents and requires a human decision for every difference."
            />
          </div>
          <div data-testid="matter-status">
            <StatusBadge value={matter.status} />
          </div>
        </div>
      </Card>

      <Alert color={nextAction.color}>
        <span className="font-semibold">Next action: {nextAction.title}. </span>
        {nextAction.message}
      </Alert>

      <div className="workspace-tabs -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs aria-label="Matter preparation workspace" variant="underline">
          <TabItem title="Overview" active>
            <div className="space-y-5 pt-3">
              {workspace.readiness.isError ? (
                <ErrorState message="The readiness overview could not be calculated." />
              ) : readiness ? (
                <ReadinessPanel readiness={readiness} />
              ) : null}

              <Card className="border border-slate-200 bg-white shadow-sm">
                <div>
                  <Badge color="info" className="mb-3 w-fit">How to finish this matter</Badge>
                  <h2 className="text-xl font-semibold text-slate-950">Complete the work in order</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The tabs separate the human tasks so the workspace remains usable on desktop,
                    tablet, and mobile.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["intake", "Client intake", matter.address ? "Completed" : "Needs information"],
                    ["document", "Documents", `${documents.length} analyzed`],
                    ["review", "Decisions", openReviewItems ? `${openReviewItems} pending` : "No open decisions"],
                    ["readiness", "Review package", readiness?.score === 100 ? "Ready" : `${readiness?.score ?? 0}% complete`],
                  ].map(([icon, title, state]) => (
                    <Card key={title} className="border border-slate-200 bg-slate-50 shadow-none">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                        <AppIcon name={icon as "intake" | "document" | "review" | "readiness"} size={20} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-950">{title}</p>
                        <p className="mt-1 text-sm text-slate-500">{state}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          </TabItem>

          <TabItem title="Client intake">
            <div className="space-y-4 pt-3">
              <MutationFeedback success={updateIntake.isSuccess ? "Client information saved." : null} error={updateIntake.error} />
              <IntakeForm matter={matter} busy={updateIntake.isPending} onSubmit={saveIntake} />
            </div>
          </TabItem>

          <TabItem title="Documents">
            <div className="space-y-5 pt-3">
              <MutationFeedback success={createDocument.isSuccess ? "Document analysis completed." : null} error={createDocument.error} />
              <DocumentForm busy={createDocument.isPending} onSubmit={processDocument} />
              <Card className="border border-slate-200 bg-white shadow-sm">
                <div>
                  <Badge color="gray" className="mb-2 w-fit">Document portfolio</Badge>
                  <h2 className="text-xl font-semibold text-slate-950">Analyzed documents</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Each document shows the extracted facts and whether professional attention is still required.
                  </p>
                </div>
                {workspace.documents.isLoading ? (
                  <LoadingState label="Loading analyzed documents" />
                ) : workspace.documents.isError ? (
                  <ErrorState message="The document portfolio could not be loaded." />
                ) : (
                  <DocumentsList documents={documents} />
                )}
              </Card>
            </div>
          </TabItem>

          <TabItem title="Review decisions">
            <div className="space-y-4 pt-3">
              <MutationFeedback success={resolveConflict.isSuccess ? "Review decision recorded." : null} error={resolveConflict.error} />
              <Card className="border border-slate-200 bg-white shadow-sm">
                <div>
                  <Badge color="warning" className="mb-2 w-fit">Human approval required</Badge>
                  <h2 className="text-xl font-semibold text-slate-950">Resolve document differences</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    The system never changes the approved client record silently. Choose the correct value and preserve the reason in the activity history.
                  </p>
                </div>
                {workspace.conflicts.isLoading ? (
                  <LoadingState label="Loading review decisions" />
                ) : workspace.conflicts.isError ? (
                  <ErrorState message="The review decisions could not be loaded." />
                ) : (
                  <ConflictList conflicts={workspace.conflicts.data ?? []} busy={resolveConflict.isPending} onResolve={resolve} />
                )}
              </Card>
            </div>
          </TabItem>

          <TabItem title="Activity">
            <div className="pt-3">
              <Card className="border border-slate-200 bg-white shadow-sm">
                <div>
                  <Badge color="gray" className="mb-2 w-fit">Audit history</Badge>
                  <h2 className="text-xl font-semibold text-slate-950">Matter activity</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Review the important actions and human decisions recorded for this matter.
                  </p>
                </div>
                {workspace.activities.isLoading ? (
                  <LoadingState label="Loading matter activity" />
                ) : workspace.activities.isError ? (
                  <ErrorState message="The matter activity could not be loaded." />
                ) : (
                  <ActivityTimeline activities={workspace.activities.data ?? []} />
                )}
              </Card>
            </div>
          </TabItem>
        </Tabs>
      </div>
    </div>
  );
}
