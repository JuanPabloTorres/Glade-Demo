interface PageTitleProps {
  title: string;
  subtitle?: string;
}

/**
 * Top-level page heading. Sits above SectionTitle/CardTitle in Typography.tsx,
 * which is where every other text role lives.
 *
 * Previously styled with raw `text-gray-900` / `dark:text-white` palette
 * classes: the palette colors bypassed the design tokens, and the `dark:`
 * pair had been inert since index.css repointed that variant at an explicit
 * `.dark` ancestor this app never applies. Both are now `text-heading` /
 * `text-body`.
 */
export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-heading">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-body">{subtitle}</p> : null}
    </div>
  );
}
