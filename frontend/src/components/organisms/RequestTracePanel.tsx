import { Button, Card } from "flowbite-react";
import { useSyncExternalStore } from "react";
import {
  clearApiTraces,
  getApiTraceSnapshot,
  subscribeApiTraces,
} from "../../api/traceStore";
import { EmptyState } from "../atoms/AsyncState";

export function RequestTracePanel() {
  const traces = useSyncExternalStore(
    subscribeApiTraces,
    getApiTraceSnapshot,
    getApiTraceSnapshot,
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live frontend → backend traceability</h2>
          <p className="text-sm text-gray-500">
            Captured from the headers returned by the controller that handled each request.
          </p>
        </div>
        {traces.length ? (
          <Button color="alternative" size="xs" onClick={clearApiTraces}>
            Clear trace
          </Button>
        ) : null}
      </div>

      {!traces.length ? (
        <EmptyState message="Use the workspace to capture live API traces." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="p-2">Status</th>
                <th className="p-2">Request</th>
                <th className="p-2">Operation</th>
                <th className="p-2">Controller.action</th>
                <th className="p-2">Match</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => (
                <tr key={trace.id} className="border-b border-gray-100">
                  <td className="p-2 font-medium">{trace.status}</td>
                  <td className="p-2 font-mono">
                    {trace.method} {trace.path}
                  </td>
                  <td className="p-2 font-medium">{trace.operationId}</td>
                  <td className="p-2 font-mono">
                    {trace.controller}.{trace.action}
                  </td>
                  <td className="p-2">
                    <span className={trace.traceMatch === "true" ? "text-green-700" : "text-amber-700"}>
                      {trace.traceMatch}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
