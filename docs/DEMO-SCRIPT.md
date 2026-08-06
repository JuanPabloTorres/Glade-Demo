# Five-Minute Demo Script

1. Open the login page — point out the background image, the two demo-role buttons, and the "what you'll see" hint under each.
2. **Client**: log in as the client. Show the dashboard: greeting, status, progress, next action, the chat entry point, pending tasks, requested documents, financial summary, timeline.
3. Open the persistent chat (floating button, bottom-right — reachable from the dashboard, not buried in a tab) and ask "¿Qué me falta?". Point out the suggested-action chips and the "Abrir sección recomendada" deep link.
4. Open the case workspace and walk the 10-stage flow (Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento). Add an income entry to show `ResponsiveDataView` (table on desktop, cards on mobile — resize the window to show both).
5. Submit the case ("Enviar al abogado") and point out the status badge changing to "Solicitud enviada."
6. **Attorney**: log out, log in as the attorney. Show the operational queue: filters (Urgentes, Esperando cliente, ...), search, sort.
7. Open the urgent case — the "case command center." Click "Generar resumen" and point out the draft is explicitly labeled "sujeto a revisión profesional" — never a legal conclusion. Click "Solicitar documento" and show it immediately appears on the client's evidence list with status "requested."
8. Ask the chat (same persistent panel, now scoped to this case and this role) something like "Resume el caso" — point out the response is the same `AssistantResponse` contract, still guardrail-checked, still never asserting a chapter recommendation or eligibility.
9. Close with the architecture: rule-based by default (`AI_PROVIDER=rule_based`, no network/model dependency), optionally Ollama or transformers behind the same interface — see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`, `docs/architecture/CASE-CONTEXT-ARCHITECTURE.md`, and `docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md` for the full design.
