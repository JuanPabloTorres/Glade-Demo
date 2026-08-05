import axios from "axios";
import { Alert } from "flowbite-react";

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
    return "The request could not be completed. Review the information and try again.";
  }
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}

export function MutationFeedback({ success, error }: MutationFeedbackProps) {
  if (error) {
    return (
      <Alert color="failure">
        <span className="font-medium">Action required. </span>
        {getErrorMessage(error)}
      </Alert>
    );
  }
  if (success) {
    return <Alert color="success">{success}</Alert>;
  }
  return null;
}
