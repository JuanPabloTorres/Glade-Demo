// Generated from contracts/api-contracts.json. Do not edit manually.
// Only client-safe endpoint metadata is included in the browser bundle.
export const apiContracts = {
  "health.get": {
    "operationId": "getHealth",
    "method": "GET",
    "path": "/api/v1/health"
  },
  "auth.login": {
    "operationId": "login",
    "method": "POST",
    "path": "/api/v1/auth/login"
  },
  "auth.me": {
    "operationId": "getCurrentSession",
    "method": "GET",
    "path": "/api/v1/auth/me"
  },
  "matters.list": {
    "operationId": "listMatters",
    "method": "GET",
    "path": "/api/v1/matters"
  },
  "matters.create": {
    "operationId": "createMatter",
    "method": "POST",
    "path": "/api/v1/matters"
  },
  "matters.get": {
    "operationId": "getMatter",
    "method": "GET",
    "path": "/api/v1/matters/{matter_id}"
  },
  "matters.updateIntake": {
    "operationId": "updateMatterIntake",
    "method": "PUT",
    "path": "/api/v1/matters/{matter_id}/intake"
  },
  "documents.create": {
    "operationId": "createDocument",
    "method": "POST",
    "path": "/api/v1/matters/{matter_id}/documents"
  },
  "documents.list": {
    "operationId": "listDocuments",
    "method": "GET",
    "path": "/api/v1/matters/{matter_id}/documents"
  },
  "conflicts.list": {
    "operationId": "listConflicts",
    "method": "GET",
    "path": "/api/v1/matters/{matter_id}/conflicts"
  },
  "conflicts.resolve": {
    "operationId": "resolveConflict",
    "method": "POST",
    "path": "/api/v1/matters/{matter_id}/conflicts/{conflict_id}/resolve"
  },
  "readiness.get": {
    "operationId": "getReadiness",
    "method": "GET",
    "path": "/api/v1/matters/{matter_id}/readiness"
  },
  "activities.list": {
    "operationId": "listActivities",
    "method": "GET",
    "path": "/api/v1/matters/{matter_id}/activities"
  }
} as const;
export type ApiOperationKey = keyof typeof apiContracts;
