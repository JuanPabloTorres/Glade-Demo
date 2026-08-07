import {
  HiArrowLeftOnRectangle,
  HiArrowRight,
  HiBars3,
  HiChevronDown,
  HiChevronDoubleLeft,
  HiBuildingLibrary,
  HiCalculator,
  HiChartBar,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiClipboardDocumentCheck,
  HiClipboardDocumentList,
  HiCreditCard,
  HiClock,
  HiDocument,
  HiDocumentText,
  HiEye,
  HiEyeSlash,
  HiExclamationTriangle,
  HiFolderOpen,
  HiHandRaised,
  HiHome,
  HiInboxStack,
  HiInformationCircle,
  HiLanguage,
  HiLockClosed,
  HiMagnifyingGlass,
  HiQuestionMarkCircle,
  HiReceiptPercent,
  HiScale,
  HiShieldCheck,
  HiSparkles,
  HiUser,
  HiWallet,
} from "react-icons/hi2";
import type { IconType } from "react-icons";

/**
 * Single source of truth mapping every icon name used in the app to a
 * react-icons/hi2 component. Backend action payloads (AssistantAction.icon)
 * must reference a key from this registry — never a raw icon component or
 * inline SVG path defined elsewhere.
 */
export const iconRegistry = {
  brand: HiSparkles,
  client: HiUser,
  attorney: HiScale,
  wallet: HiWallet,
  receipt: HiReceiptPercent,
  debt: HiCreditCard,
  asset: HiBuildingLibrary,
  evidence: HiDocumentText,
  timeline: HiClock,
  calculator: HiCalculator,
  check: HiCheckCircle,
  alert: HiExclamationTriangle,
  home: HiHome,
  chat: HiChatBubbleLeftRight,
  "arrow-right": HiArrowRight,
  shield: HiShieldCheck,
  document: HiDocument,
  search: HiMagnifyingGlass,
  help: HiQuestionMarkCircle,
  // Header/footer navigation tabs (referential, not generic bullets):
  folder: HiFolderOpen, // case workspace / "Expediente"
  queue: HiInboxStack, // attorney case inbox / "Bandeja"
  info: HiInformationCircle, // "Acerca de"
  lock: HiLockClosed, // "Privacidad"
  accessibility: HiHandRaised, // "Accesibilidad"
  terms: HiClipboardDocumentCheck, // "Términos"
  // Sidebar navigation (frontend-shell-engineer, phase 1):
  tasks: HiClipboardDocumentList, // "Tareas" / task checklist
  activity: HiChartBar, // "Actividad" / recent activity feed
  urgent: HiExclamationTriangle, // "Urgentes" — same glyph as "alert", named for context
  menu: HiBars3, // mobile sidebar drawer trigger
  // Previously-bypassed inline react-icons imports, now routed centrally:
  "eye-show": HiEye, // LoginPage password visibility toggle
  "eye-hide": HiEyeSlash, // LoginPage password visibility toggle
  language: HiLanguage, // language toggle trigger
  // The AI assistant is the product's primary action, so it gets its own name
  // rather than borrowing `brand` (same glyph, different meaning — a rename of
  // one must not silently move the other) or `chat` (which refers to the
  // conversation surface, not the assistant as a destination).
  assistant: HiSparkles,
  // Shell polish (ux-shell-polish-2026-08-06): the avatar dropdown and the
  // collapsible sidebar needed glyphs the registry didn't carry yet.
  logout: HiArrowLeftOnRectangle, // avatar dropdown "Cerrar sesión"
  "chevron-down": HiChevronDown, // accordion disclosure indicator (rotates when open)
  "collapse-left": HiChevronDoubleLeft, // desktop sidebar collapse toggle (flips when collapsed)
} as const satisfies Record<string, IconType>;

export type IconRegistryName = keyof typeof iconRegistry;

/** Type guard used when an icon name arrives from an untyped source (e.g. the backend). */
export function isKnownIcon(name: string): name is IconRegistryName {
  return Object.prototype.hasOwnProperty.call(iconRegistry, name);
}
