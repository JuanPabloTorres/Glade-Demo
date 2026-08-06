import { Card } from "flowbite-react";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}
