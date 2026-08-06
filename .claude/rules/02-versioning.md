# Versioning

Cada entrega integrada incrementa SemVer. PATCH: fix/refactor/docs compatible. MINOR: nueva capacidad o flujo compatible. MAJOR: contrato o modelo incompatible. En un branch individual, el owner hace bump al final. En iniciativas paralelas, los worktrees solo crean `changes/<task-id>.md`; integration-manager consolida y es el único que modifica `VERSION`, package manifests y release notes.
