# Frontend instructions

Stack real: React 19, TypeScript, Vite, Tailwind 4, Flowbite React, i18next, React Router y Axios.

- Carga `/flowbite-design-system` para UI y `/create-feature-flow` para flujos nuevos.
- Las páginas coordinan features; no recrean botones, cards, modales, tablas o estados.
- Usa API clients bajo `src/api`; nunca llames `fetch`/Axios directamente desde páginas.
- Todo texto visible vive en `src/locales/es` y `src/locales/en` con paridad.
- Iconos solo mediante `AppIcon` y `iconRegistry`.
- Flowbite directo se limita a wrappers/componentes compartidos; excepciones requieren registro.
- Responsive se valida en 320, 390, 768, 1024 y 1440 px; `overflow-x-auto` no sustituye diseño mobile.
- Incluye loading, empty, success, warning, error, disabled, unauthorized y offline cuando aplique.
- Ejecuta i18n, lint, Vitest, build y Playwright según el alcance.
- No introduzcas TanStack Query, React Hook Form o Zod sin ADR y aprobación.
