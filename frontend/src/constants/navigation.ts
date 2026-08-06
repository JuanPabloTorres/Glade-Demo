import { Bot, ClipboardList, FolderKanban, FolderOpen, LayoutDashboard } from "lucide-react";

export const navigationItems = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/assistant", labelKey: "nav.assistant", icon: Bot },
  { to: "/intake", labelKey: "nav.intake", icon: ClipboardList },
  { to: "/workspace", labelKey: "nav.workspace", icon: FolderOpen },
  { to: "/cases", labelKey: "nav.cases", icon: FolderKanban },
] as const;
