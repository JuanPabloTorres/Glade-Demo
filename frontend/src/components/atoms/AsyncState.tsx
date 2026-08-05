import { Alert, Spinner } from "flowbite-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-gray-500">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({ message = "Unable to load data." }: { message?: string }) {
  return <Alert color="failure">{message}</Alert>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
