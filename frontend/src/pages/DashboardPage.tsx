import { Badge, Button, Card } from "flowbite-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { EmptyState, ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MatterCard } from "../components/molecules/MatterCard";
import { MetricCard } from "../components/molecules/MetricCard";
import { AutomationOverview } from "../components/organisms/AutomationOverview";
import { MatterFormModal } from "../components/organisms/MatterFormModal";
import { WorkflowOverview } from "../components/organisms/WorkflowOverview";
import { useCreateMatter, useMatters } from "../hooks/useMatters";
import type { MatterCreateDto } from "../types/api";

export function DashboardPage() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const matters = useMatters();
  const create = useCreateMatter();

  const handleCreate = async (dto: MatterCreateDto) => {
    const matter = await create.mutateAsync(dto);
    setOpen(false);
    navigate(`/matters/${matter.id}`);
  };

  if (matters.isLoading) {
    return <LoadingState label="Loading matter portfolio" />;
  }
  if (matters.isError) {
    return <ErrorState message="The matter portfolio could not be loaded." />;
  }

  const data = matters.data ?? [];
  const averageReadiness = data.length
    ? Math.round(
        data.reduce((total, item) => total + item.readiness_score, 0) / data.length,
      )
    : 0;
  const reviewItems = data.reduce((total, item) => total + item.open_conflicts, 0);
  const readyMatters = data.filter((item) => item.status === "ready_for_review").length;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <Badge color="info" className="w-fit">
              AI-ready legal operations
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Prepare every matter with a clear, reviewable workflow.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                MatterReady turns client intake and document analysis into structured
                decisions, transparent readiness, and an auditable path to professional
                review.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => setOpen(true)}>
                Create a matter
              </Button>
              <span className="text-sm text-gray-500">
                Start with verified client information, then review document findings.
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900 p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              Operational outcome
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Know what is complete, what needs review, and what action comes next.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold">{readyMatters}</p>
                <p className="text-sm text-gray-300">Ready for professional review</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-2xl font-semibold">{reviewItems}</p>
                <p className="text-sm text-gray-300">Human decisions outstanding</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <WorkflowOverview />

      <section className="space-y-4" aria-labelledby="portfolio-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Workspace overview</p>
            <h2 id="portfolio-heading" className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
              Matter portfolio
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor readiness and open each matter at the point where attention is needed.
            </p>
          </div>
          <Button color="alternative" onClick={() => setOpen(true)}>
            Add matter
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Matters in workspace"
            value={data.length}
            detail="Structured cases currently tracked"
          />
          <MetricCard
            label="Average readiness"
            value={`${averageReadiness}%`}
            detail="Across required information and documents"
          />
          <MetricCard
            label="Items awaiting review"
            value={reviewItems}
            detail="Differences that require a recorded decision"
          />
        </div>

        {data.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.map((matter) => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        ) : (
          <EmptyState message="No matters have been created. Start a matter to demonstrate structured intake, document analysis, and review readiness." />
        )}
      </section>

      <AutomationOverview />

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
