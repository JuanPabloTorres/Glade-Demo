import { Card } from "flowbite-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
      {detail ? <p className="text-sm text-gray-500">{detail}</p> : null}
    </Card>
  );
}
