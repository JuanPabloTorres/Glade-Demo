import { Alert, Spinner } from "flowbite-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-gray-500">
      <Spinner />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function ErrorState({ message = "Unable to load this information." }: { message?: string }) {
  return <Alert color="failure">{message}</Alert>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
      {message}
    </div>
  );
}
