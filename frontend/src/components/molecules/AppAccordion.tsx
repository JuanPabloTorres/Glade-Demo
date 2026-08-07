import {
  Accordion,
  AccordionContent,
  AccordionPanel,
  AccordionTitle,
  useAccordionContext,
} from "flowbite-react";
import type { ReactNode } from "react";

export interface AppAccordionItem {
  /** Stable identity for the panel — never the array index. */
  key: string;
  title: string;
  content: ReactNode;
  /**
   * DOM id placed on the panel's title button, so a fragment link can target
   * it (e.g. the footer's `/about#privacy`). Omit when nothing deep-links in.
   */
  id?: string;
}

interface AppAccordionProps {
  items: AppAccordionItem[];
  /** Allow several panels open at once. Defaults to one-at-a-time. */
  alwaysOpen?: boolean;
  /** Start with every panel closed. Defaults to closed (disclosure, not a reveal). */
  collapseAll?: boolean;
  className?: string;
}

/**
 * Title button that reports its own open state.
 *
 * `flowbite-react@0.12.9`'s AccordionTitle renders neither `aria-expanded` nor
 * `aria-controls` (verified: the only ARIA attribute in its compiled output is
 * `aria-hidden`, on the arrow) — so a screen reader gets a plain button with no
 * indication that it toggles a region, or which one. Flowbite's own published
 * accordion block *does* carry both attributes, so this restores them rather
 * than inventing anything: the panel context exposes `isOpen`, which is exactly
 * the state the attribute needs.
 */
function AccordionTitleWithState({
  id,
  controls,
  className,
  children,
}: {
  id?: string;
  controls: string;
  className: string;
  children: ReactNode;
}) {
  const { isOpen } = useAccordionContext();

  return (
    <AccordionTitle id={id} aria-expanded={Boolean(isOpen)} aria-controls={controls} className={className}>
      {children}
    </AccordionTitle>
  );
}

/**
 * Governed accordion wrapper — the single place this app renders a disclosure
 * list, so pages compose it instead of hand-rolling open/closed state.
 *
 * Behavior comes from `flowbite-react`'s Accordion (open/close state, arrow
 * rotation, keyboard handling). The visual language comes from Flowbite's
 * published accordion block, expressed through the semantic token layer in
 * index.css (`border-default`, `rounded-base`, `text-body`,
 * `hover:bg-neutral-secondary-medium`, `hover:text-heading`).
 *
 * Note for anyone pasting more blocks from flowbite.com: the published HTML
 * drives itself with `data-accordion="collapse"`, which is *vanilla* Flowbite
 * JS. This app never loads that script, so copied markup renders as a dead,
 * permanently-collapsed list. The React component is the working equivalent —
 * take the classes from the block, not its data attributes.
 */
export function AppAccordion({ items, alwaysOpen = false, collapseAll = true, className = "" }: AppAccordionProps) {
  return (
    <Accordion
      alwaysOpen={alwaysOpen}
      collapseAll={collapseAll}
      className={`overflow-hidden rounded-base border border-default shadow-xs ${className}`}
    >
      {items.map((item) => {
        const contentId = `${item.id ?? item.key}-panel`;
        return (
          <AccordionPanel key={item.key}>
            <AccordionTitleWithState
              id={item.id}
              controls={contentId}
              className="p-5 text-body hover:bg-neutral-secondary-medium hover:text-heading focus:ring-brand-soft"
            >
              {item.title}
            </AccordionTitleWithState>
            <AccordionContent id={contentId} className="p-4 text-body md:p-5">
              {item.content}
            </AccordionContent>
          </AccordionPanel>
        );
      })}
    </Accordion>
  );
}
