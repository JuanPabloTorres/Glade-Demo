---
name: frontend-flowbite
description: Build reusable React and Flowbite interfaces with centralized API calls and typed DTOs.
---

# Frontend Flowbite Skill

- Never call `fetch` or Axios directly from pages/components.
- Add methods in `src/api/matterApi.ts` using `endpointRegistry`.
- Use TanStack Query hooks for server state.
- Reuse atoms, molecules, and organisms before creating page-specific markup.
- Keep forms typed with React Hook Form and Zod.
- Display controller/action metadata in development-only request tracing where useful.
