import { Badge, Card } from "flowbite-react";
import type { DocumentDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";
import { StatusBadge } from "../atoms/StatusBadge";

export function DocumentsList({ documents }: { documents: DocumentDto[] }) {
  if (!documents.length) {
    return <EmptyState message="No documents have been analyzed for this matter." />;
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <Card
          key={document.id}
          data-testid={`document-${document.original_name}`}
          className="border border-gray-200 shadow-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">{document.original_name}</h3>
              <p className="mt-1 text-sm capitalize text-gray-500">
                {document.document_type.replaceAll("_", " ")}
              </p>
            </div>
            <StatusBadge value={document.status} />
          </div>

          {document.facts.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {document.facts.map((fact) => (
                <div key={fact.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium capitalize text-gray-900">
                      {fact.field_name.replaceAll("_", " ")}
                    </span>
                    {fact.is_current ? <Badge color="success">Approved value</Badge> : null}
                  </div>
                  <p className="text-gray-700">{fact.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No supported client fields were identified in this document.
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
