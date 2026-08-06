import { Accordion, AccordionContent, AccordionPanel, AccordionTitle, Badge, Card } from "flowbite-react";
import { APP_VERSION } from "../config/version";

/**
 * Master instruction §13: technical/reviewer-facing detail lives here, not in
 * the client/attorney-facing footer. Linked from the footer and the header's
 * "Ayuda" entry for both roles.
 */
export function AboutPlatformPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="app-card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">Acerca de FreshStart</h1>
          <Badge color="indigo">v{APP_VERSION}</Badge>
          <Badge color="gray">Ambiente demo</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          FreshStart es una plataforma de preparación para consultas de bancarrota. Organiza información financiera,
          identifica faltantes y prepara preguntas para revisión profesional. No es un bufete, no ofrece asesoramiento
          legal, no selecciona un capítulo como conclusión jurídica, no determina elegibilidad y no presenta peticiones.
        </p>
      </Card>

      <Accordion>
        <AccordionPanel>
          <AccordionTitle id="privacy">Privacidad</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              Este es un entorno de demostración: todos los nombres, casos y cifras son ficticios. El estado del
              expediente se guarda localmente en tu navegador; el backend procesa cada solicitud sin almacenar el
              caso entre peticiones.
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="security">Seguridad</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              El acceso usa JWT con expiración corta y roles separados de cliente/abogado. Antes de usar datos reales,
              se deben reemplazar las credenciales de demo y el secreto de firma por valores de producción — ver
              <code className="mx-1 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">SECURITY.md</code>.
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="accessibility">Accesibilidad</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              La interfaz usa componentes Flowbite (con manejo de foco y navegación por teclado incorporados),
              etiquetas asociadas a cada campo y contraste conforme a WCAG AA en texto y controles.
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="terms">Términos</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              El uso de este demo no constituye una relación abogado-cliente. La información generada por el
              asistente siempre requiere revisión y confirmación de un abogado autorizado antes de tomar cualquier
              decisión.
            </p>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel>
          <AccordionTitle id="help">Ayuda</AccordionTitle>
          <AccordionContent>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              Usa el chat de "Guía inteligente" dentro de un expediente para preguntar qué falta, qué documento
              respalda una cifra, o para preparar preguntas antes de tu consulta. Cualquier duda sobre la plataforma
              en sí puede reportarse siguiendo el proceso descrito en
              <code className="mx-1 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5">SECURITY.md</code>.
            </p>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>
  );
}
