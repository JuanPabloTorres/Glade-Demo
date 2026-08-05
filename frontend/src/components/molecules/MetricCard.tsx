import { Card } from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: AppIconName;
}

export function MetricCard({ label, value, detail, icon = "readiness" }: MetricCardProps) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <AppIcon name={icon} size={20} />
        </span>
      </div>
      {detail ? <p className="text-sm leading-6 text-slate-500">{detail}</p> : null}
    </Card>
  );
}
