import {
  HiArrowRight,
  HiBuildingLibrary,
  HiCalculator,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiCreditCard,
  HiClock,
  HiDocument,
  HiDocumentText,
  HiExclamationTriangle,
  HiHome,
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
} as const satisfies Record<string, IconType>;

export type IconRegistryName = keyof typeof iconRegistry;

/** Type guard used when an icon name arrives from an untyped source (e.g. the backend). */
export function isKnownIcon(name: string): name is IconRegistryName {
  return Object.prototype.hasOwnProperty.call(iconRegistry, name);
}
