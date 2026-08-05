import type { SVGProps } from "react";

export type AppIconName =
  | "brand"
  | "intake"
  | "document"
  | "review"
  | "readiness"
  | "automation"
  | "shield"
  | "history"
  | "portfolio"
  | "arrow-right"
  | "check"
  | "user"
  | "clock"
  | "sparkles";

interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: AppIconName;
  size?: number;
}

function IconPaths({ name }: { name: AppIconName }) {
  switch (name) {
    case "brand":
      return (
        <>
          <path d="M7.5 3.75h6.75l4.5 4.5v12H7.5z" />
          <path d="M14.25 3.75v4.5h4.5" />
          <path d="m9.75 14.25 1.75 1.75 3.5-4" />
        </>
      );
    case "intake":
      return (
        <>
          <path d="M8.25 4.5h7.5" />
          <path d="M9 3h6v3H9z" />
          <path d="M6 5.25h12v15H6z" />
          <path d="M9 10.5h6M9 14.25h4.5" />
        </>
      );
    case "document":
      return (
        <>
          <path d="M6.75 3.75h7.5l3 3v13.5H6.75z" />
          <path d="M14.25 3.75v3h3" />
          <path d="M9.5 11h5M9.5 14.5h3.5" />
          <circle cx="16.75" cy="16.75" r="2.25" />
          <path d="m18.4 18.4 1.35 1.35" />
        </>
      );
    case "review":
      return (
        <>
          <path d="M5.25 12.75 9 16.5l9.75-10.25" />
          <path d="M19.5 12a7.5 7.5 0 1 1-3.1-6.08" />
        </>
      );
    case "readiness":
      return (
        <>
          <path d="M4.5 19.5h15" />
          <path d="M6.75 16.5v-4.25h3v4.25M11.25 16.5V8.75h3v7.75M15.75 16.5V5.5h3v11" />
        </>
      );
    case "automation":
      return (
        <>
          <path d="m12 3 .95 2.55 2.55.95-2.55.95L12 10l-.95-2.55L8.5 6.5l2.55-.95z" />
          <path d="m18 12 .65 1.85 1.85.65-1.85.65L18 17l-.65-1.85-1.85-.65 1.85-.65z" />
          <path d="M5.25 11.25h4.5v8.25h-4.5zM10.5 13.5h4.5v6h-4.5z" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3.5 19 6v5.25c0 4.4-2.7 7.45-7 9.25-4.3-1.8-7-4.85-7-9.25V6z" />
          <path d="m8.75 12 2 2 4.5-4.5" />
        </>
      );
    case "history":
      return (
        <>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
          <path d="M4.5 5.75V10h4.25" />
          <path d="M12 7.75V12l3 1.75" />
        </>
      );
    case "portfolio":
      return (
        <>
          <path d="M3.75 7.5h16.5v11.25H3.75z" />
          <path d="M8.25 7.5V5.25h7.5V7.5" />
          <path d="M3.75 11.25c4.6 2 11.9 2 16.5 0" />
          <path d="M10.5 12h3" />
        </>
      );
    case "arrow-right":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m14 7 5 5-5 5" />
        </>
      );
    case "check":
      return <path d="m5.5 12.5 4 4 9-9" />;
    case "user":
      return (
        <>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20c.65-4 2.8-6 6.5-6s5.85 2 6.5 6" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 7.5V12l3 2" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m9 3 .9 2.6L12.5 6.5 9.9 7.4 9 10 8.1 7.4 5.5 6.5l2.6-.9z" />
          <path d="m16.5 10 .7 2.05 2.05.7-2.05.7-.7 2.05-.7-2.05-2.05-.7 2.05-.7z" />
          <path d="m8 15 .55 1.45L10 17l-1.45.55L8 19l-.55-1.45L6 17l1.45-.55z" />
        </>
      );
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
