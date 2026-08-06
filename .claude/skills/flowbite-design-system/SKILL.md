---
name: flowbite-design-system
description: Create or modify FreshStart UI while preserving Flowbite wrappers, semantic tokens, icon registry, responsive behavior and accessibility.
---
# Flowbite design system

1. Inventory reusable components before creating markup.
2. Flowbite is imported by shared wrappers/components, not copied ad hoc into pages.
3. Use canonical CSS tokens and `AppIcon`; no arbitrary semantic colors or icon families.
4. Define component role and all states: default, hover, focus, disabled, loading, empty, success, warning and error.
5. Tables require equivalent mobile cards/actions.
6. Validate ES/EN, keyboard, focus, contrast and 320/390/768/1024/1440 widths.
7. Run `npm run agent:flowbite` and visual QA.
