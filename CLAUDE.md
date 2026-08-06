@AGENTS.md

# Claude Code — FreshStart / Glade Demo

## Inicio obligatorio
1. Ejecuta `npm run agent:context`.
2. Para cualquier cambio ejecuta `/start-change` antes de editar.
3. Nunca edites, hagas commit o bump de versión directamente en `main`.
4. Lee el task manifest activo y respeta `ownedPaths`.

## Fuentes de verdad
- `contracts/api-contracts.json`: método, ruta y operation id.
- `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`: alcance del producto.
- `docs/architecture/`: arquitectura y decisiones.
- `docs/flows/`: especificaciones de flujos.
- `frontend/src/config/iconRegistry.ts`: iconografía.
- `frontend/src/index.css` y wrappers compartidos: tokens y lenguaje visual.

## Entrega
- Un cambio coherente por branch.
- Varias líneas independientes requieren worktrees registrados.
- Los worktrees crean change fragments; solo integración modifica `VERSION`.
- Toda entrega integrada incrementa SemVer y actualiza `RELEASE_NOTES.md`.
- No declares `done` sin `npm run agent:verify` y evidencia requerida.

## Límites
- No inventes dependencias, repositorios, UoW o patrones no implementados.
- No dupliques reglas de negocio en frontend.
- No expongas datos reales ni asesoramiento legal automático.
- Ollama solo puede operar con contexto autorizado, guardrails y fallback.
