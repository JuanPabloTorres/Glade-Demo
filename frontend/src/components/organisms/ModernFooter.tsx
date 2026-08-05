import { Badge, Footer, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";
import { APP_VERSION } from "../../config/version";
import { AppIcon } from "../atoms/AppIcon";

export function ModernFooter() {
  return (
    <Footer container className="rounded-none border-t border-[var(--color-border)] bg-white/92 shadow-none backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-0 py-7 sm:py-8">
        <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md shadow-indigo-950/15">
                <AppIcon name="brand" size={24} />
              </span>
              <div>
                <p className="font-semibold tracking-[-0.015em] text-[var(--color-text)]">FreshStart Bankruptcy Guide</p>
                <p className="text-sm text-[var(--color-text-muted)]">Preparación financiera y colaboración con el abogado.</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
              FreshStart no es un bufete y no ofrece asesoramiento legal. Organiza información y preguntas para una
              consulta profesional; no presenta casos, no ejecuta el means test oficial y no ofrece asesoramiento legal
              automático.
            </p>
          </div>
          <FooterLinkGroup className="flex-wrap gap-x-6 gap-y-3 lg:justify-end">
            <FooterLink href="/">Portal</FooterLink>
            <FooterLink href="/about">Acerca de la plataforma</FooterLink>
            <FooterLink href="/about#privacy">Privacidad</FooterLink>
            <FooterLink href="/about#security">Seguridad</FooterLink>
            <FooterLink href="/about#accessibility">Accesibilidad</FooterLink>
            <FooterLink href="/about#terms">Términos</FooterLink>
            <FooterLink href="/about#help">Ayuda</FooterLink>
          </FooterLinkGroup>
        </div>
        <FooterDivider />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright href="/" by="FreshStart" year={new Date().getFullYear()} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--color-text-muted)]">
            <Badge color="indigo">v{APP_VERSION}</Badge>
            <Badge color="gray">Ambiente demo</Badge>
            <Badge color="success">Servicio operativo</Badge>
            <span className="flex items-center gap-1.5"><AppIcon name="shield" size={15} /> Revisión humana obligatoria</span>
          </div>
        </div>
      </div>
    </Footer>
  );
}
