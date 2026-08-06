# FreshStart / Glade-Demo — Estado verificado del repositorio (2026-08-06)

Este documento reemplaza como referencia cualquier auditoría pegada de otra sesión/herramienta.
Cada afirmación aquí fue verificada leyendo el código real en este repo (`frontend/src`, `backend/app`),
no inferida de un documento externo. Cita `archivo:línea` en cada punto — ver los reportes completos
de los agentes de exploración en el historial de esta conversación para el detalle línea por línea.

**Veredicto: NO-GO para uso como pieza principal de portfolio/entrevista**, con hallazgos concretos
y accionables, no vagos.

---

## 1. UI / Frontend

| Área | Estado | Evidencia |
|---|---|---|
| Sidebar persistente | **No existe** | Cero coincidencias de "sidebar" en todo `frontend/src`. Navegación vive entera en `ModernHeader.tsx`. |
| Header | **Sobrecargado** | `ModernHeader.tsx` (228 líneas) maneja 10 responsabilidades: logo, tabs de rol, selector de idioma, badges de cliente, badges de abogado, estado de IA, buscador de abogado, badge de versión, dropdown de usuario, toggle móvil. |
| Footer | Correcto y acotado | `ModernFooter.tsx` (81 líneas): marca, disclaimer, links con icono, copyright, badges de versión/entorno. No duplica navegación. |
| Design tokens | **No existen tokens reales** | Solo variables de color en `index.css:5-21` (+ alias legacy `--glade-*`). No hay escala tipográfica ni de spacing declarada — se depende de defaults de Tailwind. |
| Icon registry | Existe pero se evade | `src/config/iconRegistry.ts` es la fuente única declarada, pero `LoginPage.tsx:6` y `LanguageSelector.tsx:2` importan iconos de `react-icons` directamente, evadiéndolo. |
| Botones | **Dos sistemas conviviendo** | `AppButton` propio (`components/ui/AppButton.tsx`) vs `Button` de Flowbite usados sin criterio según la página. |
| Composición de páginas | Inconsistente | Login no usa `AppShell` (layout propio desde cero); Client Dashboard arma cards crudas por sección; Attorney Dashboard sí compone bien (`DataTableToolbar`, `ResponsiveDataView`); Case Workspace es en su mayoría markup Flowbite crudo por tab. |
| Responsive | **Bien implementado** | Breakpoints Tailwind consistentes (88 usos en 14 archivos); `ResponsiveDataView.tsx` separa tabla desktop / cards mobile explícitamente. Único gap: no hay un componente de navegación móvil dedicado, solo el collapse nativo de Flowbite `Navbar`. |
| Race condition de tabs | **Confirmada** | `CaseWorkspacePage.tsx:73-74` mezcla `useState(activeTab)` + `useRef(tabsRef)` imperativo. `ATTORNEY_REVIEW_TAB_INDEX = 10` y `FOCUS_SECTION_TAB_INDEX` son índices hardcodeados por posición (`:40-52`) — si se reordena un `TabItem`, el deep-link de IA salta al tab equivocado en silencio. Hay un `eslint-disable` (`:99`) tapando el warning en vez de corregirlo. |
| i18n | Bien, con 2 fugas | `CaseStageStepper.tsx:15-16` y `StageOrientation.tsx:64` tienen strings en español hardcodeados fuera de `t()`. |

## 2. Login / Seguridad de frontend

- Buen manejo de loading/disabled/errores (`LoginPage.tsx:24,35,48,143,152,208`).
- **Sin rate limiting** en frontend ni backend (confirmado en ambos lados).
- **Credenciales demo en texto plano en el bundle del cliente** (`LoginPage.tsx:12-13`), usadas por los botones de acceso rápido.
- **"Remember me" no hace nada** — el checkbox existe (`:27,197-204`) pero nunca se lee en ningún flujo de sesión.

## 3. Arquitectura backend

- `backend/app/domain/` y `backend/app/repositories/` son **paquetes vacíos** (solo `__init__.py` de 0 líneas) — la capa de dominio y el patrón repositorio nunca se implementaron pese a estar en la estructura.
- **Sin persistencia real**: no hay SQLAlchemy/Alembic/Postgres/SQLite en uso. `DATABASE_URL` se define en `api/index.py:13` pero `Settings` no lo lee (`extra="ignore"`) — es config muerta. El caso completo viaja en cada request; el estado vive en `localStorage` del navegador.
- `contracts/api-contracts.json` **sí es fuente de verdad real**, no decorativa: backend deriva rutas de ahí (`core/contracts.py`) y hay un test que verifica sincronía con el OpenAPI schema (`test_api_contracts.py`). Frontend consume el mismo archivo generado. Esto es una fortaleza genuina a conservar.

## 4. IA / Ollama

- **Confirmado exactamente como se sospechaba**: `RuleBasedProvider` (`ai/providers/rule_based.py`) genera el 100% de los hechos, intención, acciones sugeridas y sección de foco. `OllamaProvider.generate()` (`ollama_provider.py:51-56`) solo reescribe `draft.message` — nunca decide nada. El propio docstring lo documenta así.
- El contexto de IA (`CaseContextDto`) **no incluye timeline ni historial de conversación persistido** — es un gap documentado en el propio código (`schemas/assistant.py:72-80`).
- **Hallazgo nuevo, no estaba en el documento pegado**: existe un pipeline RAG completo (ingestión, embeddings, índice por caso) en `services/documents/`, pero **`CaseDocumentIndex.search()` nunca se llama** desde el flujo de chat (`bankruptcy_service.py` no la importa). Es decir, los documentos se indexan pero jamás se recuperan para enriquecer una respuesta — RAG es código muerto en la práctica, no un sistema activo.
- Guardrails son reales y se ejecutan siempre (`ai/guardrails.py`), con caso de aislamiento estructural (el provider nunca ve el caso completo, solo `CaseContextDto`).
- Degradación ante Ollama caído está bien resuelta y **sí se comunica en la UI** (`useAiHealth.ts`, badge + banner de reintento en `ChatPanel.tsx`).
- **Ollama nunca fue probado contra un modelo real** — los tests (`test_ai_providers.py`) mockean `urllib.request.urlopen` por completo.

## 5. Seguridad backend

- JWT: secreto por defecto **hardcodeado** (`core/config.py:18`), overrideable por env pero **sin verificación que rechace el default en producción**. Expira a los 45 min, HS256, hash Argon2 vía `pwdlib`. Sin rate limiting confirmado (cero referencias a throttling en todo el backend).
- **Hallazgo nuevo, no estaba en el documento pegado**: **no hay verificación de propiedad de caso (`owner_user_id`) en ningún endpoint.** El campo existe en el DTO pero nunca se compara contra el usuario autenticado — cualquier cliente o abogado autenticado puede enviar cualquier `case_id`/caso y el backend lo procesa. Es consecuencia directa de no tener persistencia server-side: no hay contra qué verificar.
- CORS: allowlist explícita, sin wildcard — correcto, pero solo hay `http://localhost:5173` configurado en todo el repo; no existe un origin de producción declarado en ningún archivo.

## 6. Calidad / pruebas

- **55 tests backend / 27 tests frontend — confirmado exacto**, corriendo hoy.
- Nada de axe/Lighthouse ejecutado como parte del pipeline verificado en este repo.

---

## Veredicto por dimensión (Definition of Done, sección 24 de la guía)

| Dimensión | Estado |
|---|---|
| Producto | Parcial — flujos existen pero páginas no comunican "próxima acción" de forma consistente |
| UI | **NO-GO** — sin sidebar, sin tokens tipográficos, header sobrecargado, dos sistemas de botón |
| Arquitectura | **NO-GO** — domain/repositories vacíos, sin persistencia, sin autorización por ownership |
| IA | **NO-GO** — RAG no conectado, sin timeline/historial, Ollama nunca probado contra modelo real |
| Seguridad | **NO-GO** — sin rate limiting, sin ownership check, secreto JWT por defecto sin guardas de producción |
| Calidad | Parcial — buena cobertura unitaria backend/frontend, sin verificación visual/accesibilidad |

**Resultado: NO-GO.** No es un problema de "pulir estilos" — hay tres gaps arquitectónicos reales
(persistencia, autorización por ownership, RAG desconectado) además de los visuales.
