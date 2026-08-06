# Flowbite governance patterns

Flowbite provides component behavior; shared FreshStart wrappers provide tokens, roles, states and accessibility. Page/feature code should compose existing UI, not directly rebuild controls. All icons use the registry, user-visible text uses i18n, tables have mobile cards and changes receive visual evidence.

`scripts/agent/flowbite-check.mjs` blocks new page-level Flowbite imports, direct icon imports, inline visual styles and overflow-only responsive implementations. Pre-governance exceptions are explicit in `docs/architecture/FLOWBITE-EXCEPTIONS.json`; they produce migration warnings and may not grow without an ADR or dedicated design-system task.
