---
name: finish-change
description: Complete a change only after scope, ownership, contracts, tests, evidence, change fragment and version policy pass.
---
# Finish change

Run `npm run agent:verify`. Confirm no out-of-scope paths, generated drift, missing i18n, unresolved P0/P1, missing ADR/flow spec, missing change fragment, incorrect version ownership or absent UI evidence. Update manifest status and hand the integrated tree to `release-gate`. Do not self-approve.
