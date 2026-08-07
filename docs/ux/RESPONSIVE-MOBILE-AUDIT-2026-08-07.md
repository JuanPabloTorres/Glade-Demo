# Auditoría responsive mobile — 2026-08-07

Task: `ui-mobile-responsive` · Branch: `fix/ui-mobile-responsive-audit` · Base: `9fdc614`

## Alcance

Auditoría global del comportamiento responsive de la aplicación autenticada, no de una
página concreta. El encargo describía contenido cortado por la derecha, textos incompletos,
componentes fuera del viewport, steppers y cards demasiado anchos, formularios que no se
reorganizan, modales que exceden la pantalla y posible overflow horizontal, con la sospecha
de que el sidebar reservaba espacio estando oculto.

## Método

La auditoría se hizo con medición, no por inspección visual. `frontend/e2e/responsive-overflow.spec.ts`
recorre la app en 320, 360, 375, 390, 412, 430, 768, 1024 y 1440 px y, en cada paso, calcula
**el borde derecho más lejano alcanzado por cualquier elemento maquetado** y lo compara con el
viewport, listando los nodos culpables cuando no encaja.

Deliberadamente **no** mide `scrollWidth`. `index.css` recorta el desbordamiento horizontal a
nivel de documento (`html`/`body { overflow-x: hidden }`), lo que garantiza que `scrollWidth`
nunca delate el problema: la aserción mobile que ya existía —`bodyBox.width <= 390` en
`matter-workflow.spec.ts`— pasaba **por construcción**, midiese lo que midiese la maqueta.
Ese recorte era la razón por la que el defecto llevaba tiempo sin aparecer en ninguna prueba.

Quedan fuera de la medición, por diseño:

- subárboles dentro de un ancestro `overflow-x: auto|scroll|hidden|clip` (una tira scrollable
  puede ser más ancha que la pantalla: eso *es* el diseño);
- overlays off-canvas, es decir un subárbol `position: fixed` desplazado por transform — el
  Drawer cerrado aparcado en `translate-x-full`. Abierto, no lleva transform y se mide como
  cualquier otra cosa.

Cobertura por recorrido: login, home de cliente, workspace de caso con **las siete etapas**,
modal de entrada, drawer del asistente, bandeja del abogado, workspace del abogado con tres
de sus modales, y las páginas `/about` y `/help`.

## Hallazgo principal

Una sola causa raíz estructural explicaba prácticamente todos los síntomas descritos.

En `AppShell`, la columna de contenido era un flex item sin `min-w-0`:

```tsx
<div className="app-shell-background flex min-h-screen text-heading">
  <Sidebar />
  <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0">
```

Un flex item tiene `min-width: auto` por defecto, que resuelve a su mínimo basado en
contenido. La columna, por tanto, **se negaba a encogerse por debajo de lo más ancho que
cualquier página metiera dentro**, y toda la aplicación se maquetaba a ese ancho con
independencia del viewport.

Medido antes de la corrección, en un viewport de 390 px:

| Pantalla | Ancho real de la columna de contenido |
| --- | --- |
| Workspace de caso | 875 px |
| Bandeja del abogado | 1280 px |

De ahí venían el contenido cortado por la derecha, los textos incompletos, las cards
aparentemente demasiado anchas, el contenido "descentrado" y el overflow horizontal. No eran
defectos independientes de cada página: eran la misma columna sobredimensionada vista desde
sitios distintos. El recorte a nivel de documento ocultaba la barra de scroll, no el problema.

## Corrección

```tsx
<div className="app-shell-background flex min-h-screen w-full text-heading">
  <Sidebar />
  <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col pb-20 md:pb-0">
```

Se corrige en el shell, que es la capa que posee el dimensionamiento, no en las páginas donde
se notaba el síntoma. Ninguna página necesitó cambios.

## Sospechas del encargo que la medición descartó

Conviene dejarlas por escrito para que no se vuelvan a "arreglar":

- **El sidebar no reservaba espacio estando oculto.** Es `hidden md:block`; por debajo de
  `md` su caja mide 0 px. Verificado explícitamente.
- **Los formularios ya se reorganizaban.** `BankruptcyEntryModal` es de una columna por
  defecto y sólo pasa a 2/3 columnas a partir de `sm`.
- **Los modales ya encajaban**, incluidos los footers más densos del producto (los tres de
  `CaseActionBar`, con dos botones etiquetados y con icono en una fila) a 320 px.
- **El stepper ya estaba contenido**: `CaseStageStepper` usa una tira `overflow-x-auto`.
- **Los tap targets ya cumplían**: la barra inferior usa `min-h-14` (56 px), por encima del
  mínimo de 44 px de WCAG 2.5.5.

Todo esto pasó a ser aserción automatizada en lugar de suposición.

## Cambios de soporte

- **`frontend/e2e/responsive-overflow.spec.ts`** (nuevo): el gate de regresión descrito
  arriba, 39 casos. Incluye una aserción de que el barrido de etapas midió las siete: sin
  ella, renombrar una etiqueta convertiría en silencio la parte más ancha de la auditoría en
  un no-op.
- **`frontend/playwright.config.ts`**: puertos configurables por `E2E_WEB_PORT` /
  `E2E_API_PORT`. Con `reuseExistingServer` activo en local, un segundo worktree reutilizaba
  los servidores del primero y **medía el código equivocado** — la corrida salía verde contra
  una build que no era la que estaba bajo prueba. Los valores por defecto no cambian.

## Deuda registrada, no abordada

El recorte `overflow-x: hidden` a nivel de documento en `index.css` se mantiene: contiene los
overlays off-canvas, que es un trabajo legítimo. Ahora bien, `overflow-x: hidden` en la raíz
es un riesgo conocido para `position: sticky` (lo usa `ModernHeader`) y `overflow-x: clip`
sería más seguro por no crear contenedor de scroll. No se ha tocado porque no hay evidencia
de un defecto concreto y el cambio no es gratis; queda anotado. El gate de regresión ya no
depende de ese recorte para dar un veredicto honesto.

## Verificación

```
npx playwright test responsive-overflow    # 39 passed
```

Evidencia de la corrida en `frontend/test-results/` (vacío al pasar; trazas y capturas
automáticas en caso de fallo).
