import { Badge, Card } from "flowbite-react";

const CAPABILITIES = [
  {
    title: "Provider-based document intelligence",
    description:
      "Document analysis is isolated behind a provider interface, allowing the workflow to adopt additional AI services without changing business rules.",
  },
  {
    title: "Human-approved decisions",
    description:
      "Extracted values never replace the approved client record silently. Every difference requires an explicit review decision.",
  },
  {
    title: "Deterministic readiness",
    description:
      "Required information, analyzed documents, and unresolved review items produce a transparent readiness score.",
  },
  {
    title: "Auditable workflow",
    description:
      "Important actions are recorded as a decision history, supporting accountability and operational follow-through.",
  },
] as const;

export function AutomationOverview() {
  return (
    <Card className="border border-blue-100 bg-blue-50/40 shadow-sm">
      <div className="space-y-2">
        <Badge color="info" className="w-fit">
          AI-ready architecture
        </Badge>
        <h2 className="text-lg font-semibold text-gray-900">
          Automation that supports professional judgment
        </h2>
        <p className="text-sm leading-6 text-gray-600">
          MatterReady combines structured data, document intelligence, and controlled
          review. The end-user experience focuses on decisions and outcomes while
          implementation diagnostics remain outside the workspace.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((capability) => (
          <div key={capability.title} className="rounded-xl border border-blue-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{capability.title}</h3>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              {capability.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
