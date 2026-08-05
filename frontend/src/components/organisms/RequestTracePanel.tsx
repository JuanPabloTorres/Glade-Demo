import { Card } from "flowbite-react";
import type { ApiOperationKey } from "../../api/apiContracts.generated";
import { getEndpoint } from "../../api/endpointRegistry";

const WORKSPACE_OPERATIONS: ApiOperationKey[] = [
  "matters.get",
  "matters.updateIntake",
  "documents.create",
  "conflicts.resolve",
  "readiness.get",
];

export function RequestTracePanel() {
  return (
    <Card>
      <div>
        <h2 className="text-lg font-semibold">Frontend → backend traceability</h2>
        <p className="text-sm text-gray-500">
          Generated from the shared API contract registry.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="p-2">Operation</th>
              <th className="p-2">Request</th>
              <th className="p-2">Controller.action</th>
            </tr>
          </thead>
          <tbody>
            {WORKSPACE_OPERATIONS.map((key) => {
              const endpoint = getEndpoint(key);
              return (
                <tr key={key} className="border-b border-gray-100">
                  <td className="p-2 font-medium">{endpoint.operationId}</td>
                  <td className="p-2 font-mono">
                    {endpoint.method} {endpoint.path}
                  </td>
                  <td className="p-2 font-mono">
                    {endpoint.controller}.{endpoint.action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
