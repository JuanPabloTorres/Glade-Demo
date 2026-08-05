import {
  Badge,
  Footer,
  FooterCopyright,
  FooterDivider,
  FooterLink,
  FooterLinkGroup,
} from "flowbite-react";
import { APP_VERSION } from "../../config/version";
import { AppIcon } from "../atoms/AppIcon";

export function ModernFooter() {
  return (
    <Footer container className="rounded-none border-t border-slate-200 bg-white shadow-none">
      <div className="mx-auto w-full max-w-screen-2xl px-0 py-5">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <AppIcon name="sparkles" size={24} />
              </span>
              <div>
                <p className="text-base font-semibold tracking-tight text-slate-950">MatterReady AI Intake Copilot</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Conversation, evidence analysis, human decisions, and a reviewable handoff.
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
              A bilingual-ready portfolio architecture using FastAPI, pandas, optional PyTorch and
              Transformers models, typed contracts, JWT authentication, Flowbite React, and
              browser-tested delivery. It does not provide legal advice.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <FooterLinkGroup className="flex-wrap gap-x-6 gap-y-3 lg:justify-end">
              <FooterLink href="/#copilot">Copilot</FooterLink>
              <FooterLink href="/#case-packet">Case packet</FooterLink>
              <FooterLink href="https://github.com/JuanPabloTorres/Glade-Demo">Source code</FooterLink>
            </FooterLinkGroup>
          </div>
        </div>
        <FooterDivider />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterCopyright href="/" by="MatterReady" year={new Date().getFullYear()} />
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <Badge color="gray">v{APP_VERSION}</Badge>
            <span className="flex items-center gap-1.5">
              <AppIcon name="shield" size={15} className="text-emerald-700" />
              Human-approved evidence
            </span>
          </div>
        </div>
      </div>
    </Footer>
  );
}
