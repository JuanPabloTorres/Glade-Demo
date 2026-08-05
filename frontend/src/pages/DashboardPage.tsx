import { Button } from "flowbite-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { EmptyState, ErrorState, LoadingState } from "../components/atoms/AsyncState";
import { PageTitle } from "../components/atoms/PageTitle";
import { MatterCard } from "../components/molecules/MatterCard";
import { MetricCard } from "../components/molecules/MetricCard";
import { MatterFormModal } from "../components/organisms/MatterFormModal";
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
    return <LoadingState label="Loading matters" />;
  }
  if (matters.isError) {
    return <ErrorState />;
  }

  const data = matters.data ?? [];
  const averageReadiness = data.length
    ? Math.round(
        data.reduce((total, item) => total + item.readiness_score, 0) / data.length,
      )
    : 0;
  const openConflicts = data.reduce((total, item) => total + item.open_conflicts, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title="Legal matter workspace"
          subtitle="Canonical intake, document intelligence, conflict review, and readiness."
        />
        <Button onClick={() => setOpen(true)}>Create matter</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Matters" value={data.length} />
        <MetricCard label="Average readiness" value={`${averageReadiness}%`} />
        <MetricCard label="Open conflicts" value={openConflicts} />
      </div>

      {data.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((matter) => (
            <MatterCard key={matter.id} matter={matter} />
          ))}
        </div>
      ) : (
        <EmptyState message="Create the first synthetic matter to begin the demo." />
      )}

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
