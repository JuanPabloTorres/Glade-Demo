import { Badge, Button, Card } from "flowbite-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AppIcon } from "../components/atoms/AppIcon";
import { EmptyState, ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { MatterCard } from "../components/molecules/MatterCard";
import { MetricCard } from "../components/molecules/MetricCard";
import { AutomationOverview } from "../components/organisms/AutomationOverview";
import { MatterFormModal } from "../components/organisms/MatterFormModal";
import { ProductValueMap } from "../components/organisms/ProductValueMap";
import { WorkflowOverview } from "../components/organisms/WorkflowOverview";
import { useCreateMatter, useMatters } from "../hooks/useMatters";
import type { MatterCreateDto } from "../types/api";

const HERO_STEPS = [
  { icon: "intake" as const, label: "Capture", detail: "Approved client record" },
  { icon: "document" as const, label: "Compare", detail: "Documents and case facts" },
  { icon: "review" as const, label: "Decide", detail: "Human-approved outcome" },
];

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
    ? Math.round(data.reduce((total, item) => total + item.readiness_score, 0) / data.length)
    : 0;
  const reviewItems = data.reduce((total, item) => total + item.open_conflicts, 0);
  const readyMatters = data.filter((item) => item.status === "ready_for_review").length;

  return (
    <div className="space-y-10 lg:space-y-12">
      <section id="product" className="scroll-mt-28">
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="grid items-stretch gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
            <div className="flex flex-col justify-center py-2">
              <Badge color="info" className="mb-5 w-fit">
                AI-assisted legal operations
              </Badge>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl sm:leading-[1.08]">
                Turn client intake and documents into a review-ready matter.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                MatterReady compares verified case information with supporting documents,
                identifies what needs attention, records the professional decision, and shows
                exactly what remains before review.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={() => setOpen(true)}>
                  <span className="flex items-center gap-2">
                    Create a matter
                    <AppIcon name="arrow-right" size={18} />
                  </span>
                </Button>
                <a
                  href="#workflow"
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  See the workflow
                  <AppIcon name="arrow-right" size={16} />
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {HERO_STEPS.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <AppIcon name={step.icon} size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Live workspace outcome
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Know the next action without reading technical diagnostics.
                  </h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm">
                  <AppIcon name="readiness" size={23} />
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <AppIcon name="check" size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{readyMatters} ready for review</p>
                      <p className="mt-1 text-sm text-slate-500">All requirements and decisions completed</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <AppIcon name="clock" size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{reviewItems} decisions outstanding</p>
                      <p className="mt-1 text-sm text-slate-500">Document differences requiring professional review</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-100/50 p-5">
                <p className="text-sm font-semibold text-slate-950">The value to the team</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Less manual comparison, no silent AI overwrites, and a visible path from
                  intake to accountable professional review.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <ProductValueMap />

      <section id="workflow" className="scroll-mt-28">
        <WorkflowOverview />
      </section>

      <section id="portfolio" className="scroll-mt-28 space-y-5" aria-labelledby="portfolio-heading">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-700">Operational workspace</p>
            <h2 id="portfolio-heading" className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              Matter portfolio
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              See readiness, unresolved decisions, and the next action for every matter.
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
          <MetricCard
            icon="portfolio"
            label="Matters in workspace"
            value={data.length}
            detail="Structured cases currently tracked"
          />
          <MetricCard
            icon="readiness"
            label="Average readiness"
            value={`${averageReadiness}%`}
            detail="Across required information and documents"
          />
          <MetricCard
            icon="clock"
            label="Items awaiting review"
            value={reviewItems}
            detail="Differences requiring a recorded decision"
          />
        </div>

        {data.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.map((matter) => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        ) : (
          <EmptyState message="No matters have been created. Start a matter to demonstrate structured intake, document analysis, and review readiness." />
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
