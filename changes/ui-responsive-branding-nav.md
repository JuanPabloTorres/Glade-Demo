---
taskId: ui-responsive-branding-nav
type: minor
scope: frontend responsive, branding, navigation, help
---

# Summary

UI directive pass on `feat/ui-responsive-branding-nav`: correct the visible product name,
turn the language control into a direct toggle, repair the Documents / Tasks / Activities
navigation at its cause, and give Help a real structure. Builds on `feat/ux-shell-polish`
(`0fe361b`), which carries the Flowbite token layer, the app shell and the mobile bottom
navigation this work assumes.

Three commits:

- `0fe361b` — design-system foundation, app shell and mobile navigation (inherited base).
- `79520fb` — "Fresh Start" as the visible product name.
- `9fdc614` — browser title, sidebar brand, EN/ES toggle, section navigation, Help.

# Work delivered

- **Branding.** `index.html` still shipped `MatterReady | AI-ready case preparation` in the
  title and description. The name was written `FreshStart`, unspaced, in the header brand,
  the login hero, the footer copyright and across eight ES/EN locale files. Left untouched
  because they are technical identifiers rather than branding: the demo password
  `FreshStart!2026`, the `client@freshstart.demo` / `attorney@freshstart.demo` accounts, and
  the `matter-ready-web` package name.
- **Sidebar brand.** The sidebar carried no product mark at all — it opened straight on the
  collapse toggle. It now opens with "Fresh Start" linking home, collapsing to the glyph
  alone in the icon rail while keeping the full name as the accessible name.
- **Language toggle.** Was a Flowbite `Dropdown` holding exactly two items: two interactions
  and a focus trap to make a binary choice. Now one button that swaps the language and
  labels itself with the language it switches *to*. It is a real `<button>`, so Enter/Space
  work and it keeps its place in the tab order; `aria-label` names both sides of the swap.
- **Documents / Tasks / Activities.** See "Root cause" below.
- **Help.** New `/help` route with seven accordion sections (Primeros pasos, Gestión de
  documentos, Tareas, Actividad, Asistente de IA, Cuenta y preferencias, Preguntas
  frecuentes), built from the governed `AppAccordion` so open/closed state, chevron,
  keyboard handling and `aria-expanded`/`aria-controls` come from one place. Sections render
  from locale data, so adding a question is a locale change, not new JSX. "Ayuda" previously
  pointed at `/about`, which mixes "how do I use this product" with privacy and terms;
  `/about` keeps the legal and reviewer-facing detail.

# Root cause: section navigation

The three entries were not dead links — they navigated. The defect was that
`CaseWorkspacePage` read `?focus=` once, copied it into component state and then **deleted
it from the URL**. One cause, three symptoms:

- a direct refresh always reset to the first stage;
- browser Back/Forward never moved between sections;
- no navigation entry could mark itself active, because the destination it linked to no
  longer matched the address bar — `isActive()` explicitly returned `false` for any `to`
  containing a query, which was a workaround for this same deletion.

Fixed structurally rather than patched: the active stage is now derived from the URL on
every render and written back on navigation. `isNavItemActive()` in `config/navigation.ts`
is the single active-state rule shared by the desktop sidebar, the mobile bottom bar and the
drawer; it compares query parameters, so sibling entries pointing at one path stay mutually
exclusive. Focus values are the canonical `CaseStage` keys (`?focus=documents`), and the
backend's aliases (`evidence`, `timeline`, `overview`) still resolve, so links the assistant
already produced and any bookmarked URL keep working.

# User-visible behavior

- The browser tab, the sidebar and every screen say "Fresh Start".
- One click swaps ES/EN; no menu opens.
- Documents, Tasks and Activity open their section, highlight themselves in the menu, survive
  a refresh, and respond to Back/Forward. A section URL can be shared.
- Help is a browsable set of collapsed sections instead of a link to the legal page.

# Migration / compatibility

No API or contract changes. `ROUTES.help` is new; `?focus=` keeps accepting the legacy
alias vocabulary, so no existing link breaks.

# Tests and evidence

Automated: `npm run lint` 0 errors (9 pre-existing warnings), `npm run i18n:check` passes
across 14 module files, `npx tsc -b` clean for this task's files, `npm test -- --run` 37/37.

Browser validation against the running app (Playwright, signed in against the real backend)
— 44 assertions, 0 failures, 0 console errors or warnings:

- Tab title `Fresh Start | Preparación de bancarrota`; no "Matter Ready" and no unspaced
  "FreshStart" on login or in the workspace; sidebar brand reads "Fresh Start".
- Language: toggles in one click, opens no menu, reverses via keyboard Enter.
- Documents -> `?focus=documents`, Tasks -> `?focus=review`, Activity -> `?focus=tracking`;
  each marks `aria-current` and survives a refresh; Back and Forward both restore the
  expected section.
- Help: accordion `aria-expanded` false->true, `aria-controls` resolves to a real element,
  toggles with the keyboard.
- No horizontal overflow on `/` or `/help` at 320, 375, 390, 430, 768, 1024, 1280, 1440.
- Navigation exclusivity: 375 bottom bar without sidebar; 768 and 1280 sidebar without
  bottom bar. Content clears the bottom bar at full scroll.

# Risks / limitations

- **`npm run build` does not pass in this working tree, for reasons outside this task.** The
  tree is shared with the in-flight `strands-agent-layer` work, which is mid-migration:
  `AssistantAction` gained required fields and `ChatPanel.tsx` references an
  `AssistantCardView` it does not yet import. Those files were deliberately excluded from
  this task's commits (`git commit -- <paths>`), so this branch's own sources typecheck; a
  full green build has to wait until that migration lands. Validation above was therefore
  run through the Vite dev server, which does not typecheck.
- **Two agents were writing to this working tree at the same time.** Files appeared between
  a clean `tsc` and the next build. Commits here are path-limited on purpose, and the staged
  deletion of `backend/app/ai/providers/ollama_provider.py` was left untouched in the index.
- Not audited, and not claimed: the component-by-component responsive pass over forms,
  cards, tables, modals and toolbars, and the global visual-consistency review (directive
  §13-§16).
- The governance tooling does not support the parallel-worktree workflow its own rules
  prescribe: `active-task.json` is a single repo-wide file, `validate-edit.mjs` resolves
  paths against the primary worktree, and `worktree.mjs` only branches from `main`. A
  worktree was created for this task and then abandoned for that reason.
