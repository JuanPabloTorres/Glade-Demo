import { Alert, Badge, Button, Card, Progress } from "flowbite-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { AppIcon, type AppIconName } from "../components/atoms/AppIcon";
import { EmptyState, ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MatterCard } from "../components/molecules/MatterCard";
import { MetricCard } from "../components/molecules/MetricCard";
import { AutomationOverview } from "../components/organisms/AutomationOverview";
import { MatterFormModal } from "../components/organisms/MatterFormModal";
import { useCreateMatter, useMatters } from "../hooks/useMatters";
import type { MatterCreateDto } from "../types/api";

const WORKFLOW: { icon: AppIconName; title: string; detail: string; result: string }[] = [
  {
    icon: "portfolio",
    title: "Start the matter",
    detail: "Create the client record and assign the responsible professional.",
    result: "A single workspace for the case",
  },
  {
    icon: "intake",
    title: "Confirm intake",
    detail: "Record the approved client information that documents will be compared against.",
    result: "A trusted source of truth",
  },
  {
    icon: "document",
    title: "Analyze documents",
    detail: "Extract supported values and identify differences that need attention.",
    result: "Less manual comparison",
  },
  {
    icon: "review",
    title: "Make the decision",
    detail: "Keep the client record or accept the document value with an explicit action.",
    result: "An auditable review package",
  },
];

export function DashboardPage() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const matters = useMatters();
  const create = useCreateMatter();

  const handleCreate = async (dto: MatterCreateDto) => {
    const matter = await create.mutateAsync(dto);
    setOpen(false);
    navigate(`/matters/${matter.id}`);
  };

  if (matters.isLoading) return <LoadingState label="Loading matter workspace" />;
  if (matters.isError) return <ErrorState message="The matter workspace could not be loaded." />;

  const data = matters.data ?? [];
  const averageReadiness = data.length
    ? Math.round(data.reduce((total, item) => total + item.readiness_score, 0) / data.length)
    : 0;
  const reviewItems = data.reduce((total, item) => total + item.open_conflicts, 0);
  const readyMatters = data.filter((item) => item.status === "ready_for_review").length;

  return (
    <div className="space-y-8 lg:space-y-10">
      <section id="product" className="scroll-mt-28">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Badge color="info" className="mb-4 w-fit">
                Signed in as {auth.user?.role}
              </Badge>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
                Prepare a matter for professional review.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                MatterReady gives a case professional one guided place to confirm client data,
                review documents, make accountable decisions, and know when the matter is ready.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={() => setOpen(true)}>
                  <span className="flex items-center justify-center gap-2">
                    <AppIcon name="portfolio" size={18} />
                    Start a matter
                  </span>
                </Button>
                <Button
                  color="alternative"
                  size="lg"
                  onClick={() => document.getElementById("workflow")?.scrollIntoView()}
                >
                  See the four steps
                </Button>
              </div>
            </div>

            <Card className="border border-blue-100 bg-blue-50/60 shadow-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-700">Workspace health</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {averageReadiness}% average readiness
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <AppIcon name="readiness" size={23} />
                </span>
              </div>
              <Progress progress={averageReadiness} color="blue" size="lg" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border border-slate-200 bg-white shadow-none">
                  <p className="text-2xl font-semibold text-slate-950">{readyMatters}</p>
                  <p className="text-sm text-slate-500">Ready for review</p>
                </Card>
                <Card className="border border-slate-200 bg-white shadow-none">
                  <p className="text-2xl font-semibold text-slate-950">{reviewItems}</p>
                  <p className="text-sm text-slate-500">Human decisions pending</p>
                </Card>
              </div>
            </Card>
          </div>
        </Card>
      </section>

      <Alert color="info">
        <span className="font-semibold">Human utility:</span> the system reduces manual comparison,
        prevents silent AI overwrites, and produces a visible decision history for the reviewer.
      </Alert>

      <section id="workflow" className="scroll-mt-28 space-y-5">
        <div>
          <p className="text-sm font-semibold text-blue-700">The job to be done</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Four steps from intake to a review-ready matter
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Each step has a human purpose and a clear result. AI assists with document comparison;
            the professional remains responsible for every final decision.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map((step, index) => (
            <Card key={step.title} className="border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <AppIcon name={step.icon} size={20} />
                </span>
                <Badge color="gray">Step {index + 1}</Badge>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
              </div>
              <Alert color="success">{step.result}</Alert>
            </Card>
          ))}
        </div>
      </section>

      <section id="portfolio" className="scroll-mt-28 space-y-5" aria-labelledby="portfolio-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Active work</p>
            <h2 id="portfolio-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Matter portfolio
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Open the matter that needs action and continue at the correct step.
            </p>
          </div>
          <Button color="alternative" onClick={() => setOpen(true)}>
            <span className="flex items-center gap-2">
              <AppIcon name="portfolio" size={17} />
              Add matter
            </span>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon="portfolio" label="Matters" value={data.length} detail="Cases currently tracked" />
          <MetricCard icon="readiness" label="Average readiness" value={`${averageReadiness}%`} detail="Completion across the portfolio" />
          <MetricCard icon="clock" label="Review decisions" value={reviewItems} detail="Items requiring a professional choice" />
        </div>

        {data.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.map((matter) => <MatterCard key={matter.id} matter={matter} />)}
          </div>
        ) : (
          <EmptyState message="No matters exist yet. Start a matter to test the complete human-reviewed workflow." />
        )}
      </section>

      <section id="ai-capabilities" className="scroll-mt-28">
        <AutomationOverview />
      </section>

      <MatterFormModal
        open={open}
        busy={create.isPending}
        error={create.error}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
