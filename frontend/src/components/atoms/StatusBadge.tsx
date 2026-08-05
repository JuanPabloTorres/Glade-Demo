import { Badge } from "flowbite-react";

type BadgeColor = "info" | "success" | "warning" | "gray" | "failure";

const STATUS_COLORS: Record<string, BadgeColor> = {
  intake: "info",
  active: "success",
  ready_for_review: "success",
  processed: "success",
  needs_review: "warning",
  open: "failure",
  resolved: "success",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge color={STATUS_COLORS[value] ?? "gray"}>
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
