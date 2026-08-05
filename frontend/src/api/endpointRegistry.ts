import { apiContracts, type ApiOperationKey } from "./apiContracts.generated";

export interface EndpointDescriptor {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
}

export function getEndpoint(key: ApiOperationKey): EndpointDescriptor {
  return apiContracts[key];
}

export function buildPath(
  key: ApiOperationKey,
  params: Record<string, string> = {},
): string {
  let path: string = getEndpoint(key).path;
  for (const [name, value] of Object.entries(params)) {
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }
  const unresolved = path.match(/\{[^}]+\}/g);
  if (unresolved) {
    throw new Error(
      `Missing path parameter(s) for ${key}: ${unresolved.join(", ")}`,
    );
  }
  return path;
}
