# Parallel agents

Varios agentes trabajan a la vez sobre este repositorio. Cada uno vive en su propio checkout y ninguno puede ver el trabajo sin commitear de los demás, así que la coordinación es explícita o no existe.

- Un checkout, una tarea, un manifiesto. Nunca dos agentes en el mismo directorio de trabajo: comparten `active/<checkout>.json` y el segundo en registrarse desactiva al primero.
- Antes de editar, ejecuta `npm run agent:fleet`. Muestra cada checkout, su tarea, sus paths reclamados y los conflictos reales.
- Cada path tiene exactamente un dueño. `ownedPaths` no puede solaparse con el de otra tarea activa; `npm run agent:start -- start` lo rechaza. Reclama `changes/<task-id>.md`, no `changes/**`; reclama el componente, no `frontend/src/**`.
- Un archivo ya modificado en otro checkout está bloqueado aquí. El hook lo deniega: editarlo bifurca el mismo archivo en dos ramas y la integración conserva una sola versión.
- El estado compartido de `.git/claude-state` se escribe de forma atómica y bajo lock. No lo edites a mano ni con redirecciones de shell.
- Nada se borra. `task complete`, `task clear` y `worktree remove` archivan o se niegan a actuar; `git worktree remove --force`, `git clean -f`, `git checkout .`, `git stash drop` y `git branch -D` están bloqueados porque destruyen trabajo de un checkout hermano que no ves.
- Ejecuta `npm run agent:snapshot` antes de cualquier integración, rebase o limpieza. Copia todo lo no commiteado de todos los checkouts sin tocar índices ni ramas.
- `VERSION`, `RELEASE_NOTES.md` y los manifests de paquete siguen siendo exclusivos de integration-manager.
