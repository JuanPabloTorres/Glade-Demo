import axios from "axios";

interface MutationFeedbackProps {
  success?: string | null;
  error?: unknown;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      if (typeof first?.msg === "string") {
        return first.msg;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "The operation could not be completed.";
}

export function MutationFeedback({ success, error }: MutationFeedbackProps) {
  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {getErrorMessage(error)}
      </div>
    );
  }
  if (success) {
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        {success}
      </div>
    );
  }
  return null;
}
