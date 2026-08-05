import { Badge, Card } from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

interface ValueColumn {
  label: string;
  title: string;
  description: string;
  icon: AppIconName;
  items: string[];
}

const COLUMNS: ValueColumn[] = [
  {
    label: "Inputs",
    title: "Verified client information",
    description: "Start with the information the professional team has approved.",
    icon: "intake",
    items: ["Client intake", "Case details", "Supporting documents"],
  },
  {
    label: "Assisted processing",
    title: "Compare documents with the case record",
    description: "Extract supported values and surface only the differences that need attention.",
    icon: "automation",
    items: ["Structured extraction", "Conflict detection", "Required-document tracking"],
  },
  {
    label: "Professional outcome",
    title: "A matter ready for accountable review",
    description: "Human decisions determine the final record, readiness score, and next action.",
    icon: "review",
    items: ["Recorded decisions", "Transparent readiness", "Auditable activity history"],
  },
];

export function ProductValueMap() {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <div className="mb-2 max-w-3xl">
        <Badge color="info" className="mb-3 w-fit">
          What the system does
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          From scattered information to a review-ready matter
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          MatterReady gives legal operations teams one controlled workspace for intake,
          document review, human decisions, and case readiness.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((column, index) => (
          <div key={column.label} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <AppIcon name={column.icon} size={24} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  {column.label}
                </p>
                <h3 className="mt-2 text-lg font-semibold leading-6 text-slate-950">
                  {column.title}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{column.description}</p>
            <ul className="mt-5 space-y-3">
              {column.items.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <AppIcon name="check" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            {index < COLUMNS.length - 1 ? (
              <span className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm lg:flex">
                <AppIcon name="arrow-right" size={16} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
