---
paths:
  - "frontend/src/**/*.{ts,tsx,css}"
---
# Flowbite and design system

Flowbite aporta comportamiento; FreshStart aporta lenguaje visual. Features/pages reutilizan wrappers compartidos. Iconos solo por registry. Usa tokens semánticos, no colores arbitrarios. Controles críticos conservan label; icon-only exige tooltip y aria-label. Tablas tienen representación mobile equivalente. Evita estilos inline, componentes duplicados y overflow como única estrategia responsive. Ejecuta `npm run agent:flowbite` para cambios UI.
