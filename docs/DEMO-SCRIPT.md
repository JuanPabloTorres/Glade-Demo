# Five-Minute Demo Script

1. Open the login page — point out the background image, the two demo-role buttons, the language selector (ES/EN), and the "what you'll see" hint under each.
2. **Client**: log in as the client. Show the dashboard: greeting, status, progress, next action, the chat entry point, pending tasks, requested documents, financial summary, timeline.
3. Open the persistent chat (floating button, bottom-right — reachable from the dashboard, not buried in a tab) and ask "¿Qué me falta?". Point out the suggested-action chips and the "Abrir sección recomendada" deep link.
4. Open the case workspace and walk the 10-stage flow (Comenzar → Hogar → Ingresos → Gastos → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento). Add an income entry to show `ResponsiveDataView` (table on desktop, cards on mobile — resize the window to show both).
5. Submit the case ("Enviar al abogado") and point out the status badge changing to "Solicitud enviada."
6. **Attorney**: log out, log in as the attorney. Show the operational queue: filters (Urgentes, Esperando cliente, ...), search, sort, rows-per-page, and `Actions` menu.
7. Open the urgent case — the "case command center." Click "Generar resumen" and point out the draft is explicitly labeled "sujeto a revisión profesional" — never a legal conclusion. Click "Solicitar documento" and show it immediately appears on the client's evidence list with status "requested."
8. Ask the chat (same persistent panel, now scoped to this case and this role) something like "Resume el caso" — point out the response is the same `AssistantResponse` contract, still guardrail-checked, still never asserting a chapter recommendation or eligibility.
9. Point out the AI status badge in the header and chat (`IA conectada` / `IA sin conexión`) and use the retry button if Ollama is offline.
10. Close with the architecture: rule-based by default (`AI_PROVIDER=rule_based`, no network/model dependency), optionally Ollama or transformers behind the same interface — see `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`, `docs/architecture/CASE-CONTEXT-ARCHITECTURE.md`, and `docs/architecture/DOCUMENT-AND-RAG-PIPELINE.md` for the full design.

## Internacionalización Español-Inglés

- Librería: `i18next` + `react-i18next`.
- Locales activos: `es` y `en` con recursos modulares por dominio en `frontend/src/locales/es/*.json` y `frontend/src/locales/en/*.json`.
- Idioma por defecto: `es` (configurable con `VITE_DEFAULT_LANGUAGE`).
- Persistencia: selección de idioma en `localStorage` (`freshstart.language`) y uso de `Accept-Language` en llamadas HTTP.
- Fallback: resolución por preferencia de usuario/perfil, almacenamiento local, navegador y fallback final a idioma por defecto.
- Formatos regionales: `es-PR` y `en-US` para fecha, hora, moneda y números desde utilitarios centralizados en `frontend/src/i18n/format.ts`.
- Backend: respuestas de error con `code` + `messageKey` estables; presentación final localizada en frontend.
- AI/Ollama: el flujo de guidance recibe locale activo y el proveedor determinístico responde según idioma de contexto.
- Validación de paridad: `npm run i18n:check` valida llaves, valores vacíos e interpolaciones entre `es` y `en`.
- Estado de pruebas frontend: `npx tsc --noEmit` y `npm run i18n:check` pasan; `npm run lint` mantiene únicamente warnings no bloqueantes preexistentes.
