import type { SVGProps } from "react";

export type AppIconName =
  | "brand"
  | "client"
  | "attorney"
  | "wallet"
  | "receipt"
  | "debt"
  | "asset"
  | "evidence"
  | "timeline"
  | "calculator"
  | "check"
  | "alert"
  | "home"
  | "chat"
  | "arrow-right"
  | "shield"
  | "document";

interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: AppIconName;
  size?: number;
}

function IconPaths({ name }: { name: AppIconName }) {
  switch (name) {
    case "brand":
      return (
        <>
          <path d="M4 17.5c3.5-7 8-10.5 16-11" />
          <path d="M6 20c4.5-4.2 8.8-6.4 14-7" />
          <circle cx="7" cy="7" r="2.5" />
          <path d="M16.5 4.5 18 6l2.5-2.5" />
        </>
      );
    case "client":
      return <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></>;
    case "attorney":
      return <><path d="M5 20h14M8 20v-8h8v8M7 8h10l-1-4H8z" /><path d="M4 12h16M10 15h4" /></>;
    case "wallet":
      return <><path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9H5.5A1.5 1.5 0 0 1 4 16.5z" /><path d="M4 8V6.5A1.5 1.5 0 0 1 5.5 5H17" /><path d="M15 11h5v3h-5a1.5 1.5 0 0 1 0-3Z" /></>;
    case "receipt":
      return <><path d="M7 3h10v18l-2-1.4-2 1.4-2-1.4L9 21l-2-1.4z" /><path d="M9.5 8h5M9.5 12h5M9.5 16h3" /></>;
    case "debt":
      return <><circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5c-.7-.7-1.8-1-3-1-1.6 0-2.8.8-2.8 2 0 3 5.8 1.2 5.8 4.5 0 1.3-1.3 2.3-3.1 2.3-1.3 0-2.6-.4-3.4-1.2M12.5 5.5v13" /></>;
    case "asset":
      return <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.5V20h12V9.5M9 20v-6h6v6" /></>;
    case "evidence":
      return <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" /><circle cx="18" cy="17" r="2.5" /><path d="m20 19 1.5 1.5" /></>;
    case "timeline":
      return <><path d="M7 4v16" /><circle cx="7" cy="6" r="2" /><circle cx="7" cy="12" r="2" /><circle cx="7" cy="18" r="2" /><path d="M11 6h8M11 12h6M11 18h8" /></>;
    case "calculator":
      return <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8v3H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></>;
    case "check":
      return <path d="m5 12.5 4 4 10-10" />;
    case "alert":
      return <><path d="M12 4 21 20H3z" /><path d="M12 9v5M12 17h.01" /></>;
    case "home":
      return <><path d="m3.5 11 8.5-7 8.5 7" /><path d="M6 10v10h12V10M10 20v-6h4v6" /></>;
    case "chat":
      return <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>;
    case "arrow-right":
      return <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>;
    case "shield":
      return <><path d="M12 3.5 19 6v5.2c0 4.4-2.7 7.5-7 9.3-4.3-1.8-7-4.9-7-9.3V6z" /><path d="m8.8 12 2 2 4.5-4.5" /></>;
    case "document":
      return <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>;
  }
}

export function AppIcon({ name, size = 20, className = "", ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <IconPaths name={name} />
    </svg>
  );
}
