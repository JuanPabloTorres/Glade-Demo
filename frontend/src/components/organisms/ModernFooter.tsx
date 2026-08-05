import {
  Badge,
  Footer,
  FooterCopyright,
  FooterDivider,
  FooterLink,
  FooterLinkGroup,
} from "flowbite-react";
import { APP_VERSION } from "../../config/version";

export function ModernFooter() {
  return (
    <Footer container className="rounded-none border-t border-gray-200 bg-white shadow-none">
      <div className="mx-auto w-full max-w-screen-2xl px-0 py-2">
        <div className="grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-start">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm">
                MR
              </span>
              <div>
                <p className="text-base font-semibold text-gray-900">MatterReady</p>
                <p className="text-sm text-gray-500">
                  Review-first document intelligence for professional case preparation.
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-500">
              Built to demonstrate structured intake, explainable automation, recorded
              human decisions, and deterministic readiness across a modern React and
              FastAPI architecture.
            </p>
          </div>

          <div className="md:justify-self-end">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Product navigation
            </p>
            <FooterLinkGroup className="flex-wrap gap-x-5 gap-y-2 md:justify-end">
              <FooterLink href="/#workflow">Workflow</FooterLink>
              <FooterLink href="/#portfolio">Portfolio</FooterLink>
              <FooterLink href="/#ai-capabilities">AI controls</FooterLink>
              <FooterLink href="https://github.com/JuanPabloTorres/Glade-Demo">
                Source repository
              </FooterLink>
            </FooterLinkGroup>
          </div>
        </div>

        <FooterDivider />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright
            href="/"
            by="MatterReady"
            year={new Date().getFullYear()}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Badge color="gray">v{APP_VERSION}</Badge>
            <span>React · TypeScript · Flowbite · FastAPI</span>
            <span className="hidden text-gray-300 sm:inline">•</span>
            <span>Automated validation and browser-tested workflows</span>
          </div>
        </div>
      </div>
    </Footer>
  );
}
