import { Badge } from "flowbite-react";

type BadgeColor = "info" | "success" | "warning" | "gray" | "failure";

const STATUS_PRESENTATION: Record<string, { color: BadgeColor; label: string }> = {
  intake: { color: "info", label: "Intake" },
  active: { color: "info", label: "In progress" },
  ready_for_review: { color: "success", label: "Ready for review" },
  processed: { color: "success", label: "Analyzed" },
  needs_review: { color: "warning", label: "Needs review" },
  open: { color: "warning", label: "Decision needed" },
  resolved: { color: "success", label: "Decision recorded" },
};

export function StatusBadge({ value }: { value: string }) {
  const presentation = STATUS_PRESENTATION[value] ?? {
    color: "gray" as const,
    label: value.replaceAll("_", " "),
  };

  return <Badge color={presentation.color}>{presentation.label}</Badge>;
}
