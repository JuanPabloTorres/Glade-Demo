# Backend instructions

Stack real: FastAPI, Pydantic v2, pwdlib/Argon2, JWT, pandas, proveedores de IA y servicios documentales.

- Carga `/api-contract-change` antes de cambiar endpoints.
- Routers validan HTTP y delegan; la orquestación vive en services.
- Usa DTOs Pydantic en límites API y errores centralizados.
- El backend actual es mayormente stateless: no finjas que existe SQLAlchemyUnitOfWork.
- Persistencia nueva requiere ADR, modelo, migración, autorización server-side y pruebas.
- Verifica rol, ownership y aislamiento de caso en servidor.
- Proveedores de IA reciben contexto reducido; cliente nunca recibe notas privadas.
- Toda salida de modelo pasa por validación estructurada, guardrails y fallback.
- Ejecuta ruff, mypy y pytest; añade pruebas de servicio y API.
