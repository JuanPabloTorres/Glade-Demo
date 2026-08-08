import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useChatPanel } from "../chat/ChatPanelContext";
import { ASSISTANT_PROMPT_PARAM, ROUTES } from "../config/routes";

/**
 * `/assistant`, kept as a redirect.
 *
 * The assistant was a full page here for one release. It gave the conversation
 * a URL, but it also meant that asking "which documents am I missing?" from the
 * documents section took the user off the documents section — and it left the
 * product with two entry points, this page and the floating launcher, which
 * looked like one capability and behaved like two.
 *
 * The panel is the assistant now. This route survives so that bookmarks, the
 * suggestion links that carried `?prompt=`, and anything else pointing at
 * `/assistant` still land somewhere sensible: the panel opens with the prompt
 * already in the composer, over the home screen.
 *
 * `replace` so browser back returns to wherever the user came from rather than
 * bouncing through this redirect.
 */
export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const { openPanel } = useChatPanel();
  const prefill = searchParams.get(ASSISTANT_PROMPT_PARAM) ?? "";

  // In an effect, not during render: `openPanel` sets state on the provider
  // above this component, and doing that while rendering a child is the
  // "cannot update a component while rendering a different component" warning.
  useEffect(() => {
    openPanel(prefill || undefined);
  }, [openPanel, prefill]);

  return <Navigate to={ROUTES.home} replace />;
}
