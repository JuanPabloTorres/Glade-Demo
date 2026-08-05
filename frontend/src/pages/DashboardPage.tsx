import { Alert, Badge, Button, Card, Progress } from "flowbite-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { GUIDED_DEMO_MATTER_ID } from "../api/demoMatterApi";
import { useAuth } from "../auth/AuthContext";
import { AppIcon, type AppIconName } from "../components/atoms/AppIcon";
import { EmptyState, ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MatterCard } from "../components/molecules/MatterCard";
import { MetricCard } from "../components/molecules/MetricCard";
import { MatterFormModal } from "../components/organisms/MatterFormModal";
import { environment } from "../config/environment";
import { useCreateMatter, useMatters } from "../hooks/useMatters";
import type { MatterCreateDto } from "../types/api";

const WORKFLOW: { icon: AppIconName; title: string; detail: string }[] = [
  {
    icon: "intake",
    title: "Confirm the approved client record",
    detail: "Enter the information the professional trusts before comparing documents.",
  },
  {
    icon: "document",
    title: "Analyze supporting documents",
    detail: "MatterReady extracts supported fields and highlights only meaningful differences.",
  },
  {
    icon: "review",
    title: "Make every human decision",
    detail: "The reviewer chooses which value is correct; AI never overwrites the record silently.",
  },
  {
    icon: "readiness",
    title: "Deliver a review-ready package",
    detail: "Readiness shows what is complete, what is missing, and what still needs attention.",
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

  if (matters.isLoading) return <LoadingState label="Loading the reviewer workspace" />;
  if (matters.isError) {
    return <ErrorState message="The workspace could not be opened. Refresh the page to restore the evaluation data." />;
  }

  const data = matters.data ?? [];
  const averageReadiness = data.length
    ? Math.round(data.reduce((total, item) => total + item.readiness_score, 0) / data.length)
    : 0;
  const reviewItems = data.reduce((total, item) => total + item.open_conflicts, 0);
  const readyMatters = data.filter((item) => item.status === "ready_for_review").length;

  return (
    <div className="space-y-8 lg:space-y-10">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <Badge color="info" className="mb-4 w-fit">
              Reviewer workspace · {auth.user?.role}
            </Badge>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
              Turn one incomplete case into a review-ready matter.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              MatterReady helps a legal operations professional confirm the client record, compare
              supporting documents, resolve differences, and produce a clear package for final review.
            </p>

            <Alert color="info" className="mt-6">
              <span className="font-semibold">Start with the guided example.</span> It contains one
              document difference and one missing document so the purpose is visible immediately.
            </Alert>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {environment.useBrowserDemoStore ? (
                <Button size="lg" onClick={() => navigate(`/matters/${GUIDED_DEMO_MATTER_ID}`)}>
                  <span className="flex items-center justify-center gap-2">
                    <AppIcon name="review" size={18} />
                    Open guided example
                  </span>
                </Button>
              ) : null}
              <Button color="alternative" size="lg" onClick={() => setOpen(true)}>
                <span className="flex items-center justify-center gap-2">
                  <AppIcon name="portfolio" size={18} />
                  Create a new matter
                </span>
              </Button>
            </div>
          </div>

          <Card className="border border-blue-100 bg-blue-50/60 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">What the reviewer gets</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  One next action, not a technical dashboard
                </h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                <AppIcon name="readiness" size={23} />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Trusted record", "The approved client information stays visible."],
                ["Differences to decide", "Only conflicting document values require action."],
                ["Readiness result", "The system explains what remains before review."],
              ].map(([title, detail]) => (
                <Card key={title} className="border border-slate-200 bg-white shadow-none">
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </Card>

      {environment.useBrowserDemoStore ? (
        <Alert color="success">
          Evaluation matters are stored only in this browser. They survive refreshes and deployments,
          contain invented data, and can be safely recreated without exposing client information.
        </Alert>
      ) : null}

      <section className="space-y-5" aria-labelledby="workflow-heading">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-blue-700">How the system is used</p>
          <h2 id="workflow-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Four human steps from intake to final review
          </h2>
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
              <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{step.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="portfolio-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Your work queue</p>
            <h2 id="portfolio-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Matters that need attention
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Open a matter to see its next action, required documents, decisions, and readiness.
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
          <MetricCard icon="portfolio" label="Active matters" value={data.length} detail="Evaluation workspaces available" />
          <MetricCard icon="readiness" label="Average readiness" value={`${averageReadiness}%`} detail={`${readyMatters} ready for final review`} />
          <MetricCard icon="clock" label="Decisions pending" value={reviewItems} detail="Human choices still required" />
        </div>

        <Progress progress={averageReadiness} color="blue" size="lg" />

        {data.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.map((matter) => <MatterCard key={matter.id} matter={matter} />)}
          </div>
        ) : (
          <EmptyState message="No matters exist yet. Create one to begin the guided review workflow." />
        )}
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
