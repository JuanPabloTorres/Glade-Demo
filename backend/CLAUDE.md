# Backend instructions

Stack real: FastAPI, Pydantic v2, pwdlib/Argon2, JWT, pandas, proveedores de IA y servicios documentales.

- Carga `/api-contract-change` antes de cambiar endpoints.
- Routers validan HTTP y delegan; la orquestación vive en services.
- Usa DTOs Pydantic en límites API y errores centralizados.
- Persistencia real ya existe: SQLAlchemy + Alembic, repositorios en `app/repositories/*` detrás de protocolos (`protocols.py`) — nunca llames SQLAlchemy directo desde un router o service. Ver `docs/audits/GLADE-DEMO-PHASE1-RESOLUTION-2026-08-06.md`.
- Cambios de esquema requieren migración Alembic (`alembic revision --autogenerate`) y pruebas de repositorio.
- Verifica rol, ownership (`CaseAccessService`, nunca confíes en un `owner_user_id` enviado por el cliente) y aislamiento de caso en servidor.
- Proveedores de IA reciben contexto reducido; cliente nunca recibe notas privadas.
- Toda salida de modelo pasa por validación estructurada, guardrails y fallback.
- Ejecuta ruff, mypy y pytest; añade pruebas de servicio y API.
