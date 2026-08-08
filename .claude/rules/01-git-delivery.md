# Git delivery

- Prohibido **autorizar** trabajo desde `main`: no se commitea, no se bumpea versión y no se
  edita ningún archivo estando en `main`.
- Integrar sí está permitido, y sólo en dos formas: `git pull --ff-only` para sincronizar, y
  `git merge --no-ff <working branch de la tarea activa>` para aterrizar una entrega registrada.
  `git push` de `main` acompaña a cualquiera de las dos. Un PR en GitHub es equivalente y
  preferible cuando hay revisión.
- Branches: `feat|fix|refactor|chore|docs|test/<scope>-<description>`.
- Una responsabilidad coherente por branch.
- Trabajo paralelo usa worktrees y un `integration/<initiative>` owner.
- Registra ownership antes de editar.
- Usa staging selectivo; nunca `git add .`, `-A` o `--all`.
- Prohibidos reset hard, clean destructivo y force push.
- Commit/push/PR/merge requieren autorización correspondiente.
