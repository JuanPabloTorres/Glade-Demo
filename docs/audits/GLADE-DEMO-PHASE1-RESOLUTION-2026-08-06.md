# FreshStart / Glade-Demo — Resolución Fase 1+2 (2026-08-06)

Addendum a [`GLADE-DEMO-GROUNDED-STATE-2026-08-06.md`](./GLADE-DEMO-GROUNDED-STATE-2026-08-06.md) — ese
documento describe el estado *antes* de esta sesión de refactor y se deja sin modificar como snapshot
histórico. Este archivo registra qué se cerró, qué quedó parcialmente resuelto y qué sigue abierto,
en la rama `refactor/ui-and-architecture-phase1` (sin mergear a `main`, sin push).

## Cerrado, verificado con tests reales

| Hallazgo original | Resolución | Evidencia |
|---|---|---|
| Sin sidebar | `components/organisms/navigation/{Sidebar,SidebarItem,SidebarGroup}.tsx`, role-aware | `Sidebar.test.tsx` (4 tests) |
| Header con 10 responsabilidades | Reducido a 5 (título, idioma, estado IA, versión, perfil) | Lectura directa de `ModernHeader.tsx` |
| Sin design tokens tipográficos/spacing | `--font-*`/`--space-*` en `index.css` | grep 13→47 tokens |
| Dos sistemas de botón | Consolidado en `AppButton` | grep: 0 usos crudos de `Button` de Flowbite fuera de `AppButton.tsx` |
| Icon registry evadido | Corregido en Login/LanguageSelector | grep: 0 imports directos de `react-icons` |
| i18n hardcodeado | Corregido (`CaseStageStepper`, `StageOrientation`, `CaseWorkspacePage`) | grep: 0 coincidencias |
| Race condition de tabs | Single-source-of-truth `activeStage` + `navigateToStage` | `CaseWorkspacePage.test.tsx` (3 tests) + bug adicional de Flowbite encontrado y corregido |
| Sin persistencia real | SQLAlchemy + Alembic, `domain/`/`repositories/` implementados | `test_case_ownership.py`, `test_ai_context_persistence.py` |
| Sin ownership check | `CaseAccessService`, aplicado a los 3 endpoints case-scoped | 7 tests de bypass/spoofing/aislamiento |
| RAG desconectado | `CaseDocumentIndex.search()` llamado desde `guide()` | `test_document_pipeline.py` |
| Sin timeline/historial en contexto de IA | `CaseContextDto.timeline`/`.recent_conversation` poblados | `test_ai_context_persistence.py` |
| Sin rate limiting en login | Ventana deslizante en memoria, 429 | `test_login_rate_limit.py` (6 tests) |
| JWT secret sin guarda de producción | `Settings` rechaza boot con secreto default en producción | `test_jwt_production_guard.py` |
| **Blocker nuevo**: `requirements.txt` de Vercel sin SQLAlchemy | Agregado | — |
| Admin reset sin restricción de rol | Restringido a abogado | `test_admin.py` |
| "Remember me" no funcional | Ahora selecciona localStorage/sessionStorage | `session.test.ts` (+3 tests) |
| Disclaimer de credenciales demo débil | Reforzado en es/en | — |
| Ollama nunca probado contra modelo real | Test real gated por reachability (`test_ollama_live_integration.py`) — **skip limpio en este entorno** (sin daemon Ollama disponible aquí), listo para correr donde sí lo haya | 2 tests, skip confirmado |
| Sin verificación de origen CORS en producción | Warning (no fatal) al bootear en producción con el default | `test_jwt_production_guard.py` (2 tests nuevos) — **ver limitación abajo** |

Tests: backend 55 → **89** (2 skip-gated), frontend 27 → **37**. Build y `tsc -b` limpios en ambos.

## Parcialmente resuelto / limitación reconocida, no un cierre completo

- **CORS en producción**: se agregó una advertencia de arranque, no un bloqueo — a propósito, porque
  Vercel sirve frontend y API en el mismo origen (`vercel.json` rewrite), donde CORS ni siquiera aplica;
  bloquear el boot ahí sería sobre-corregir. Pero **sigue sin existir un origen de producción committeado**
  en ningún lado del repo — cualquier despliegue con frontend y API en dominios distintos (p. ej. Render)
  debe configurarlo manualmente antes de ir a producción.
- **SQLite efímero en Vercel**: la capa de persistencia funciona, pero `/tmp` en funciones serverless de
  Vercel no garantiza persistencia entre invocaciones/cold starts — el ownership de casos no es una
  garantía confiable en ese target de despliegue específico hasta apuntar `DATABASE_URL` a Postgres real.
  Documentado explícitamente en `api/index.py`, no solucionado (requiere aprovisionar infraestructura real).
- **Ollama nunca ejecutado contra un modelo real en esta sesión**: el test vive y está listo, pero no hay
  daemon de Ollama disponible en este entorno — nadie ha visto el output real de un modelo aquí todavía.

## Sigue abierto — no se tocó esta sesión

- **QA visual real (screenshots en 1440/1024/768/390/320)**: la herramienta de navegador headless no
  arrancó en este entorno. El sidebar y los cambios de shell están verificados por build/tipos/tests, no
  por inspección visual. Recomendado antes de cualquier presentación.
- **Historial de conversación de IA no está segmentado por rol dentro de un caso**: cliente y abogado ven
  los mismos turnos de chat entre sí (`recent_conversation` es case-scoped, no role-scoped). Señalado como
  severidad media por la revisión de seguridad — requiere agregar una columna de rol/autor antes de tener
  una segunda cuenta de abogado concurrente en un caso real.
- **Duplicación menor de navegación**: el dropdown de perfil en el header todavía tiene enlaces "Home"/
  "Help" que también están en el sidebar — cosmético, no funcional, dejado como pulido pendiente.
- **`.agents/skills/` (framework previo del repo)**: sigue en `.agents/skills/*/skill.md`, no descubierto
  por Claude Code (que espera `.claude/skills/*/SKILL.md`). No migrado esta sesión — considerar consolidar
  con los nuevos `.claude/skills/` para no mantener dos convenciones en paralelo.

## Estado de la rama

Todo el trabajo vive en `refactor/ui-and-architecture-phase1`, commits locales, **sin merge a `main` ni
push**. Pendiente de revisión del propietario antes de integrar.
