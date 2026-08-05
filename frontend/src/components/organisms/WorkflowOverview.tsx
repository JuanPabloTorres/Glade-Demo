import { Badge, Card } from "flowbite-react";

const STEPS = [
  {
    number: "01",
    title: "Structure the intake",
    description: "Capture the approved client information that guides every later decision.",
  },
  {
    number: "02",
    title: "Analyze documents",
    description: "Extract supported fields and identify values that require attention.",
  },
  {
    number: "03",
    title: "Approve the outcome",
    description: "Resolve differences, complete requirements, and prepare the matter for review.",
  },
] as const;

export function WorkflowOverview() {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Badge color="info" className="mb-3 w-fit">
            Review-first automation
          </Badge>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            A clear path from intake to professional review
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            MatterReady organizes the work into three accountable stages so users always
            understand what happened, what needs attention, and what comes next.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <span className="text-xs font-semibold tracking-widest text-blue-700">
              STEP {step.number}
            </span>
            <h3 className="mt-2 font-semibold text-gray-900">{step.title}</h3>
            <p className="mt-1 text-sm leading-5 text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
