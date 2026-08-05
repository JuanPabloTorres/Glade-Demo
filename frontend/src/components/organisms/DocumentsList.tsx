import { Card } from "flowbite-react";
import type { DocumentDto } from "../../types/api";
import { EmptyState } from "../atoms/AsyncState";
import { StatusBadge } from "../atoms/StatusBadge";

export function DocumentsList({ documents }: { documents: DocumentDto[] }) {
  if (!documents.length) {
    return <EmptyState message="No documents processed yet." />;
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <Card key={document.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{document.original_name}</h3>
              <p className="text-sm capitalize text-gray-500">
                {document.document_type.replaceAll("_", " ")}
              </p>
            </div>
            <StatusBadge value={document.status} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {document.facts.map((fact) => (
              <div key={fact.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                <span className="font-medium capitalize">
                  {fact.field_name.replaceAll("_", " ")}:{" "}
                </span>
                {fact.value}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
