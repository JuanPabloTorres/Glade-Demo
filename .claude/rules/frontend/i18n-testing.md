---
paths:
  - "frontend/src/**/*.{ts,tsx,json}"
  - "frontend/e2e/**/*.ts"
---
# Frontend i18n and testing

No strings visibles hardcoded salvo datos sintéticos documentados. Actualiza ES/EN juntos y ejecuta `npm run i18n:check`. Añade unit tests para lógica/componentes y E2E para journeys. Cambios visuales requieren screenshots en 320/390/768/1024/1440, no-overflow, keyboard smoke y accesibilidad.
