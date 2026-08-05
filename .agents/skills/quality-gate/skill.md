---
name: quality-gate
description: Validate contracts, formatting, type safety, tests, build, and deployment readiness.
---

# Quality Gate Skill

Run in order:
1. `make contracts`
2. `make lint`
3. `make test`
4. `cd frontend && npm run build`
5. Review `.env.example` and deployment docs for missing variables.
6. Confirm all visible sample data is synthetic.
