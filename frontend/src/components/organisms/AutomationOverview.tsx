import { Badge, Card } from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

const CAPABILITIES: { title: string; description: string; icon: AppIconName }[] = [
  {
    title: "Replaceable AI provider boundary",
    description:
      "Document intelligence is isolated behind a provider interface, so models can change without rewriting business rules.",
    icon: "automation",
  },
  {
    title: "Human authority is explicit",
    description:
      "Extracted values never overwrite the approved record silently. Every material difference requires a recorded decision.",
    icon: "user",
  },
  {
    title: "Readiness is deterministic",
    description:
      "Required information, analyzed documents, and unresolved items produce a transparent score and next action.",
    icon: "readiness",
  },
  {
    title: "The workflow is auditable",
    description:
      "Important actions and decisions remain visible in a timeline without exposing internal diagnostics to end users.",
    icon: "history",
  },
] as const;

export function AutomationOverview() {
  return (
    <Card className="border border-blue-100 bg-blue-50/50 shadow-sm">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <Badge color="info" className="mb-3 w-fit">
            AI-ready architecture
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            AI that supports judgment instead of hiding it
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            MatterReady demonstrates responsible AI implementation: automation performs
            bounded analysis, while professionals retain control over the case record and outcome.
          </p>
          <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <AppIcon name="shield" size={21} />
              </span>
              <div>
                <p className="font-semibold text-slate-950">Recruiter-facing engineering evidence</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Typed API contracts, provider abstraction, deterministic rules, CI validation,
                  and full browser testing demonstrate disciplined AI-assisted software delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="rounded-2xl border border-blue-100 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <AppIcon name={capability.icon} size={20} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-950">{capability.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{capability.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
