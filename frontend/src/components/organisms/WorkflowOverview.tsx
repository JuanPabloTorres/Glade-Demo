import { Badge, Card } from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

const STEPS: { label: string; title: string; description: string; icon: AppIconName }[] = [
  {
    label: "Step 1",
    title: "Confirm the client record",
    description: "Capture the approved information that becomes the source of truth for the matter.",
    icon: "intake",
  },
  {
    label: "Step 2",
    title: "Analyze supporting documents",
    description: "Extract supported values, track required documents, and surface meaningful differences.",
    icon: "document",
  },
  {
    label: "Step 3",
    title: "Record the professional decision",
    description: "Keep the approved record or accept the document value with an explicit, auditable choice.",
    icon: "review",
  },
] as const;

export function WorkflowOverview() {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <div className="max-w-3xl">
        <Badge color="info" className="mb-3 w-fit">
          Guided workflow
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          Every screen communicates the next useful action
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The system separates assisted analysis from human authority, so users understand
          what the software found, what still needs attention, and who makes the final decision.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <AppIcon name={step.icon} size={22} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                {step.label}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
