---
name: create-feature-flow
description: Design and implement a complete new user flow with a flow spec, permissions, contracts, states, i18n, tests and release evidence.
---
# Create feature flow

1. Create `docs/flows/<flow>.md` from the flow template before code.
2. Define role, goal, preconditions, happy/alternate/error paths, state matrix, permissions and audit events.
3. Map route, feature module, DTOs, services, contracts, reusable UI and state ownership.
4. For backend work: contract → generated metadata → DTO/service/router/tests → client → UI → E2E.
5. Cover loading, empty, validation, success, failure, unauthorized and offline states.
6. Finish with i18n parity, responsive/a11y evidence, demo-script update and change fragment.
