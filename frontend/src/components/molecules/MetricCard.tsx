import { Card } from "flowbite-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
      {detail ? <p className="text-xs text-gray-500">{detail}</p> : null}
    </Card>
  );
}
