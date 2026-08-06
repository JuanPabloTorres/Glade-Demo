import { Button, type ButtonProps, Spinner } from "flowbite-react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

interface AppButtonProps extends ButtonProps {
  iconLeft?: AppIconName;
  iconRight?: AppIconName;
  loading?: boolean;
}

export function AppButton({
  children,
  iconLeft,
  iconRight,
  loading = false,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? <Spinner size="sm" className="mr-2" /> : iconLeft ? <AppIcon name={iconLeft} size={14} className="mr-1.5" /> : null}
      {children}
      {!loading && iconRight ? <AppIcon name={iconRight} size={14} className="ml-1.5" /> : null}
    </Button>
  );
}
