# Feature catalog

| Feature | Roles | Main files | API/state | Tests |
|---|---|---|---|---|
| Authentication | client, attorney | `frontend/src/auth`, `LoginPage`, `backend/app/api/routers/auth.py` | JWT + demo accounts | auth/session/E2E |
| Client dashboard | client | `ClientDashboardPage`, workspace context | browser case state + analysis API | component/E2E |
| Attorney queue | attorney | `AttorneyDashboardPage` | shared synthetic cases | component/E2E |
| Case workspace | both | `CaseWorkspacePage`, organisms, workspace context | 10/11-stage state | unit/E2E |
| Assistant | both | chat components, AI router/providers/context builder | deterministic default; optional Ollama rewrite | provider/guardrail/E2E |
| Documents | both | document router/services and workspace UI | metadata plus ingestion/RAG scaffold | document tests |

Each feature change must update this table when ownership, routes, APIs or tests change.
