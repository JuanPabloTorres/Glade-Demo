import { Bot, ClipboardList, FolderKanban } from "lucide-react";

export const navigationItems = [
  { to: "/assistant", labelKey: "nav.assistant", icon: Bot },
  { to: "/intake", labelKey: "nav.intake", icon: ClipboardList },
  { to: "/cases", labelKey: "nav.cases", icon: FolderKanban },
] as const;
