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
  "bankruptcy.analyze": {
    "operationId": "analyzeBankruptcyCase",
    "method": "POST",
    "path": "/api/v1/bankruptcy/analyze"
  },
  "bankruptcy.guide": {
    "operationId": "guideBankruptcyCase",
    "method": "POST",
    "path": "/api/v1/bankruptcy/guide"
  },
  "documents.analyze": {
    "operationId": "analyzeDocument",
    "method": "POST",
    "path": "/api/v1/documents/analyze"
  }
} as const;
export type ApiOperationKey = keyof typeof apiContracts;
