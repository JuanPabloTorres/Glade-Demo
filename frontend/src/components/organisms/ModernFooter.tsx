import { Badge, Footer, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";
import { APP_VERSION } from "../../config/version";
import { AppIcon } from "../atoms/AppIcon";

export function ModernFooter() {
  return (
    <Footer container className="rounded-none border-t border-[var(--glade-border)] bg-white shadow-none">
      <div className="mx-auto w-full max-w-screen-2xl px-0 py-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="glade-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white"><AppIcon name="brand" size={24} /></span>
              <div><p className="font-semibold text-[#111111]">FreshStart Bankruptcy Guide</p><p className="text-sm text-[#5f5f5f]">Preparación financiera y colaboración con el abogado.</p></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5f5f5f]">
              Organiza información y preguntas para una consulta. No presenta casos, no ejecuta el means test oficial y no ofrece asesoramiento legal.
            </p>
          </div>
          <FooterLinkGroup className="flex-wrap gap-x-6 gap-y-3 lg:justify-end">
            <FooterLink href="/">Portal</FooterLink>
            <FooterLink href="https://github.com/JuanPabloTorres/Glade-Demo">Código fuente</FooterLink>
          </FooterLinkGroup>
        </div>
        <FooterDivider />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright href="/" by="FreshStart" year={new Date().getFullYear()} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#5f5f5f]">
            <Badge color="gray">v{APP_VERSION}</Badge>
            <span className="flex items-center gap-1.5"><AppIcon name="shield" size={15} /> Revisión humana obligatoria</span>
          </div>
        </div>
      </div>
    </Footer>
  );
}
