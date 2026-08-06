---
paths:
  - "frontend/src/pages/**/*.tsx"
  - "frontend/src/components/**/*.tsx"
  - "frontend/src/workspace/**/*.tsx"
---
# Frontend feature architecture

Una página define propósito, header, acción principal y composición; la lógica reusable vive en hooks/services/components. Navegación de etapas tiene una sola fuente de verdad controlada; no mezcles ref imperativo y estado. No rederives reglas backend. API calls pasan por clients tipados. Todo flujo cubre estados y permisos.
