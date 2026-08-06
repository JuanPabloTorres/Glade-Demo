import type { SVGProps } from "react";
import { iconRegistry } from "../../config/iconRegistry";

export type AppIconName = keyof typeof iconRegistry;

interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: AppIconName;
  size?: number;
}

/**
 * Thin wrapper around the central icon registry (`config/iconRegistry.ts`).
 * Keeps the `name`/`size`/`className` prop surface every call site already
 * uses, so this refactor is a drop-in replacement for the previous
 * inline-SVG implementation.
 */
export function AppIcon({ name, size = 20, className = "", ...props }: AppIconProps) {
  const Icon = iconRegistry[name];
  return <Icon aria-hidden="true" size={size} className={className} {...props} />;
}
