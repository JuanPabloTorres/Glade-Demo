# 03 — Functional Audit

Method: manual, script-driven exploration of the running app via Playwright (not just reading
source), against a fresh local backend + frontend, in Spanish (`es-PR`) locale. Every flow below was
actually clicked through and its real rendered output captured, not assumed from code. All bugs
found here were fixed in `main` before this document was written — see `07-test-results.md` for the
automated regression coverage that now guards them.

## Client flow (10 steps) — end-to-end, verified working

1. **Login** — `/` redirects to `/login`; "Entrar como cliente" quick-fills and submits demo
   credentials; lands on client dashboard.
2. **Dashboard** — greeting, status badge, 100% progress, next-action card, financial summary
   ($2,058.33 net income / $2,400 expenses / -$341.67 cash flow), recent activity, pending tasks.
3. **Open case** — "Continuar" opens the 10-stage workspace (`Comenzar → Hogar → Ingresos → Gastos
   → Deudas → Bienes → Documentos → Revisión → Enviado → Seguimiento`); completion score visible.
4. **Chat (persistent panel)** — opens as a drawer, not a workspace tab; asks "¿Qué documentos me
   faltan?"; gets a real rule-based reply plus contextual suggested actions.
5. **Suggested action → recommended section** — clicking a suggested action navigates the
   workspace tabs and **closes the chat panel automatically**.
6. **Add income** — modal (Categoría/Fuente/Ingreso bruto/neto/Frecuencia) → saves → appears in
   the income table with computed monthly-equivalent figures.
7. **Add expense** — modal (Categoría/Descripción/Monto mensual/necesario checkbox) → saves →
   appears in the expense table.
8. **Add document (evidence metadata)** — modal (Tipo de evidencia/Archivo-name-only/Nombre/Estado/
   Nota) → saves → appears in the documents list with a correctly translated evidence-type label.
9. **Updated summary** — "Comenzar" tab reflects new income/expense entries in the recomputed
   financial summary and next-steps list.
10. **Submit to attorney** — "Enviar al abogado" (always visible in the workspace header, not
    tab-gated) → case status flips to "Solicitud enviada", persisted.

## Attorney flow (9 steps) — end-to-end, verified working

1. **Login as attorney** — dashboard: "Revisa solicitudes financieras antes de la consulta.",
   stat cards (Requests/In review/Urgent/Waiting on client), full case inbox table.
2. **Filter urgent** — "Urgentes" filter correctly isolates the urgent case (Miguel Santos) and
   hides the non-urgent one (Elena Rivera).
3. **Open a case** — "Ver" action opens the full case workspace scoped to that client, in an
   attorney-specific view with an 11th tab ("Revisión del abogado").
4. **Generate AI summary** — "Generar resumen" produces a real draft summary (client name, goal,
   household, all financials, urgencies, alerts, discussion questions) in a dialog with a
   legal-disclaimer line and a "Guardar en notas" action.
5. **Request a document** — modal picks an evidence type, submits, and the new row appears in
   the client's Documents tab as "Solicitado" with a translated type label (not a raw file name).
6. **Add a professional note** — saves and is reflected verbatim in "Notas profesionales".
7. **Change case status** — status dropdown updates the case and appends a translated timeline
   entry ("El expediente cambió a Consulta programada.").
8. **Timeline** — "Seguimiento" tab shows the full case timeline including the new status-change
   entry, correctly ordered.

## CRUD coverage actually exercised

| Entity | Create | Read | Delete | Notes |
|---|---|---|---|---|
| Income | ✅ | ✅ | not exercised (delete button present, untested this pass) | |
| Expense | ✅ | ✅ | not exercised | |
| Evidence/documents | ✅ (both client-uploaded metadata and attorney-requested) | ✅ | not exercised | |
| Attorney notes | ✅ | ✅ | n/a (append-only) | |
| Case status | ✅ (update) | ✅ | n/a | |

Edit-in-place forms weren't found for income/expense/debt/asset rows — only add + delete. This is a
reasonable simplification for a demo but is a real gap if "edit an existing entry" comes up live;
the workaround (delete + re-add) works but isn't as polished.

## Real bugs found via this pass (all fixed, see individual commits on `main`)

1. Evidence-completeness score read 0% instead of the correct value (evidence-type slug vs.
   translated-label mismatch, both frontend and backend).
2. Requested-document rows showed the raw internal slug as a file name.
3. Status-change timeline entries leaked the raw internal status slug in Spanish text.
4. Attorney demo login silently rendered the entire app in English.
5. A stale e2e spec asserted UI text/buttons that no longer exist post-v3.0.0 rebuild.

## Known gap — not fixed, logged for follow-up

**Tab-transition race**: navigating via the chat's "Abrir sección recomendada" suggested action
uses `tabsRef.current.setActiveTab()` (an imperative ref call) rather than the same click path a
user takes on a tab button. In one reproduction (not consistently reproducible), the previously
active tabpanel remained un-hidden and stacked over the newly selected one, intercepting clicks on
elements underneath for the full length of Playwright's 30s retry window. This didn't reproduce in
isolated single-test runs, only inside a longer full-suite run, which points to a timing race rather
than a deterministic logic bug. The automated e2e test was made robust against it (explicit wait for
the old panel to hide + the new one to show) rather than leaving it flaky, but **the underlying race
in `CaseWorkspacePage.tsx`'s `tabsRef`/`onActiveTabChange` wiring was not root-caused** — see
`05-architecture-audit.md` for the recommended follow-up.

## Case-limit handling observed

- **Negative cash flow** (Elena's case: -$341.67/mo) is surfaced as an explicit alert, not hidden or
  silently miscalculated.
- **Urgent collection action** correctly drives the attorney's "Urgentes" filter and a visible badge
  on the case header.
- **Missing evidence** drives both a completion-percentage metric and a specific "N documento(s)
  sugerido(s) sin respaldo" count, with an itemized checklist explaining exactly what's missing.
- **AI service unavailable** (Ollama not running) has an explicit fallback path in the rule-based
  provider and a dedicated UI state ("IA sin conexión" with retry) — not silently broken.
