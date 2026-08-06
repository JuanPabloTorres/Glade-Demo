# Task and ownership

Todo cambio requiere task manifest activo con scope, branch, ownedPaths, sharedPaths, criterios, pruebas y estrategia de versión. Los estados compartidos se guardan en `$(git rev-parse --git-common-dir)/claude-state`. Un agente no edita paths owned por otro. `VERSION`, lockfiles, contratos, CI y release notes son shared paths controlados por integration-manager.
