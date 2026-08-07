import { Outlet } from "react-router";
import { ChatPanelProvider } from "../../chat/ChatPanelContext";
import { AiLauncher } from "../ai/AiLauncher";
import { AiPanel } from "../ai/AiPanel";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";
import { BottomNavigation } from "./navigation/BottomNavigation";
import { Sidebar } from "./navigation/Sidebar";

/**
 * The authenticated layout, and the only place the responsive navigation
 * decision is made. Pages never ask how wide the viewport is; they render into
 * `<main>` and the shell adapts around them.
 *
 * Two shells, one set of components and one navigation configuration:
 *
 * - below 768px, `<BottomNavigation>` is the entire navigation (`md:hidden`),
 *   and `<Sidebar>` renders nothing;
 * - from 768px up — tablets included — `<Sidebar>` is a permanent column
 *   (`hidden md:flex`) and the bottom bar renders nothing.
 *
 * Each component owns its own breakpoint, so the switch happens in exactly one
 * place per surface and cannot disagree with itself.
 *
 * The sidebar is a flex sibling rather than a fixed overlay, so the content
 * column is offset by its real width automatically — no `md:ml-64` constant to
 * keep in sync with the sidebar's `w-64`, and no way for content to end up
 * underneath it. `min-w-0` on that column is what stops a wide child (a table,
 * a long unbroken string) from expanding the flex item past the viewport and
 * producing horizontal page scroll.
 *
 * The bottom padding reserves the floating bar's full height — pill (4.5rem)
 * plus its offset and the device's safe-area inset — so the last element of any
 * page, the footer included, is never trapped underneath it. It resets at `md`
 * where the bar is gone.
 */
export function AppShell() {
  return (
    <ChatPanelProvider>
      <div className="app-shell-background flex min-h-screen text-heading">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <ModernHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <Outlet />
          </main>
          <ModernFooter variant="compact" />
        </div>
        <BottomNavigation />

        {/* The assistant, mounted once for the whole authenticated app rather
            than per page. Both live here so every route gets the same entry
            point and the same panel instance — a page cannot opt out, and
            navigating between pages cannot restart the conversation. */}
        <AiLauncher />
        <AiPanel />
      </div>
    </ChatPanelProvider>
  );
}
