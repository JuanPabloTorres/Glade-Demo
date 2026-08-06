# Flowbite governance patterns

Flowbite provides component behavior; shared FreshStart wrappers provide tokens, roles, states and accessibility. Page/feature code should compose existing UI, not directly rebuild controls. All icons use the registry, user-visible text uses i18n, tables have mobile cards and changes receive visual evidence. `scripts/agent/flowbite-check.mjs` enforces imports and common drift signals.
